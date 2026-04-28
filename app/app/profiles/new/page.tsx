import { Shell } from "@/components/brand/Shell";
import { NewProfileForm } from "./NewProfileForm";

export default function NewProfilePage() {
  return (
    <Shell variant="app">
      <section className="container-prose py-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-navy/60">
          Step 1 of 2
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy">
          Paste the job description
        </h1>
        <p className="mt-3 max-w-prose text-navy/75">
          Drop in the role you're hiring for. We&apos;ll parse it into a structured profile,
          then generate a 5–8 question async video interview tailored to the role.
        </p>
        <div className="mt-8">
          <NewProfileForm />
        </div>
      </section>
    </Shell>
  );
}
