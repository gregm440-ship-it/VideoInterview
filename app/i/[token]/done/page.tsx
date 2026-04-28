import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { resolveCandidateAccess } from "@/lib/api/candidateAccess";
import { HttpError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

export default async function DonePage({ params }: { params: Promise<{ token: string }> }) {
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

  return (
    <section className="container-prose py-20">
      <div className="mx-auto max-w-prose text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-accent-fg">
          ✓
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Thank you, {access.interview.candidateName}.</h1>
        <p className="mt-3 text-white/80">
          Your interview for <span className="font-medium text-white">{profile?.title ?? "this role"}</span>{" "}
          has been submitted to the hiring client via Outsorcy.
        </p>
        <p className="mt-6 text-sm text-white/60">
          You can close this tab. We&apos;ll be in touch via email if there are next steps.
        </p>
      </div>
    </section>
  );
}
