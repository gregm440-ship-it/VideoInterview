import Link from "next/link";
import { desc } from "drizzle-orm";
import { Shell } from "@/components/brand/Shell";
import { db } from "@/db/client";
import { getCurrentContext } from "@/lib/auth/devUser";

export const dynamic = "force-dynamic";

export default async function RecruiterHome() {
  const { org } = await getCurrentContext();

  const interviews = await db.query.interviews.findMany({
    where: (i, { eq }) => eq(i.orgId, org.id),
    orderBy: (i) => desc(i.createdAt),
    limit: 50,
  });

  const profileTitles = new Map<string, string>();
  const fitByInterview = new Map<
    string,
    { overallScore: string; recommendedNextStep: "advance" | "hold" | "pass" }
  >();

  if (interviews.length > 0) {
    const ids = interviews.map((i) => i.jobProfileId);
    const interviewIds = interviews.map((i) => i.id);
    const [profiles, fits] = await Promise.all([
      db.query.jobProfiles.findMany({
        where: (p, { inArray }) => inArray(p.id, ids),
      }),
      db.query.fitAnalyses.findMany({
        where: (f, { inArray }) => inArray(f.interviewId, interviewIds),
      }),
    ]);
    for (const p of profiles) profileTitles.set(p.id, p.title);
    for (const f of fits) {
      fitByInterview.set(f.interviewId, {
        overallScore: f.overallScore,
        recommendedNextStep: f.recommendedNextStep,
      });
    }
  }

  return (
    <Shell variant="app">
      <section className="container-prose py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-navy/60">
              Recruiter dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Interviews</h1>
          </div>
          <Link href="/app/profiles/new" className="btn-primary">
            New interview
          </Link>
        </div>

        <div className="mt-8">
          {interviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-navy/20 bg-white p-12 text-center">
              <p className="text-navy/70">No interviews yet.</p>
              <p className="mt-1 text-sm text-navy/50">Start by pasting a job description.</p>
              <Link href="/app/profiles/new" className="btn-primary mt-6 inline-flex">
                Create your first interview
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
              {interviews.map((i) => {
                const fit = fitByInterview.get(i.id);
                return (
                  <li key={i.id}>
                    <Link
                      href={`/app/interviews/${i.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-navy-50/40"
                    >
                      <div>
                        <p className="font-medium text-navy">{i.candidateName}</p>
                        <p className="text-sm text-navy/60">
                          {profileTitles.get(i.jobProfileId) ?? "—"} · {i.candidateEmail}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {fit && (
                          <>
                            <span className="rounded-full bg-navy px-2.5 py-0.5 font-mono font-semibold text-white">
                              {parseFloat(fit.overallScore).toFixed(1)}
                            </span>
                            <RecommendationPill rec={fit.recommendedNextStep} />
                          </>
                        )}
                        <span className="rounded-full bg-navy-50 px-2.5 py-0.5 font-semibold uppercase tracking-wider text-navy">
                          {i.status}
                        </span>
                        <span className="text-navy/50">
                          {new Date(i.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </Shell>
  );
}

function RecommendationPill({ rec }: { rec: "advance" | "hold" | "pass" }) {
  const tone =
    rec === "advance"
      ? "bg-emerald-50 text-emerald-900"
      : rec === "hold"
        ? "bg-amber-50 text-amber-900"
        : "bg-rose-50 text-rose-900";
  const label = rec === "advance" ? "advance" : rec === "hold" ? "hold" : "pass";
  return <span className={`rounded-full px-2.5 py-0.5 font-medium ${tone}`}>{label}</span>;
}
