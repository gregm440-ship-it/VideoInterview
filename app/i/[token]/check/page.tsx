import { DeviceCheck } from "./DeviceCheck";

export default async function DeviceCheckPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="bg-navy text-white">
      <section className="container-prose py-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
          Step 2 — device check
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
          Let&apos;s make sure your camera and mic are working.
        </h1>
        <p className="mt-2 max-w-prose text-white/70">
          Allow camera + microphone access. Try a 5-second practice clip — it&apos;s
          discarded immediately and never shared.
        </p>
        <div className="mt-8">
          <DeviceCheck token={token} />
        </div>
      </section>
    </div>
  );
}
