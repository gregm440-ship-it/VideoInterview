import { notFound } from "next/navigation";
import { Shell } from "@/components/brand/Shell";
import { getCurrentContext } from "@/lib/auth/devUser";
import { getInterviewForOrg } from "@/lib/api/interviewAccess";
import { HttpError } from "@/lib/api/errors";
import { InterviewEditor } from "./InterviewEditor";

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
