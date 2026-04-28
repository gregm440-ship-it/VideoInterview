import Anthropic from "@anthropic-ai/sdk";

declare global {
  // eslint-disable-next-line no-var
  var __anthropic__: Anthropic | undefined;
}

export function getAnthropic(): Anthropic {
  if (!globalThis.__anthropic__) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    globalThis.__anthropic__ = new Anthropic({ apiKey });
  }
  return globalThis.__anthropic__;
}

export const MODELS = {
  questions: () => process.env.ANTHROPIC_MODEL_QUESTIONS ?? "claude-haiku-4-5",
  analysis: () => process.env.ANTHROPIC_MODEL_ANALYSIS ?? "claude-opus-4-7",
} as const;

export const PROMPT_VERSION = "v1.2026-04";
