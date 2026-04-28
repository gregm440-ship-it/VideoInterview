import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { getCurrentContext } from "@/lib/auth/devUser";
import { assertEditable, getInterviewForOrg } from "@/lib/api/interviewAccess";
import { handleApiError } from "@/lib/api/errors";
import { generateQuestions } from "@/lib/ai/generateQuestions";
import { recordAiUsage } from "@/lib/api/usage";
import { MODELS } from "@/lib/ai/anthropic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { org } = await getCurrentContext();
    const { id } = await ctx.params;
    const { interview, profile } = await getInterviewForOrg(id, org.id);
    assertEditable(interview);

    const { set, usage } = await generateQuestions({
      title: profile.title,
      level: profile.level,
      responsibilities: profile.responsibilities,
      requiredSkills: profile.requiredSkills,
      niceToHaves: profile.niceToHaves,
      roleContext: profile.roleContext,
      successCriteria: profile.successCriteria,
    });

    await db.transaction(async (tx) => {
      await tx
        .delete(schema.interviewQuestions)
        .where(eq(schema.interviewQuestions.interviewId, interview.id));

      await tx.insert(schema.interviewQuestions).values(
        set.questions.map((q) => ({
          interviewId: interview.id,
          orderIndex: q.orderIndex,
          text: q.text,
          category: q.category,
          timeLimitSeconds: q.timeLimitSeconds,
          retryAllowed: q.retryAllowed,
          rationale: q.rationale,
        })),
      );
    });

    await recordAiUsage({
      orgId: org.id,
      interviewId: interview.id,
      model: MODELS.questions(),
      inputTokens: usage.input,
      outputTokens: usage.output,
    });

    const questions = await db.query.interviewQuestions.findMany({
      where: eq(schema.interviewQuestions.interviewId, interview.id),
      orderBy: (q, { asc }) => asc(q.orderIndex),
    });

    return NextResponse.json({ questions });
  } catch (err) {
    return handleApiError(err);
  }
}
