import Link from "next/link";
import { Shell } from "@/components/brand/Shell";

export default function LandingPage() {
  return (
    <Shell
      variant="app"
      rightSlot={
        <Link href="/app" className="text-navy/70 hover:text-navy">
          Recruiter sign in
        </Link>
      }
    >
      <section className="bg-paper">
        <div className="container-prose grid gap-12 py-20 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-navy/60">
              Outsorcy delivery layer
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-navy md:text-5xl">
              Send five scored interviews instead of thirty resumes.
            </h1>
            <p className="mt-6 max-w-prose text-lg text-navy/75">
              AI-generated interview questions, async video responses, and a branded
              hiring-manager report — produced in minutes, not days. Built for
              recruiters who win on outcomes, not price.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app" className="btn-primary">
                Open recruiter app
              </Link>
              <a href="#how-it-works" className="btn-ghost">
                How it works
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-navy/60">
                Sample report
              </span>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-fg">
                Score 8.2 / 10
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-navy">
              Senior Backend Engineer · Sara K.
            </p>
            <p className="mt-2 text-sm text-navy/75">
              Strong systems-design instincts and clear ownership over past projects.
              Light on event-driven experience but mitigated by sharp learning loop.
            </p>
            <div className="mt-5 space-y-2">
              {[
                ["Technical depth", 8],
                ["Communication", 9],
                ["Role fit", 8],
              ].map(([label, score]) => (
                <div key={label as string} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-navy/70">{label}</span>
                  <div className="h-2 flex-1 rounded-full bg-navy/10">
                    <div
                      className="h-full rounded-full bg-navy"
                      style={{ width: `${(score as number) * 10}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-semibold text-navy">
                    {score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white">
        <div className="container-prose py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-navy md:text-3xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Paste the job",
                body: "Drop in a role description. We parse it into responsibilities, skills, and success criteria.",
              },
              {
                n: "02",
                title: "Send a single link",
                body: "Candidates record async on any device. No scheduling, no logins, full consent capture.",
              },
              {
                n: "03",
                title: "Deliver the report",
                body: "Per-question transcripts, an AI fit score against your rubric, and an embedded interview to share with the client.",
              },
            ].map((step) => (
              <div key={step.n} className="rounded-xl border border-navy/10 p-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-fg/80">
                  {step.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-navy">{step.title}</h3>
                <p className="mt-2 text-sm text-navy/75">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}
