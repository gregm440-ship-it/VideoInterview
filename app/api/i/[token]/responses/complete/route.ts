import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { resolveCandidateAccess } from "@/lib/api/candidateAccess";
import { handleApiError, badRequest, notFound } from "@/lib/api/errors";
import { objectExists } from "@/lib/storage/r2";

const bodySchema = z.object({
  responseId: z.string().uuid(),
  durationSeconds: z.number().int().min(1).max(600),
  skipVerify: z.boolean().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const { interview, questions } = await resolveCandidateAccess(token);
    const body = await req.json().catch(() => badRequest("Invalid JSON body."));
    const { responseId, durationSeconds, skipVerify } = bodySchema.parse(body);

    const response = await db.query.candidateResponses.findFirst({
      where: and(
        eq(schema.candidateResponses.id, responseId),
        eq(schema.candidateResponses.interviewId, interview.id),
      ),
    });
    if (!response) notFound("Response not found.");
    if (response.accepted) {
      return NextResponse.json({ ok: true, accepted: true });
    }
    if (!response.videoKey) badRequest("Response has no upload key.");

    if (!skipVerify) {
      const head = await objectExists(response.videoKey);
      if (!head.exists) badRequest("Upload not found in storage. Please retry.");
    }

    await db.transaction(async (tx) => {
      // Demote any older accepted take for this question (defensive — partial
      // unique index already enforces one accepted per question).
      await tx
        .update(schema.candidateResponses)
        .set({ accepted: false })
        .where(
          and(
            eq(schema.candidateResponses.questionId, response.questionId),
            eq(schema.candidateResponses.accepted, true),
          ),
        );

      await tx
        .update(schema.candidateResponses)
        .set({
          accepted: true,
          durationSeconds,
          recordedAt: new Date(),
        })
        .where(eq(schema.candidateResponses.id, response.id));
    });

    // Has the candidate finished the whole interview?
    const acceptedRows = await db.query.candidateResponses.findMany({
      where: and(
        eq(schema.candidateResponses.interviewId, interview.id),
        eq(schema.candidateResponses.accepted, true),
      ),
    });
    const allDone = acceptedRows.length >= questions.length;

    if (allDone && interview.status !== "submitted") {
      await db
        .update(schema.interviews)
        .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.interviews.id, interview.id));
    } else if (!allDone && interview.status === "sent") {
      await db
        .update(schema.interviews)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(schema.interviews.id, interview.id));
    }

    return NextResponse.json({ ok: true, accepted: true, complete: allDone });
  } catch (err) {
    return handleApiError(err);
  }
}
