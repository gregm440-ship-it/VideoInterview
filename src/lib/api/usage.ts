import { db, schema } from "@/db/client";

export async function recordAiUsage(args: {
  orgId: string;
  interviewId?: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  const totalTokens = args.inputTokens + args.outputTokens;
  await db.insert(schema.usageEvents).values({
    orgId: args.orgId,
    interviewId: args.interviewId ?? null,
    eventType: "ai_tokens",
    model: args.model,
    units: totalTokens.toString(),
    costUsdCents: estimateCostCents(args.model, args.inputTokens, args.outputTokens),
  });
}

const PRICE_PER_MILLION_CENTS: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 500, output: 2500 },
  "claude-opus-4-6": { input: 500, output: 2500 },
  "claude-sonnet-4-6": { input: 300, output: 1500 },
  "claude-haiku-4-5": { input: 100, output: 500 },
};

function estimateCostCents(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICE_PER_MILLION_CENTS[model];
  if (!price) return 0;
  const cents = (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
  return Math.round(cents);
}
