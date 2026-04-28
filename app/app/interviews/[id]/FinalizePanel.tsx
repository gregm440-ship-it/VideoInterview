"use client";

import { useState } from "react";

type Props = {
  interviewId: string;
  status: string;
  acceptedCount: number;
  totalQuestions: number;
  existingReportUrl: string | null;
  hasFitAnalysis: boolean;
};

export function FinalizePanel({
  interviewId,
  status,
  acceptedCount,
  totalQuestions,
  existingReportUrl,
  hasFitAnalysis,
}: Props) {
  const [reportUrl, setReportUrl] = useState<string | null>(existingReportUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{ overallScore: number; recommendedNextStep: string } | null>(null);
  const [stub, setStub] = useState(false);
  const [copied, setCopied] = useState(false);

  const allAccepted = acceptedCount >= totalQuestions;
  const canFinalize = (status === "submitted" || status === "scored") && allAccepted;

  async function finalize() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/finalize`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not generate the report.");
      setReportUrl(json.reportUrl);
      setAnalysis(json.analysis ?? null);
      setStub(!!json.stubTranscription);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!reportUrl) return;
    await navigator.clipboard.writeText(reportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!canFinalize && !hasFitAnalysis) {
    return (
      <div className="rounded-xl border border-dashed border-navy/15 bg-paper p-5 text-sm text-navy/60">
        Once the candidate submits all {totalQuestions} responses, you&apos;ll be able to generate
        the client report here. ({acceptedCount} / {totalQuestions} so far.)
      </div>
    );
  }

  if (reportUrl) {
    return (
      <div className="rounded-xl border border-navy/10 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-navy">Client report ready</h2>
          {analysis && (
            <span className="text-xs text-navy/60">
              Score {analysis.overallScore.toFixed(1)} · {analysis.recommendedNextStep}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readOnly
            value={reportUrl}
            className="w-full flex-1 rounded-md border border-navy/15 bg-navy-50/40 px-3 py-2 font-mono text-xs text-navy"
          />
          <div className="flex gap-2">
            <button onClick={copy} className="btn-ghost text-sm">
              {copied ? "Copied!" : "Copy link"}
            </button>
            <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
              Open
            </a>
          </div>
        </div>
        {stub && (
          <p className="mt-3 text-xs text-amber-700">
            Heads up: transcription used the stub fallback (DEEPGRAM_API_KEY not set). Real
            transcripts will appear once Deepgram is configured.
          </p>
        )}
        <div className="mt-4 flex items-center gap-2 border-t border-navy/10 pt-4">
          <p className="text-xs text-navy/60">
            Need to re-run after editing transcripts or rubric? Regenerate to overwrite.
          </p>
          <button onClick={finalize} disabled={busy} className="btn-ghost text-xs">
            {busy ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-navy/10 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-navy">Generate client report</h2>
          <p className="mt-1 text-sm text-navy/70">
            Transcribes each response, scores the candidate against the role, and creates a
            shareable client-facing report.
          </p>
        </div>
        <button onClick={finalize} disabled={busy} className="btn-primary">
          {busy ? "Working… (~30s)" : "Generate report"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
