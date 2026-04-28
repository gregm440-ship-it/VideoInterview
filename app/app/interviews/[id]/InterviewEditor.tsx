"use client";

import { useState, useTransition } from "react";

type Category = "behavioral" | "technical" | "situational" | "motivation_fit" | "custom";

type Question = {
  id: string;
  orderIndex: number;
  text: string;
  category: Category;
  timeLimitSeconds: number;
  retryAllowed: number;
  rationale: string | null;
};

type Props = {
  interviewId: string;
  locked: boolean;
  initialQuestions: Question[];
};

const categoryLabel: Record<Category, string> = {
  behavioral: "Behavioral",
  technical: "Technical",
  situational: "Situational",
  motivation_fit: "Motivation / fit",
  custom: "Custom",
};

const categoryTone: Record<Category, string> = {
  behavioral: "bg-emerald-50 text-emerald-900",
  technical: "bg-blue-50 text-blue-900",
  situational: "bg-amber-50 text-amber-900",
  motivation_fit: "bg-purple-50 text-purple-900",
  custom: "bg-navy-50 text-navy",
};

export function InterviewEditor({ interviewId, locked, initialQuestions }: Props) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function api(path: string, init?: RequestInit) {
    return fetch(`/api/interviews/${interviewId}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  }

  async function regenerateOne(q: Question) {
    setBusyKey(`regen:${q.id}`);
    setError(null);
    try {
      const res = await api(`/questions/${q.id}/regenerate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Regeneration failed.");
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? json.question : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  }

  async function regenerateAll() {
    if (!confirm("Regenerate the full question set? This replaces all current questions.")) return;
    setBusyKey("regen:all");
    setError(null);
    try {
      const res = await api(`/questions/regenerate-all`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Regeneration failed.");
      setQuestions(json.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  }

  async function deleteOne(q: Question) {
    if (!confirm(`Delete this ${categoryLabel[q.category].toLowerCase()} question?`)) return;
    setBusyKey(`del:${q.id}`);
    setError(null);
    try {
      const res = await api(`/questions/${q.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Delete failed.");
      setQuestions((prev) =>
        prev.filter((x) => x.id !== q.id).map((x, i) => ({ ...x, orderIndex: i })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  }

  async function reorder(fromIndex: number, toIndex: number) {
    const next = [...questions];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const reIndexed = next.map((q, i) => ({ ...q, orderIndex: i }));
    setQuestions(reIndexed);
    setError(null);
    startTransition(async () => {
      const res = await api(`/questions`, {
        method: "PATCH",
        body: JSON.stringify({ orderedIds: reIndexed.map((q) => q.id) }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Reorder failed.");
        setQuestions(initialQuestions);
      }
    });
  }

  async function saveEdits(id: string, patch: Partial<Question>) {
    setBusyKey(`save:${id}`);
    setError(null);
    try {
      const res = await api(`/questions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      setQuestions((prev) => prev.map((x) => (x.id === id ? json.question : x)));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  }

  const counts = questions.reduce<Record<Category, number>>(
    (acc, q) => ({ ...acc, [q.category]: (acc[q.category] ?? 0) + 1 }),
    { behavioral: 0, technical: 0, situational: 0, motivation_fit: 0, custom: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy/10 bg-white px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-navy">{questions.length} questions</span>
          {(["behavioral", "technical", "situational", "motivation_fit", "custom"] as Category[]).map(
            (c) =>
              counts[c] > 0 && (
                <span
                  key={c}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryTone[c]}`}
                >
                  {counts[c]} {categoryLabel[c].toLowerCase()}
                </span>
              ),
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={regenerateAll}
            disabled={locked || busyKey === "regen:all"}
            className="btn-ghost text-sm"
          >
            {busyKey === "regen:all" ? "Regenerating…" : "Regenerate all"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {locked && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          This interview is locked — questions can&apos;t be edited after the candidate invite has
          been sent.
        </div>
      )}

      <ul className="space-y-3">
        {questions.map((q, i) => (
          <li
            key={q.id}
            className="rounded-xl border border-navy/10 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 text-xs font-semibold text-navy/40">Q{i + 1}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryTone[q.category]}`}
                >
                  {categoryLabel[q.category]}
                </span>
                <span className="text-xs text-navy/50">{q.timeLimitSeconds}s</span>
              </div>
              {!locked && (
                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={() => reorder(i, i - 1)}
                    disabled={i === 0 || isPending}
                    className="px-1.5 py-0.5 text-navy/50 hover:text-navy disabled:opacity-30"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => reorder(i, i + 1)}
                    disabled={i === questions.length - 1 || isPending}
                    className="px-1.5 py-0.5 text-navy/50 hover:text-navy disabled:opacity-30"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setEditingId(editingId === q.id ? null : q.id)}
                    className="px-2 py-0.5 text-navy/70 hover:text-navy"
                  >
                    {editingId === q.id ? "Cancel" : "Edit"}
                  </button>
                  {q.category !== "custom" && (
                    <button
                      onClick={() => regenerateOne(q)}
                      disabled={busyKey === `regen:${q.id}`}
                      className="px-2 py-0.5 text-navy/70 hover:text-navy disabled:opacity-50"
                    >
                      {busyKey === `regen:${q.id}` ? "…" : "Regenerate"}
                    </button>
                  )}
                  <button
                    onClick={() => deleteOne(q)}
                    disabled={busyKey === `del:${q.id}`}
                    className="px-2 py-0.5 text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {editingId === q.id ? (
              <EditForm
                question={q}
                busy={busyKey === `save:${q.id}`}
                onSave={(patch) => saveEdits(q.id, patch)}
              />
            ) : (
              <>
                <p className="mt-3 text-base leading-relaxed text-navy">{q.text}</p>
                {q.rationale && (
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-navy/60 hover:text-navy">
                      Why this question?
                    </summary>
                    <p className="mt-2 text-navy/70">{q.rationale}</p>
                  </details>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {!locked && <AddCustomQuestion interviewId={interviewId} onAdded={(q) => setQuestions((p) => [...p, q])} />}
    </div>
  );
}

function EditForm({
  question,
  busy,
  onSave,
}: {
  question: Question;
  busy: boolean;
  onSave: (patch: Partial<Question>) => void;
}) {
  const [text, setText] = useState(question.text);
  const [timeLimit, setTimeLimit] = useState(question.timeLimitSeconds);
  const [rationale, setRationale] = useState(question.rationale ?? "");

  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ text, timeLimitSeconds: timeLimit, rationale });
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-navy/15 bg-white p-3 text-sm text-navy focus:border-navy focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <label className="text-xs text-navy/70">
          Time limit (s)
          <input
            type="number"
            min={30}
            max={180}
            value={timeLimit}
            onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
            className="ml-2 w-20 rounded-md border border-navy/15 px-2 py-1 text-sm"
          />
        </label>
      </div>
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={2}
        placeholder="Rationale (recruiter-only)"
        className="w-full rounded-md border border-navy/15 bg-white p-3 text-xs text-navy/80 focus:border-navy focus:outline-none"
      />
      <button type="submit" disabled={busy} className="btn-primary text-sm">
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function AddCustomQuestion({
  interviewId,
  onAdded,
}: {
  interviewId: string;
  onAdded: (q: Question) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, category: "custom" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Add failed.");
      onAdded(json.question);
      setText("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        + Add a custom question
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-navy/30 bg-white p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your custom question…"
        rows={3}
        className="w-full rounded-md border border-navy/15 bg-white p-3 text-sm text-navy focus:border-navy focus:outline-none"
      />
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={add}
          disabled={busy || text.trim().length < 10}
          className="btn-primary text-sm"
        >
          {busy ? "Adding…" : "Add question"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setText("");
            setError(null);
          }}
          className="text-sm text-navy/60 hover:text-navy"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
