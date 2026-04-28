"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  orderIndex: number;
  text: string;
  category: string;
  timeLimitSeconds: number;
  retryAllowed: number;
};

type Stage =
  | "permission"
  | "prep"
  | "recording"
  | "review"
  | "uploading"
  | "moving";

const PREP_SECONDS = 30;

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

export function Recorder({
  token,
  questions,
  startQuestionId,
  acceptedIds,
}: {
  token: string;
  questions: Question[];
  startQuestionId: string;
  acceptedIds: string[];
}) {
  const router = useRouter();

  const startIndex = Math.max(
    0,
    questions.findIndex((q) => q.id === startQuestionId),
  );
  const accepted = useRef(new Set(acceptedIds));

  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [stage, setStage] = useState<Stage>("permission");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PREP_SECONDS);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const tickRef = useRef<number | null>(null);

  const currentQuestion = questions[activeIndex];

  // Acquire camera/mic once
  useEffect(() => {
    requestMedia();
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire stream to preview element when in prep/recording stage
  useEffect(() => {
    if (!streamRef.current || !previewRef.current) return;
    if (stage === "prep" || stage === "recording" || stage === "uploading" || stage === "moving") {
      previewRef.current.srcObject = streamRef.current;
      previewRef.current.play().catch(() => {});
    }
  }, [stage]);

  // Reset attempts when moving to a new question
  useEffect(() => {
    setAttemptsUsed(0);
    blobRef.current = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setStage("prep");
    setSecondsLeft(PREP_SECONDS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Prep + recording timer driver
  useEffect(() => {
    if (stage !== "prep" && stage !== "recording") return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (stage === "prep") {
            startRecording();
          } else if (stage === "recording") {
            stopRecording();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  async function requestMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      streamRef.current = stream;
      setStage("prep");
      setSecondsLeft(PREP_SECONDS);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Could not access camera/mic: ${e.message}.`
          : "Could not access camera or microphone.",
      );
    }
  }

  function skipPrep() {
    if (stage !== "prep") return;
    startRecording();
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    blobRef.current = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    const mime = pickMime();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      blobRef.current = blob;
      setPreviewUrl(URL.createObjectURL(blob));
      setStage("review");
    };
    recorder.start(1000); // emit chunks each second so memory stays bounded
    setAttemptsUsed((a) => a + 1);
    setStage("recording");
    setSecondsLeft(currentQuestion.timeLimitSeconds);
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  function reRecord() {
    setSecondsLeft(PREP_SECONDS);
    setStage("prep");
  }

  async function acceptAndUpload() {
    const blob = blobRef.current;
    if (!blob) return;
    setStage("uploading");
    setUploadProgress(0);
    setError(null);

    try {
      const initRes = await fetch(`/api/i/${token}/responses/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQuestion.id, contentType: blob.type }),
      });
      const initJson = await initRes.json();
      if (!initRes.ok) throw new Error(initJson.error ?? "Could not start upload.");

      // PUT directly to R2 with progress reporting via XMLHttpRequest.
      await xhrPut(initJson.uploadUrl, blob, blob.type, (pct) => setUploadProgress(pct));

      const completeRes = await fetch(`/api/i/${token}/responses/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId: initJson.responseId,
          durationSeconds: Math.max(1, currentQuestion.timeLimitSeconds - secondsLeft),
        }),
      });
      const completeJson = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeJson.error ?? "Server rejected the upload.");

      accepted.current.add(currentQuestion.id);
      setStage("moving");

      const next = questions.findIndex(
        (q, i) => i > activeIndex && !accepted.current.has(q.id),
      );
      if (next === -1) {
        router.push(`/i/${token}/done`);
      } else {
        setTimeout(() => setActiveIndex(next), 600);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("review");
    }
  }

  if (error && stage === "permission") {
    return (
      <section className="container-prose py-16">
        <h1 className="text-2xl font-semibold">Camera or microphone is blocked</h1>
        <p className="mt-3 max-w-prose text-white/75">{error}</p>
        <button onClick={requestMedia} className="btn-accent mt-6">
          Try again
        </button>
      </section>
    );
  }

  const total = questions.length;
  const remainingRetries = Math.max(0, currentQuestion.retryAllowed - (attemptsUsed - 1));

  return (
    <section className="container-prose py-8 md:py-12">
      <div className="flex items-center justify-between text-sm text-white/70">
        <span>
          Question {activeIndex + 1} of {total}
        </span>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
          {currentQuestion.category.replace("_", " / ")}
        </span>
      </div>

      <h1 className="mt-3 text-2xl font-semibold leading-snug md:text-3xl">
        {currentQuestion.text}
      </h1>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_22rem] md:items-start">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
          {stage === "review" && previewUrl ? (
            <video ref={playbackRef} src={previewUrl} controls className="aspect-video w-full" />
          ) : (
            <video
              ref={previewRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full bg-black object-cover"
            />
          )}
        </div>

        <div className="space-y-5 text-sm">
          {error && stage !== "permission" && (
            <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">
              {error}
            </div>
          )}

          {(stage === "prep" || stage === "recording") && (
            <Timer
              seconds={secondsLeft}
              total={stage === "prep" ? PREP_SECONDS : currentQuestion.timeLimitSeconds}
              kind={stage}
            />
          )}

          {stage === "prep" && (
            <div className="space-y-2">
              <p className="text-white/70">
                Take a moment to read the question. Recording starts automatically when this timer
                hits zero.
              </p>
              <button onClick={skipPrep} className="btn-accent w-full">
                I&apos;m ready — start recording
              </button>
            </div>
          )}

          {stage === "recording" && (
            <button onClick={stopRecording} className="btn-accent w-full">
              Stop recording
            </button>
          )}

          {stage === "review" && (
            <div className="space-y-2">
              <p className="text-white/70">Review your take.</p>
              <button onClick={acceptAndUpload} className="btn-accent w-full">
                Accept and continue
              </button>
              {remainingRetries > 0 ? (
                <button onClick={reRecord} className="btn-ghost w-full">
                  Re-record ({remainingRetries} {remainingRetries === 1 ? "retry" : "retries"} left)
                </button>
              ) : (
                <p className="text-xs text-white/50">No retries remaining for this question.</p>
              )}
            </div>
          )}

          {stage === "uploading" && (
            <div className="space-y-2">
              <p className="text-white/70">Uploading…</p>
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-white/50">{uploadProgress}%</p>
            </div>
          )}

          {stage === "moving" && (
            <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
              Saved. Loading next question…
            </p>
          )}

          <Progress questions={questions} activeIndex={activeIndex} acceptedSet={accepted.current} />
        </div>
      </div>
    </section>
  );
}

function Timer({ seconds, total, kind }: { seconds: number; total: number; kind: "prep" | "recording" }) {
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
        <span>{kind === "prep" ? "Prep" : "Recording"}</span>
        <span className="font-mono text-base text-white">
          {String(Math.floor(seconds / 60)).padStart(1, "0")}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${kind === "prep" ? "bg-white/40" : "bg-accent"}`}
          style={{ width: `${pct}%`, transition: "width 0.5s linear" }}
        />
      </div>
    </div>
  );
}

function Progress({
  questions,
  activeIndex,
  acceptedSet,
}: {
  questions: Question[];
  activeIndex: number;
  acceptedSet: Set<string>;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Progress</p>
      <ol className="space-y-1 text-xs text-white/60">
        {questions.map((q, i) => {
          const done = acceptedSet.has(q.id);
          const active = i === activeIndex;
          return (
            <li key={q.id} className="flex items-center gap-2">
              <span
                className={`inline-flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-accent text-accent-fg"
                      : "bg-white/10 text-white/50"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={done ? "line-through text-white/40" : active ? "text-white" : ""}>
                Q{i + 1}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function xhrPut(url: string, blob: Blob, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(blob);
  });
}
