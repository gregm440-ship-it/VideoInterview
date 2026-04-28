import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { resolveCandidateAccess } from "@/lib/api/candidateAccess";
import { HttpError } from "@/lib/api/errors";
import { ConsentForm } from "./ConsentForm";

export const dynamic = "force-dynamic";

export default async function CandidateLanding({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let access;
  try {
    access = await resolveCandidateAccess(token);
  } catch (e) {
    if (e instanceof HttpError && (e.status === 401 || e.status === 404)) notFound();
    throw e;
  }

  const profile = await db.query.jobProfiles.findFirst({
    where: eq(schema.jobProfiles.id, access.interview.jobProfileId),
  });

  const totalSeconds = access.questions.reduce(
    (sum, q) => sum + q.timeLimitSeconds + 30,
    0,
  );
  const minutesEstimate = Math.ceil(totalSeconds / 60) + 2;

  return (
    <div className="bg-navy text-white">
      <section className="container-prose py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
          You&apos;re invited to interview
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          {profile?.title ?? "the role"}
        </h1>
        <p className="mt-2 text-white/70">
          via Outsorcy &middot; for {access.interview.candidateName}
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Stat label="Questions" value={`${access.questions.length}`} />
          <Stat label="Estimated time" value={`~${minutesEstimate} min`} />
          <Stat label="Format" value="Async video" />
        </div>

        <div className="mt-12 max-w-prose space-y-4 text-white/80">
          <h2 className="text-lg font-semibold text-white">What to expect</h2>
          <ul className="space-y-2 text-sm leading-relaxed">
            <li>
              You&apos;ll see one question at a time with a 30-second prep timer, then a recording
              window scaled to the question.
            </li>
            <li>
              You can re-record once per question if you&apos;re not happy with your first take.
              The accepted take is what gets shared.
            </li>
            <li>
              If your connection drops, your progress is saved and you can resume from this same
              link.
            </li>
            <li>You&apos;ll need a working camera and microphone, and ideally a quiet space.</li>
          </ul>
        </div>

        <ConsentForm token={token} />

        <p className="mt-8 text-xs text-white/50">
          Link expires {new Date(access.shareLink.expiresAt).toLocaleDateString()}.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
