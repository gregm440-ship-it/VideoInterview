import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { getCurrentContext } from "@/lib/auth/devUser";
import { getInterviewForOrg } from "@/lib/api/interviewAccess";
import { handleApiError, conflict } from "@/lib/api/errors";
import { isStubMode, stubTranscription, transcribeFromUrl } from "@/lib/transcription/deepgram";
import { presignGet } from "@/lib/storage/r2";
import { analyzeFit } from "@/lib/ai/analyzeFit";
import { recordAiUsage } from "@/lib/api/usage";
import { signReportToken } from "@/lib/tokens/candidate";

export const maxDuration = 300; // up to 5 minutes for the inline pipeline

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { org, user } = await getCurrentContext();
    const { id } = await ctx.params;
    const { interview, profile, questions } = await getInterviewForOrg(id, org.id);

    const finalizeable = new Set([
      "submitted",
      "transcribing",
      "scoring",
      "scored",
      "sent_to_client",
    ]);
    if (!finalizeable.has(interview.status)) {
      conflict(
        `Interview must be in 'submitted' state to finalize (currently '${interview.status}').`,
      );
    }

    const responses = await db.query.candidateResponses.findMany({
      where: and(
        eq(schema.candidateResponses.interviewId, interview.id),
        eq(schema.candidateResponses.accepted, true),
      ),
    });
    if (responses.length < questions.length) {
      conflict(`Cannot finalize: only ${responses.length} of ${questions.length} responses accepted.`);
    }

    // ---------- Phase 1: transcription ----------
    await db
      .update(schema.interviews)
      .set({ status: "transcribing", updatedAt: new Date() })
      .where(eq(schema.interviews.id, interview.id));

    const stub = isStubMode();
    let transcribedCount = 0;
    for (const response of responses) {
      if (response.transcript) continue; // idempotent — skip if already done
      const question = questions.find((q) => q.id === response.questionId);
      if (!question) continue;

      let result;
      if (stub) {
        result = stubTranscription({
          questionText: question.text,
          questionCategory: question.category,
        });
      } else {
        if (!response.videoKey) {
          throw new Error(`Response ${response.id} has no videoKey to transcribe.`);
        }
        // 1 hour — Deepgram fetches the URL itself and we want headroom in case
        // the analysis stage queues behind a slow run.
        const url = await presignGet({ key: response.videoKey, expiresInSeconds: 60 * 60 });

        // Pre-flight HEAD so a 403/404 from R2 surfaces with a clear error
        // before Deepgram returns the misleading "corrupt or unsupported data".
        const head = await fetch(url, { method: "HEAD" });
        if (!head.ok) {
          throw new Error(
            `Presigned URL not fetchable (${head.status} ${head.statusText}) — check R2 credentials and key '${response.videoKey}'.`,
          );
        }

        result = await transcribeFromUrl({ url });
      }

      await db
        .update(schema.candidateResponses)
        .set({
          transcript: result.document,
          durationSeconds: result.durationSeconds ?? response.durationSeconds,
        })
        .where(eq(schema.candidateResponses.id, response.id));

      if (!stub && result.durationSeconds) {
        await db.insert(schema.usageEvents).values({
          orgId: org.id,
          interviewId: interview.id,
          eventType: "transcription_seconds",
          model: process.env.DEEPGRAM_MODEL ?? "nova-3",
          units: result.durationSeconds.toString(),
        });
      }

      transcribedCount++;
    }

    // Reload with transcripts
    const fresh = await db.query.candidateResponses.findMany({
      where: and(
        eq(schema.candidateResponses.interviewId, interview.id),
        eq(schema.candidateResponses.accepted, true),
      ),
    });

    // ---------- Phase 2: fit analysis ----------
    await db
      .update(schema.interviews)
      .set({ status: "scoring", updatedAt: new Date() })
      .where(eq(schema.interviews.id, interview.id));

    const { output, usage, model } = await analyzeFit({
      profile: {
        title: profile.title,
        level: profile.level,
        responsibilities: profile.responsibilities,
        requiredSkills: profile.requiredSkills,
        niceToHaves: profile.niceToHaves,
        roleContext: profile.roleContext,
        successCriteria: profile.successCriteria,
      },
      questions: questions.map((q) => ({
        id: q.id,
        orderIndex: q.orderIndex,
        text: q.text,
        category: q.category,
        rationale: q.rationale,
      })),
      responses: fresh.map((r) => ({
        questionId: r.questionId,
        transcript: r.transcript,
        durationSeconds: r.durationSeconds,
      })),
    });

    // Upsert fit_analysis row (interview_id has a unique index).
    const existing = await db.query.fitAnalyses.findFirst({
      where: eq(schema.fitAnalyses.interviewId, interview.id),
    });
    if (existing) {
      await db
        .update(schema.fitAnalyses)
        .set({
          model,
          overallScore: output.overall_score.toString(),
          scoreRationale: output.score_rationale,
          competencyScores: output.competency_scores.map((c) => ({
            name: c.name,
            score: c.score,
            evidence: c.evidence,
          })),
          strengths: output.strengths,
          weaknesses: output.weaknesses,
          riskFlags: output.risk_flags,
          recommendedNextStep: output.recommended_next_step,
          headlineSummary: output.headline_summary,
          promptTokens: usage.input,
          completionTokens: usage.output,
        })
        .where(eq(schema.fitAnalyses.interviewId, interview.id));
    } else {
      await db.insert(schema.fitAnalyses).values({
        interviewId: interview.id,
        model,
        overallScore: output.overall_score.toString(),
        scoreRationale: output.score_rationale,
        competencyScores: output.competency_scores.map((c) => ({
          name: c.name,
          score: c.score,
          evidence: c.evidence,
        })),
        strengths: output.strengths,
        weaknesses: output.weaknesses,
        riskFlags: output.risk_flags,
        recommendedNextStep: output.recommended_next_step,
        headlineSummary: output.headline_summary,
        promptTokens: usage.input,
        completionTokens: usage.output,
      });
    }

    await recordAiUsage({
      orgId: org.id,
      interviewId: interview.id,
      model,
      inputTokens: usage.input,
      outputTokens: usage.output,
    });

    // ---------- Phase 3: client report share link ----------
    let reportLink = await db.query.shareLinks.findFirst({
      where: and(
        eq(schema.shareLinks.interviewId, interview.id),
        eq(schema.shareLinks.kind, "client_report"),
        isNull(schema.shareLinks.revokedAt),
        gt(schema.shareLinks.expiresAt, new Date()),
      ),
    });
    if (!reportLink) {
      const [row] = await db
        .insert(schema.shareLinks)
        .values({
          token: "pending",
          kind: "client_report",
          interviewId: interview.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdByUserId: user.id,
        })
        .returning();
      reportLink = row;
    }
    const signed = await signReportToken({
      interviewId: interview.id,
      shareLinkId: reportLink.id,
    });
    await db
      .update(schema.shareLinks)
      .set({ token: signed.token, expiresAt: signed.expiresAt })
      .where(eq(schema.shareLinks.id, reportLink.id));

    await db
      .update(schema.interviews)
      .set({ status: "scored", updatedAt: new Date() })
      .where(eq(schema.interviews.id, interview.id));

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.json({
      reportUrl: `${baseUrl}/r/${signed.token}`,
      expiresAt: signed.expiresAt,
      transcribedCount,
      stubTranscription: stub,
      analysis: {
        overallScore: output.overall_score,
        recommendedNextStep: output.recommended_next_step,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
