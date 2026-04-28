import { notFound } from "next/navigation";
import { Shell } from "@/components/brand/Shell";
import { resolveReportAccess } from "@/lib/api/reportAccess";
import { HttpError } from "@/lib/api/errors";
import { presignGet } from "@/lib/storage/r2";
import { ReportContent } from "./ReportContent";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let access;
  try {
    access = await resolveReportAccess(token);
  } catch (e) {
    if (e instanceof HttpError && (e.status === 401 || e.status === 404)) notFound();
    throw e;
  }

  // Presign each video URL server-side so the page is fully self-contained.
  // 4-hour expiry — long enough for a hiring-manager review session.
  const responseVideoUrls = await Promise.all(
    access.responses.map(async (r) => {
      if (!r.videoKey) return [r.questionId, null] as const;
      try {
        const url = await presignGet({ key: r.videoKey, expiresInSeconds: 4 * 60 * 60 });
        return [r.questionId, url] as const;
      } catch {
        return [r.questionId, null] as const;
      }
    }),
  );
  const videoUrlByQuestion = new Map(responseVideoUrls);

  return (
    <Shell variant="report">
      <ReportContent
        candidateName={access.interview.candidateName}
        roleTitle={access.profile.title}
        roleLevel={access.profile.level}
        submittedAt={access.interview.submittedAt}
        analysis={{
          overallScore: parseFloat(access.fitAnalysis.overallScore),
          rationale: access.fitAnalysis.scoreRationale,
          competencies: access.fitAnalysis.competencyScores,
          strengths: access.fitAnalysis.strengths,
          weaknesses: access.fitAnalysis.weaknesses,
          riskFlags: access.fitAnalysis.riskFlags,
          recommendedNextStep: access.fitAnalysis.recommendedNextStep,
          headlineSummary: access.fitAnalysis.headlineSummary,
        }}
        questions={access.questions.map((q) => {
          const r = access.responses.find((x) => x.questionId === q.id);
          return {
            id: q.id,
            orderIndex: q.orderIndex,
            text: q.text,
            category: q.category,
            transcript: r?.transcript?.fullText ?? null,
            durationSeconds: r?.durationSeconds ?? null,
            videoUrl: videoUrlByQuestion.get(q.id) ?? null,
          };
        })}
      />
    </Shell>
  );
}
