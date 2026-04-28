"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConsentForm({ token }: { token: string }) {
  const router = useRouter();
  const [consented, setConsented] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/i/${token}/consent`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not record consent.");
      router.push(`/i/${token}/check`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-12 max-w-prose space-y-4">
      <label className="flex items-start gap-3 text-sm leading-relaxed text-white/80">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 accent-accent"
        />
        <span>
          I consent to having my video recorded, transcribed, and shared with the hiring client at
          Outsorcy. I understand my responses will be processed by AI to generate a fit analysis,
          stored for up to 90 days, and that I can request deletion at any time.
        </span>
      </label>

      {error && (
        <p className="text-sm text-red-300">{error}</p>
      )}

      <button onClick={start} disabled={!consented || busy} className="btn-accent">
        {busy ? "Starting…" : "I agree — start"}
      </button>
    </div>
  );
}
