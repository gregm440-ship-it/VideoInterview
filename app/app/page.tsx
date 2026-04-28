import { Shell } from "@/components/brand/Shell";

export default function RecruiterHome() {
  return (
    <Shell variant="app">
      <section className="container-prose py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-navy/60">
          Recruiter dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy">
          Interviews
        </h1>
        <p className="mt-3 max-w-prose text-navy/75">
          The recruiter workspace will live here — list of interviews, filters, and the flow
          to ingest a job profile and generate questions. Coming in T2 + T3.
        </p>
        <div className="mt-8 rounded-xl border border-dashed border-navy/20 bg-white p-10 text-center text-navy/60">
          No interviews yet.
        </div>
      </section>
    </Shell>
  );
}
