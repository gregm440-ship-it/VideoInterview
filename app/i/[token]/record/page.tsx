import { notFound, redirect } from "next/navigation";
import { resolveCandidateAccess, nextUnansweredQuestion } from "@/lib/api/candidateAccess";
import { HttpError } from "@/lib/api/errors";
import { Recorder } from "./Recorder";

export const dynamic = "force-dynamic";

export default async function RecordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let access;
  try {
    access = await resolveCandidateAccess(token);
  } catch (e) {
    if (e instanceof HttpError && (e.status === 401 || e.status === 404)) notFound();
    throw e;
  }

  const next = nextUnansweredQuestion(access.questions, access.responses);
  if (!next) redirect(`/i/${token}/done`);

  const acceptedIds = access.responses.filter((r) => r.accepted).map((r) => r.questionId);

  return (
    <div className="bg-navy text-white">
      <Recorder
        token={token}
        questions={access.questions.map((q) => ({
          id: q.id,
          orderIndex: q.orderIndex,
          text: q.text,
          category: q.category,
          timeLimitSeconds: q.timeLimitSeconds,
          retryAllowed: q.retryAllowed,
        }))}
        startQuestionId={next.id}
        acceptedIds={acceptedIds}
      />
    </div>
  );
}
