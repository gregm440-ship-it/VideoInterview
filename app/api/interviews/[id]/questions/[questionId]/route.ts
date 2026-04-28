import { NextResponse } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db/client";
import { getCurrentContext } from "@/lib/auth/devUser";
import { assertEditable, getInterviewForOrg } from "@/lib/api/interviewAccess";
import { handleApiError, badRequest, notFound } from "@/lib/api/errors";

const patchBody = z.object({
  text: z.string().min(10).optional(),
  category: z.enum(["behavioral", "technical", "situational", "motivation_fit", "custom"]).optional(),
  timeLimitSeconds: z.number().int().min(30).max(180).optional(),
  retryAllowed: z.number().int().min(0).max(3).optional(),
  rationale: z.string().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; questionId: string }> },
) {
  try {
    const { org } = await getCurrentContext();
    const { id, questionId } = await ctx.params;
    const { interview, questions } = await getInterviewForOrg(id, org.id);
    assertEditable(interview);

    const target = questions.find((q) => q.id === questionId);
    if (!target) notFound("Question not found.");

    const body = await req.json().catch(() => badRequest("Invalid JSON body."));
    const patch = patchBody.parse(body);
    if (Object.keys(patch).length === 0) badRequest("No fields to update.");

    const [row] = await db
      .update(schema.interviewQuestions)
      .set(patch)
      .where(eq(schema.interviewQuestions.id, target.id))
      .returning();

    return NextResponse.json({ question: row });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; questionId: string }> },
) {
  try {
    const { org } = await getCurrentContext();
    const { id, questionId } = await ctx.params;
    const { interview, questions } = await getInterviewForOrg(id, org.id);
    assertEditable(interview);

    const target = questions.find((q) => q.id === questionId);
    if (!target) notFound("Question not found.");

    await db.transaction(async (tx) => {
      await tx
        .delete(schema.interviewQuestions)
        .where(eq(schema.interviewQuestions.id, target.id));

      await tx
        .update(schema.interviewQuestions)
        .set({ orderIndex: sql`${schema.interviewQuestions.orderIndex} - 1` })
        .where(
          and(
            eq(schema.interviewQuestions.interviewId, interview.id),
            gt(schema.interviewQuestions.orderIndex, target.orderIndex),
          ),
        );
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
