"use client";

import { useState } from "react";

type Props = {
  interviewId: string;
  currentUrl: string | null;
  currentExpiry: Date | string | null;
  locked: boolean;
  questionCount: number;
};

export function SendPanel({ interviewId, currentUrl, currentExpiry, locked, questionCount }: Props) {
  const [url, setUrl] = useState<string | null>(currentUrl);
  const [expiresAt, setExpiresAt] = useState<string | null>(
    currentExpiry ? new Date(currentExpiry).toISOString() : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/send`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not generate invite link.");
      setUrl(json.url);
      setExpiresAt(json.expiresAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!url) {
    return (
      <div className="rounded-xl border border-navy/10 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-navy">Send to candidate</h2>
            <p className="mt-1 text-sm text-navy/70">
              Generates a unique link, freezes the question set, and (later) emails the candidate.
            </p>
          </div>
          <button
            onClick={send}
            disabled={busy || questionCount < 5}
            className="btn-primary"
            title={questionCount < 5 ? "Need at least 5 questions before sending." : undefined}
          >
            {busy ? "Generating…" : "Generate invite link"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-navy/10 bg-white p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold text-navy">
          Candidate link {locked ? "(active)" : ""}
        </h2>
        <span className="text-xs text-navy/50">
          {expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString()}` : ""}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          readOnly
          value={url}
          className="w-full flex-1 rounded-md border border-navy/15 bg-navy-50/40 px-3 py-2 font-mono text-xs text-navy"
        />
        <div className="flex gap-2">
          <button onClick={copy} className="btn-ghost text-sm">
            {copied ? "Copied!" : "Copy link"}
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
            Preview
          </a>
        </div>
      </div>
      <p className="mt-2 text-xs text-navy/50">
        Sending an invite locks the question set — questions can&apos;t be edited after this.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
