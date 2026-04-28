import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { resolveCandidateAccess } from "@/lib/api/candidateAccess";
import { handleApiError } from "@/lib/api/errors";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const { interview, questions, responses, shareLink } = await resolveCandidateAccess(token);
    const profile = await db.query.jobProfiles.findFirst({
      where: eq(schema.jobProfiles.id, interview.jobProfileId),
    });

    return NextResponse.json({
      interview: {
        id: interview.id,
        candidateName: interview.candidateName,
        status: interview.status,
        expiresAt: shareLink.expiresAt,
      },
      role: profile ? { title: profile.title, level: profile.level } : null,
      questions: questions.map((q) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        text: q.text,
        category: q.category,
        timeLimitSeconds: q.timeLimitSeconds,
        retryAllowed: q.retryAllowed,
      })),
      acceptedQuestionIds: responses
        .filter((r) => r.accepted)
        .map((r) => r.questionId),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
