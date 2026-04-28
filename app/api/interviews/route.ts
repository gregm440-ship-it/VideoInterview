import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db/client";
import { getCurrentContext } from "@/lib/auth/devUser";
import { generateQuestions } from "@/lib/ai/generateQuestions";
import { recordAiUsage } from "@/lib/api/usage";
import { handleApiError, badRequest, notFound } from "@/lib/api/errors";
import { MODELS } from "@/lib/ai/anthropic";

const bodySchema = z.object({
  jobProfileId: z.string().uuid(),
  candidateName: z.string().min(2),
  candidateEmail: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const { org, user } = await getCurrentContext();
    const body = await req.json().catch(() => badRequest("Invalid JSON body."));
    const { jobProfileId, candidateName, candidateEmail } = bodySchema.parse(body);

    const profile = await db.query.jobProfiles.findFirst({
      where: and(eq(schema.jobProfiles.id, jobProfileId), eq(schema.jobProfiles.orgId, org.id)),
    });
    if (!profile) notFound("Job profile not found.");

    const { set, usage } = await generateQuestions({
      title: profile.title,
      level: profile.level,
      responsibilities: profile.responsibilities,
      requiredSkills: profile.requiredSkills,
      niceToHaves: profile.niceToHaves,
      roleContext: profile.roleContext,
      successCriteria: profile.successCriteria,
    });

    const interview = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.interviews)
        .values({
          orgId: org.id,
          jobProfileId: profile.id,
          candidateName,
          candidateEmail,
          status: "draft",
          createdByUserId: user.id,
        })
        .returning();

      await tx.insert(schema.interviewQuestions).values(
        set.questions.map((q) => ({
          interviewId: row.id,
          orderIndex: q.orderIndex,
          text: q.text,
          category: q.category,
          timeLimitSeconds: q.timeLimitSeconds,
          retryAllowed: q.retryAllowed,
          rationale: q.rationale,
        })),
      );

      return row;
    });

    await recordAiUsage({
      orgId: org.id,
      interviewId: interview.id,
      model: MODELS.questions(),
      inputTokens: usage.input,
      outputTokens: usage.output,
    });

    return NextResponse.json({ interview }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
