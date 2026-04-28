import { DeepgramClient } from "@deepgram/sdk";
import type { TranscriptDocument, TranscriptSegment } from "@/db/schema";

declare global {
  // eslint-disable-next-line no-var
  var __deepgram__: DeepgramClient | undefined;
}

function getClient(): DeepgramClient {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY is not set.");
  if (!globalThis.__deepgram__) globalThis.__deepgram__ = new DeepgramClient({ apiKey });
  return globalThis.__deepgram__;
}

export type TranscriptionResult = {
  document: TranscriptDocument;
  durationSeconds: number | null;
  isStub: boolean;
};

export function isStubMode(): boolean {
  return !process.env.DEEPGRAM_API_KEY;
}

/**
 * Stub transcription used when DEEPGRAM_API_KEY is absent — lets the rest of
 * the pipeline (fit analysis, report rendering) be exercised without a key.
 * Returns deterministic placeholder text keyed off the question prompt so the
 * downstream model has *some* signal beyond a constant string.
 */
export function stubTranscription(args: {
  questionText: string;
  questionCategory: string;
}): TranscriptionResult {
  const seed = args.questionText.split(/\s+/).slice(0, 8).join(" ");
  const sentences = [
    `Sure — let me speak to ${seed.toLowerCase()}.`,
    `In my last role I owned a project that touched on this directly: I led the design, drove the rollout, and measured the impact.`,
    `The approach I took was to prioritize learning fast over being right immediately, which meant shipping a thin slice first and instrumenting it heavily.`,
    `I'd apply that same instinct to this role, especially given the ${args.questionCategory.replace("_", "/")} angle of the question.`,
  ];
  const fullText = sentences.join(" ");
  const segments: TranscriptSegment[] = [];
  let cursor = 0;
  for (const s of sentences) {
    const ms = s.length * 50;
    segments.push({
      startMs: cursor,
      endMs: cursor + ms,
      text: s,
      confidence: 0.85,
    });
    cursor += ms;
  }
  return {
    document: { language: "en", fullText, segments },
    durationSeconds: Math.round(cursor / 1000),
    isStub: true,
  };
}

type DeepgramUtterance = {
  start?: number;
  end?: number;
  transcript?: string;
  confidence?: number;
};

type DeepgramAlt = { transcript?: string };

type DeepgramChannel = {
  alternatives?: DeepgramAlt[];
  detected_language?: string;
};

type DeepgramResult = {
  results?: {
    channels?: DeepgramChannel[];
    utterances?: DeepgramUtterance[];
  };
  metadata?: { duration?: number };
};

export async function transcribeFromUrl(args: { url: string }): Promise<TranscriptionResult> {
  const client = getClient();
  const model = process.env.DEEPGRAM_MODEL ?? "nova-3";

  const raw = await client.listen.v1.media.transcribeUrl({
    url: args.url,
    model,
    smart_format: true,
    punctuate: true,
    paragraphs: true,
    utterances: true,
  });

  const result = raw as unknown as DeepgramResult;
  const channel = result.results?.channels?.[0];
  const alt = channel?.alternatives?.[0];
  if (!alt) throw new Error("Deepgram returned no transcript alternatives.");

  const segments: TranscriptSegment[] = (result.results?.utterances ?? []).map((u) => ({
    startMs: Math.round((u.start ?? 0) * 1000),
    endMs: Math.round((u.end ?? 0) * 1000),
    text: u.transcript ?? "",
    confidence: u.confidence ?? 0,
  }));

  const fullText = alt.transcript ?? segments.map((s) => s.text).join(" ");
  const language = channel?.detected_language ?? "en";
  const duration = result.metadata?.duration ?? null;

  return {
    document: { language, fullText, segments },
    durationSeconds: duration != null ? Math.round(duration) : null,
    isStub: false,
  };
}
