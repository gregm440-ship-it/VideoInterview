import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { resolveCandidateAccess } from "@/lib/api/candidateAccess";
import { handleApiError, badRequest, notFound, conflict } from "@/lib/api/errors";
import { presignPut, videoKey } from "@/lib/storage/r2";

const bodySchema = z.object({
  questionId: z.string().uuid(),
  contentType: z.string().default("video/webm"),
});

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const { interview, questions } = await resolveCandidateAccess(token);
    const body = await req.json().catch(() => badRequest("Invalid JSON body."));
    const { questionId, contentType } = bodySchema.parse(body);

    const question = questions.find((q) => q.id === questionId);
    if (!question) notFound("Question not found.");

    // Cap attempts per question at 1 + retry_allowed.
    const prior = await db.query.candidateResponses.findMany({
      where: eq(schema.candidateResponses.questionId, question.id),
      orderBy: desc(schema.candidateResponses.attemptNumber),
    });
    const maxAttempts = 1 + question.retryAllowed;
    const acceptedAlready = prior.find((r) => r.accepted);
    if (acceptedAlready) conflict("This question is already submitted.");
    if (prior.length >= maxAttempts) conflict("No more retries left for this question.");

    const attemptNumber = prior.length + 1;

    const key = videoKey({
      orgId: interview.orgId,
      interviewId: interview.id,
      questionId: question.id,
      attemptNumber,
    });

    const [response] = await db
      .insert(schema.candidateResponses)
      .values({
        interviewId: interview.id,
        questionId: question.id,
        videoKey: key,
        attemptNumber,
        accepted: false,
      })
      .returning();

    const uploadUrl = await presignPut({
      key,
      contentType,
      expiresInSeconds: 60 * 30,
    });

    return NextResponse.json({
      responseId: response.id,
      uploadUrl,
      videoKey: key,
      contentType,
      attemptNumber,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
