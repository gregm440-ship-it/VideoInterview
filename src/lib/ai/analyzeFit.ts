import { z } from "zod";
import { getAnthropic, MODELS } from "./anthropic";
import { FIT_ANALYSIS_SYSTEM } from "./prompts/fitAnalysis";
import type { ParsedJobProfile } from "./parseJobProfile";
import type { TranscriptDocument } from "@/db/schema";

export const competencyScoreSchema = z.object({
  name: z.string().min(2),
  score: z.number().int().min(1).max(10),
  evidence: z.string().min(10),
});

export const recommendationSchema = z.enum(["advance", "hold", "pass"]);

export const fitAnalysisSchema = z.object({
  overall_score: z.number().min(1).max(10),
  score_rationale: z.string().min(10),
  competency_scores: z.array(competencyScoreSchema).min(3).max(3),
  strengths: z.array(z.string().min(5)).max(3),
  weaknesses: z.array(z.string().min(5)).max(3),
  risk_flags: z.array(z.string()).max(3),
  recommended_next_step: recommendationSchema,
  headline_summary: z.string().min(20),
});

export type FitAnalysisOutput = z.infer<typeof fitAnalysisSchema>;

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overall_score",
    "score_rationale",
    "competency_scores",
    "strengths",
    "weaknesses",
    "risk_flags",
    "recommended_next_step",
    "headline_summary",
  ],
  properties: {
    overall_score: { type: "number" },
    score_rationale: { type: "string" },
    competency_scores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "score", "evidence"],
        properties: {
          name: { type: "string" },
          score: { type: "integer" },
          evidence: { type: "string" },
        },
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    weaknesses: { type: "array", items: { type: "string" } },
    risk_flags: { type: "array", items: { type: "string" } },
    recommended_next_step: { type: "string", enum: ["advance", "hold", "pass"] },
    headline_summary: { type: "string" },
  },
} as const;

export type FitAnalysisInput = {
  profile: ParsedJobProfile & { title: string };
  questions: Array<{
    id: string;
    orderIndex: number;
    text: string;
    category: string;
    rationale: string | null;
  }>;
  responses: Array<{
    questionId: string;
    transcript: TranscriptDocument | null;
    durationSeconds: number | null;
  }>;
};

function buildUserMessage(input: FitAnalysisInput): string {
  const lines: string[] = [];
  lines.push(`# Role: ${input.profile.title}${input.profile.level ? ` (${input.profile.level})` : ""}\n`);
  if (input.profile.roleContext) lines.push(`Context: ${input.profile.roleContext}\n`);
  if (input.profile.responsibilities.length) {
    lines.push("Responsibilities:");
    for (const r of input.profile.responsibilities) lines.push(`- ${r}`);
    lines.push("");
  }
  if (input.profile.requiredSkills.length) {
    lines.push("Required skills:");
    for (const s of input.profile.requiredSkills) lines.push(`- ${s}`);
    lines.push("");
  }
  if (input.profile.niceToHaves.length) {
    lines.push("Nice to have:");
    for (const s of input.profile.niceToHaves) lines.push(`- ${s}`);
    lines.push("");
  }
  if (input.profile.successCriteria.length) {
    lines.push("Success criteria:");
    for (const s of input.profile.successCriteria) lines.push(`- ${s}`);
    lines.push("");
  }

  lines.push("\n# Interview\n");
  const responseByQ = new Map(input.responses.map((r) => [r.questionId, r]));
  const sorted = [...input.questions].sort((a, b) => a.orderIndex - b.orderIndex);
  for (const q of sorted) {
    lines.push(`## Q${q.orderIndex + 1} (${q.category}): ${q.text}`);
    if (q.rationale) lines.push(`_(recruiter rationale: ${q.rationale})_`);
    const r = responseByQ.get(q.id);
    if (!r || !r.transcript) {
      lines.push("\n(no transcript available — candidate skipped or upload failed)\n");
      continue;
    }
    const dur = r.durationSeconds != null ? ` (${r.durationSeconds}s)` : "";
    lines.push(`\nCandidate response${dur}:\n${r.transcript.fullText.trim()}\n`);
  }

  lines.push(
    "\n# Task\nProduce the fit analysis JSON as specified by the system prompt and the schema you've been given. Do not include any other text.",
  );
  return lines.join("\n");
}

export async function analyzeFit(input: FitAnalysisInput): Promise<{
  output: FitAnalysisOutput;
  usage: { input: number; output: number };
  model: string;
}> {
  const client = getAnthropic();
  const model = MODELS.analysis();

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: FIT_ANALYSIS_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: jsonSchema },
    },
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model returned no text content for fit analysis.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("Fit-analysis model returned invalid JSON.");
  }

  return {
    output: fitAnalysisSchema.parse(parsed),
    usage: {
      input:
        response.usage.input_tokens +
        (response.usage.cache_read_input_tokens ?? 0) +
        (response.usage.cache_creation_input_tokens ?? 0),
      output: response.usage.output_tokens,
    },
    model,
  };
}
