"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Stage = "idle" | "ready" | "recording" | "playback";

export function DeviceCheck({ token }: { token: string }) {
  const router = useRouter();
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [practiceUrl, setPracticeUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (practiceUrl) URL.revokeObjectURL(practiceUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestDevices() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play().catch(() => {});
      }

      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      tickMeter();
      setStage("ready");
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not access camera/mic: ${e.message}. Check browser permissions and try again.`
          : "Could not access camera or microphone.",
      );
    }
  }

  function tickMeter() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let max = 0;
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128) / 128;
        if (v > max) max = v;
      }
      setLevel(max);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  }

  function startPractice() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mime = pickMime();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      if (practiceUrl) URL.revokeObjectURL(practiceUrl);
      setPracticeUrl(URL.createObjectURL(blob));
      setStage("playback");
    };
    recorder.start();
    setStage("recording");
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, 5000);
  }

  function retry() {
    if (practiceUrl) URL.revokeObjectURL(practiceUrl);
    setPracticeUrl(null);
    setStage("ready");
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_22rem] md:items-start">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
        {stage === "playback" && practiceUrl ? (
          <video ref={playbackRef} src={practiceUrl} controls autoPlay className="aspect-video w-full" />
        ) : (
          <video
            ref={previewRef}
            playsInline
            muted
            className="aspect-video w-full bg-black object-cover"
          />
        )}
      </div>

      <div className="space-y-5 text-sm">
        {error && (
          <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">
            {error}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Mic level</p>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${Math.min(100, Math.round(level * 200))}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-white/50">
            Speak normally — the bar should move past 30%.
          </p>
        </div>

        {stage === "idle" && (
          <button onClick={requestDevices} className="btn-accent w-full">
            Allow camera &amp; mic
          </button>
        )}

        {stage === "ready" && (
          <div className="space-y-2">
            <button onClick={startPractice} className="btn-accent w-full">
              Try a 5-second practice clip
            </button>
            <button
              onClick={() => router.push(`/i/${token}/record`)}
              className="btn-ghost w-full"
            >
              Skip — I&apos;m good, start the interview
            </button>
          </div>
        )}

        {stage === "recording" && (
          <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-accent-fg">
            Recording — 5 seconds…
          </div>
        )}

        {stage === "playback" && (
          <div className="space-y-2">
            <p className="text-white/70">
              Looks and sounds OK? Let&apos;s start the interview.
            </p>
            <button
              onClick={() => router.push(`/i/${token}/record`)}
              className="btn-accent w-full"
            >
              Start interview
            </button>
            <button onClick={retry} className="btn-ghost w-full">
              Try the practice again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function pickMime(): string | null {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}
