import { NextResponse } from "next/server";
import { and, eq, gt, isNull, inArray } from "drizzle-orm";
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

// Statuses that mid-pipeline finalize errors can leave behind. On any failure
// we roll back to the most appropriate pre-failure state so the recruiter can
// retry without manual SQL — and the validator at the top still accepts the
// retry from any of these.
const STUCK_STATUSES = new Set(["transcribing", "scoring"]);

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const t0 = Date.now();
  const log = (msg: string, extra?: Record<string, unknown>) => {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[finalize +${elapsed}s] ${msg}`, extra ?? "");
  };

  let interviewId: string | null = null;

  try {
    const { org, user } = await getCurrentContext();
    const { id } = await ctx.params;
    interviewId = id;
    const { interview, profile, questions } = await getInterviewForOrg(id, org.id);

    log("starting", { interviewId: id, status: interview.status, questions: questions.length });

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
      conflict(
        `Cannot finalize: only ${responses.length} of ${questions.length} responses accepted.`,
      );
    }

    // ---------- Phase 1: transcription ----------
    await db
      .update(schema.interviews)
      .set({ status: "transcribing", updatedAt: new Date() })
      .where(eq(schema.interviews.id, interview.id));

    const stub = isStubMode();
    log(stub ? "transcription mode: STUB (DEEPGRAM_API_KEY missing)" : "transcription mode: deepgram");

    let transcribedCount = 0;
    for (const response of responses) {
      const question = questions.find((q) => q.id === response.questionId);
      if (!question) {
        log("skipping response — question not found", { responseId: response.id });
        continue;
      }
      if (response.transcript) {
        log("skipping already-transcribed response", { questionId: question.id, orderIndex: question.orderIndex });
        continue;
      }

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
        log("transcribing", { questionId: question.id, orderIndex: question.orderIndex, videoKey: response.videoKey });

        // 1 hour — Deepgram fetches the URL itself and we want headroom.
        const url = await presignGet({ key: response.videoKey, expiresInSeconds: 60 * 60 });
        log("  presigned GET issued");

        // Pre-flight HEAD against the presigned URL with its own timeout.
        // Surfaces R2 access problems with a clear error before they get
        // misreported by Deepgram as "corrupt or unsupported data".
        const headCtl = new AbortController();
        const headTimer = setTimeout(() => headCtl.abort(), 10_000);
        let head: Response;
        try {
          head = await fetch(url, { method: "HEAD", signal: headCtl.signal });
        } finally {
          clearTimeout(headTimer);
        }
        log(`  R2 HEAD: ${head.status} ${head.statusText}`, {
          contentType: head.headers.get("content-type"),
          contentLength: head.headers.get("content-length"),
        });
        if (!head.ok) {
          throw new Error(
            `Presigned URL not fetchable (${head.status} ${head.statusText}) — check R2 credentials and key '${response.videoKey}'.`,
          );
        }

        const tCall = Date.now();
        result = await transcribeFromUrl({ url, timeoutMs: 90_000 });
        log(`  deepgram returned in ${Date.now() - tCall}ms`, {
          chars: result.document.fullText.length,
          segments: result.document.segments.length,
          duration: result.durationSeconds,
        });
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

    log(`transcription phase done — ${transcribedCount} new, ${responses.length - transcribedCount} reused`);

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

    log("calling analyzeFit (Opus 4.7)");
    const tAnalyze = Date.now();
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
    log(`analyzeFit returned in ${Date.now() - tAnalyze}ms`, {
      score: output.overall_score,
      rec: output.recommended_next_step,
      inputTokens: usage.input,
      outputTokens: usage.output,
    });

    // Upsert fit_analysis row.
    const existing = await db.query.fitAnalyses.findFirst({
      where: eq(schema.fitAnalyses.interviewId, interview.id),
    });
    const fitValues = {
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
    };
    if (existing) {
      await db
        .update(schema.fitAnalyses)
        .set(fitValues)
        .where(eq(schema.fitAnalyses.interviewId, interview.id));
    } else {
      await db.insert(schema.fitAnalyses).values({
        interviewId: interview.id,
        ...fitValues,
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
    log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

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
    // Roll back transient mid-pipeline statuses so the user can retry from
    // the UI button without needing to touch SQL.
    if (interviewId) {
      try {
        const current = await db.query.interviews.findFirst({
          where: eq(schema.interviews.id, interviewId),
        });
        if (current && STUCK_STATUSES.has(current.status)) {
          await db
            .update(schema.interviews)
            .set({ status: "submitted", updatedAt: new Date() })
            .where(
              and(
                eq(schema.interviews.id, interviewId),
                inArray(schema.interviews.status, ["transcribing", "scoring"]),
              ),
            );
          log("rolled back stuck status to 'submitted'");
        }
      } catch (rollbackErr) {
        console.error("[finalize] rollback failed:", rollbackErr);
      }
    }
    log("FAILED", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return handleApiError(err);
  }
}
