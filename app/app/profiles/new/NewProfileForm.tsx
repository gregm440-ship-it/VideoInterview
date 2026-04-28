"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ParsedProfile = {
  id: string;
  title: string;
  level: string | null;
  responsibilities: string[];
  requiredSkills: string[];
  niceToHaves: string[];
  roleContext: string | null;
  successCriteria: string[];
};

type Stage = "input" | "parsed" | "creating";

export function NewProfileForm() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [profile, setProfile] = useState<ParsedProfile | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/job-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to parse job description.");
      setProfile(json.jobProfile);
      setStage("parsed");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setBusy(true);
    setStage("creating");
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobProfileId: profile.id,
          candidateName,
          candidateEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create interview.");
      router.push(`/app/interviews/${json.interview.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStage("parsed");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "input") {
    return (
      <form onSubmit={handleParse} className="space-y-4">
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste the full job description here…"
          rows={16}
          required
          minLength={20}
          className="w-full rounded-md border border-navy/15 bg-white p-4 font-mono text-sm leading-relaxed text-navy placeholder:text-navy/40 focus:border-navy focus:outline-none"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <p className="text-xs text-navy/60">
            Parsed by Claude Haiku. Typically takes ~5 seconds.
          </p>
          <button type="submit" disabled={busy || rawText.trim().length < 20} className="btn-primary">
            {busy ? "Parsing…" : "Parse job description"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-8">
      <ParsedSummary profile={profile!} />
      <form onSubmit={handleCreateInterview} className="space-y-4 rounded-xl border border-navy/10 bg-white p-6">
        <h2 className="text-lg font-semibold text-navy">Step 2 — Add the candidate</h2>
        <p className="text-sm text-navy/70">
          We&apos;ll generate the question set as soon as you create the interview.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-navy/60">
              Candidate name
            </span>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              required
              minLength={2}
              className="mt-1 w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-navy/60">
              Candidate email
            </span>
            <input
              type="email"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none"
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-sm text-navy/60 hover:text-navy"
            onClick={() => {
              setStage("input");
              setProfile(null);
            }}
          >
            ← Edit job description
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Generating questions…" : "Generate interview"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ParsedSummary({ profile }: { profile: ParsedProfile }) {
  return (
    <div className="space-y-4 rounded-xl border border-navy/10 bg-white p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold text-navy">{profile.title}</h2>
        {profile.level && (
          <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-navy">
            {profile.level}
          </span>
        )}
      </div>

      {profile.roleContext && (
        <p className="text-sm leading-relaxed text-navy/80">{profile.roleContext}</p>
      )}

      <BulletGrid>
        <BulletList title="Responsibilities" items={profile.responsibilities} />
        <BulletList title="Required skills" items={profile.requiredSkills} />
        <BulletList title="Nice to have" items={profile.niceToHaves} />
        <BulletList title="Success criteria" items={profile.successCriteria} />
      </BulletGrid>
    </div>
  );
}

function BulletGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 md:grid-cols-2">{children}</div>;
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-navy/60">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-navy/85">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1 inline-block h-1 w-1 flex-none rounded-full bg-navy/40" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
