import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Shell } from "@/components/brand/Shell";
import { db, schema } from "@/db/client";
import { getCurrentContext } from "@/lib/auth/devUser";
import { getInterviewForOrg } from "@/lib/api/interviewAccess";
import { HttpError } from "@/lib/api/errors";
import { InterviewEditor } from "./InterviewEditor";
import { SendPanel } from "./SendPanel";

export const dynamic = "force-dynamic";

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await getCurrentContext();

  let data;
  try {
    data = await getInterviewForOrg(id, org.id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }

  const liveLink = await db.query.shareLinks.findFirst({
    where: (s, { and, eq, isNull, gt }) =>
      and(
        eq(s.interviewId, data.interview.id),
        eq(s.kind, "candidate"),
        isNull(s.revokedAt),
        gt(s.expiresAt, new Date()),
      ),
    orderBy: (s, { desc }) => desc(s.createdAt),
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const liveUrl = liveLink ? `${baseUrl}/i/${liveLink.token}` : null;

  // Touch schema import so eslint doesn't strip it (used by db.query above for types).
  void schema;
  void eq;

  return (
    <Shell variant="app">
      <section className="container-prose py-10">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-navy/60">
              Review interview
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
              {data.profile.title}
            </h1>
            <p className="mt-1 text-sm text-navy/70">
              For <span className="font-medium text-navy">{data.interview.candidateName}</span> ·{" "}
              {data.interview.candidateEmail}
            </p>
          </div>
          <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-navy">
            {data.interview.status}
          </span>
        </div>

        <div className="mt-6">
          <SendPanel
            interviewId={data.interview.id}
            currentUrl={liveUrl}
            currentExpiry={liveLink?.expiresAt ?? null}
            locked={data.interview.lockedAt != null}
            questionCount={data.questions.length}
          />
        </div>

        <div className="mt-8">
          <InterviewEditor
            interviewId={data.interview.id}
            locked={data.interview.lockedAt != null}
            initialQuestions={data.questions.map((q) => ({
              id: q.id,
              orderIndex: q.orderIndex,
              text: q.text,
              category: q.category,
              timeLimitSeconds: q.timeLimitSeconds,
              retryAllowed: q.retryAllowed,
              rationale: q.rationale,
            }))}
          />
        </div>
      </section>
    </Shell>
  );
}
