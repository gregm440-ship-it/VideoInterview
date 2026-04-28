"use client";

import { useState } from "react";

type Competency = { name: string; score: number; evidence: string };

type Question = {
  id: string;
  orderIndex: number;
  text: string;
  category: string;
  transcript: string | null;
  durationSeconds: number | null;
  videoUrl: string | null;
};

type Props = {
  candidateName: string;
  roleTitle: string;
  roleLevel: string | null;
  submittedAt: Date | string | null;
  analysis: {
    overallScore: number;
    rationale: string | null;
    competencies: Competency[];
    strengths: string[];
    weaknesses: string[];
    riskFlags: string[];
    recommendedNextStep: "advance" | "hold" | "pass";
    headlineSummary: string;
  };
  questions: Question[];
};

const RECOMMENDATION_TONE: Record<Props["analysis"]["recommendedNextStep"], string> = {
  advance: "bg-emerald-50 text-emerald-900 border-emerald-200",
  hold: "bg-amber-50 text-amber-900 border-amber-200",
  pass: "bg-rose-50 text-rose-900 border-rose-200",
};

const RECOMMENDATION_LABEL: Record<Props["analysis"]["recommendedNextStep"], string> = {
  advance: "Advance to client interview",
  hold: "Hold — clarify before deciding",
  pass: "Pass",
};

export function ReportContent({
  candidateName,
  roleTitle,
  roleLevel,
  submittedAt,
  analysis,
  questions,
}: Props) {
  return (
    <div className="container-prose space-y-12 py-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-navy/60">
          Outsorcy candidate report
        </p>
        <div className="mt-2 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-navy md:text-4xl">
              {candidateName}
            </h1>
            <p className="mt-2 text-navy/70">
              {roleTitle}
              {roleLevel ? ` · ${roleLevel}` : ""}
              {submittedAt
                ? ` · submitted ${new Date(submittedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}`
                : ""}
            </p>
          </div>
          <ScoreBadge score={analysis.overallScore} />
        </div>
      </header>

      <section className="rounded-2xl border border-navy/10 bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-navy/60">
          Headline
        </p>
        <p className="mt-2 text-lg leading-relaxed text-navy">{analysis.headlineSummary}</p>
        <div
          className={`mt-5 inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${RECOMMENDATION_TONE[analysis.recommendedNextStep]}`}
        >
          {RECOMMENDATION_LABEL[analysis.recommendedNextStep]}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Block title="Strengths">
          <ul className="space-y-2 text-sm text-navy/85">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-emerald-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Block>
        <Block title="Gaps to probe">
          <ul className="space-y-2 text-sm text-navy/85">
            {analysis.weaknesses.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-amber-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Block>
      </section>

      {analysis.riskFlags.length > 0 && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
            Risk flags
          </p>
          <ul className="mt-2 space-y-1 text-sm text-rose-900">
            {analysis.riskFlags.map((f, i) => (
              <li key={i}>· {f}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-navy">Competencies</h2>
        <p className="mt-1 text-sm text-navy/60">
          Scored 1–10 against this role&apos;s success criteria.
        </p>
        <ul className="mt-4 space-y-3">
          {analysis.competencies.map((c) => (
            <li key={c.name} className="rounded-xl border border-navy/10 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-navy">{c.name}</span>
                <span className="font-mono text-sm text-navy/70">{c.score}/10</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-navy/10">
                <div
                  className="h-full rounded-full bg-navy"
                  style={{ width: `${c.score * 10}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-navy/75">{c.evidence}</p>
            </li>
          ))}
        </ul>
        {analysis.rationale && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-navy/60 hover:text-navy">
              Why this overall score?
            </summary>
            <p className="mt-2 text-navy/80">{analysis.rationale}</p>
          </details>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold tracking-tight text-navy">Watch the interview</h2>
        <p className="mt-1 text-sm text-navy/60">
          Each clip is the candidate&apos;s accepted take. Click a question to expand the
          transcript.
        </p>
        <ol className="mt-5 space-y-4">
          {questions.map((q) => (
            <QuestionBlock key={q.id} question={q} />
          ))}
        </ol>
      </section>

      <footer className="border-t border-navy/10 pt-6 text-center">
        <p className="text-sm text-navy/70">
          Want to talk to {candidateName}? Reply to the email this link came from, or message
          your Outsorcy contact.
        </p>
        <p className="mt-2 text-xs text-navy/50">
          Report generated by Outsorcy · scores are model-assisted, not the final word.
        </p>
      </footer>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 8.5
      ? "bg-emerald-500"
      : score >= 7
        ? "bg-emerald-400"
        : score >= 5
          ? "bg-amber-400"
          : score >= 3
            ? "bg-orange-400"
            : "bg-rose-500";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-navy/10 bg-white px-5 py-3">
      <span className={`inline-block h-3 w-3 rounded-full ${tone}`} aria-hidden />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-navy/60">Overall</p>
        <p className="text-2xl font-semibold tracking-tight text-navy">
          {score.toFixed(1)} <span className="text-sm font-normal text-navy/50">/ 10</span>
        </p>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-navy/60">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function QuestionBlock({ question }: { question: Question }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="overflow-hidden rounded-xl border border-navy/10 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-navy-50/40"
      >
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-navy-50 px-2 py-0.5 font-semibold uppercase tracking-wider text-navy">
              Q{question.orderIndex + 1}
            </span>
            <span className="text-navy/50">{question.category.replace("_", " / ")}</span>
            {question.durationSeconds != null && (
              <span className="text-navy/50">· {question.durationSeconds}s</span>
            )}
          </div>
          <p className="mt-2 text-sm text-navy">{question.text}</p>
        </div>
        <span className="text-navy/40">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-navy/10 bg-paper px-5 py-5">
          {question.videoUrl ? (
            <video
              src={question.videoUrl}
              controls
              preload="metadata"
              className="aspect-video w-full max-w-2xl rounded-md bg-black"
            />
          ) : (
            <p className="text-sm italic text-navy/50">Video unavailable.</p>
          )}
          {question.transcript ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy/60">
                Transcript
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-navy/85">
                {question.transcript}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm italic text-navy/50">No transcript available.</p>
          )}
        </div>
      )}
    </li>
  );
}
