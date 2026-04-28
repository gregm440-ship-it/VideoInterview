import { z } from "zod";
import { getAnthropic, MODELS } from "./anthropic";
import { QUESTION_GENERATOR_SYSTEM } from "./prompts/questions";
import type { ParsedJobProfile } from "./parseJobProfile";

export const questionCategorySchema = z.enum([
  "behavioral",
  "technical",
  "situational",
  "motivation_fit",
]);

export const generatedQuestionSchema = z.object({
  orderIndex: z.number().int().min(0),
  text: z.string().min(10),
  category: questionCategorySchema,
  timeLimitSeconds: z.number().int().min(30).max(180),
  retryAllowed: z.number().int().min(0).max(3),
  rationale: z.string().min(10),
});

export const generatedQuestionSetSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(5).max(8),
});

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type GeneratedQuestionSet = z.infer<typeof generatedQuestionSetSchema>;

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["orderIndex", "text", "category", "timeLimitSeconds", "retryAllowed", "rationale"],
        properties: {
          orderIndex: { type: "integer" },
          text: { type: "string" },
          category: {
            type: "string",
            enum: ["behavioral", "technical", "situational", "motivation_fit"],
          },
          timeLimitSeconds: { type: "integer" },
          retryAllowed: { type: "integer" },
          rationale: { type: "string" },
        },
      },
    },
  },
} as const;

function profileToPrompt(profile: ParsedJobProfile): string {
  const lines: string[] = [];
  lines.push(`Title: ${profile.title}`);
  if (profile.level) lines.push(`Level: ${profile.level}`);
  if (profile.responsibilities.length) {
    lines.push(`Responsibilities:\n${profile.responsibilities.map((r) => `- ${r}`).join("\n")}`);
  }
  if (profile.requiredSkills.length) {
    lines.push(`Required skills:\n${profile.requiredSkills.map((s) => `- ${s}`).join("\n")}`);
  }
  if (profile.niceToHaves.length) {
    lines.push(`Nice to have:\n${profile.niceToHaves.map((s) => `- ${s}`).join("\n")}`);
  }
  if (profile.successCriteria.length) {
    lines.push(`Success criteria:\n${profile.successCriteria.map((s) => `- ${s}`).join("\n")}`);
  }
  if (profile.roleContext) lines.push(`Role context: ${profile.roleContext}`);
  return lines.join("\n\n");
}

function validateMix(set: GeneratedQuestionSet): GeneratedQuestionSet {
  const counts = { behavioral: 0, technical: 0, situational: 0, motivation_fit: 0 };
  for (const q of set.questions) counts[q.category]++;

  const issues: string[] = [];
  if (counts.behavioral < 1) issues.push("at least 1 behavioral question");
  if (counts.technical < 1) issues.push("at least 1 technical question");
  if (counts.situational < 1) issues.push("at least 1 situational question");
  if (counts.motivation_fit !== 1) issues.push("exactly 1 motivation/fit question");

  if (issues.length > 0) {
    throw new Error(`Generated set is missing required mix: ${issues.join(", ")}.`);
  }

  return {
    questions: [...set.questions]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((q, i) => ({ ...q, orderIndex: i })),
  };
}

export async function generateQuestions(profile: ParsedJobProfile): Promise<{
  set: GeneratedQuestionSet;
  usage: { input: number; output: number };
}> {
  const client = getAnthropic();

  const response = await client.messages.create({
    model: MODELS.questions(),
    max_tokens: 4096,
    system: QUESTION_GENERATOR_SYSTEM,
    output_config: {
      format: { type: "json_schema", schema: jsonSchema },
    },
    messages: [
      {
        role: "user",
        content: `Generate the interview question set for the role below.\n\n${profileToPrompt(profile)}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Model returned no text content.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("Model returned invalid JSON.");
  }

  const validated = generatedQuestionSetSchema.parse(parsed);
  return {
    set: validateMix(validated),
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  };
}

export async function regenerateSingleQuestion(
  profile: ParsedJobProfile,
  existing: GeneratedQuestion[],
  targetIndex: number,
): Promise<{ question: GeneratedQuestion; usage: { input: number; output: number } }> {
  const target = existing[targetIndex];
  if (!target) throw new Error(`No question at index ${targetIndex}`);

  const otherSummary = existing
    .filter((_, i) => i !== targetIndex)
    .map((q, i) => `${i + 1}. [${q.category}] ${q.text}`)
    .join("\n");

  const client = getAnthropic();
  const response = await client.messages.create({
    model: MODELS.questions(),
    max_tokens: 1024,
    system: QUESTION_GENERATOR_SYSTEM,
    output_config: {
      format: {
        type: "json_schema",
        schema: jsonSchema.properties.questions.items,
      },
    },
    messages: [
      {
        role: "user",
        content: `Regenerate ONE question to replace the question below. Keep the same category (${target.category}) but produce a meaningfully different angle. The other questions in the set are listed for context — do not duplicate them.\n\nProfile:\n${profileToPrompt(profile)}\n\nQuestion to replace:\n[${target.category}] ${target.text}\n\nOther questions in the set:\n${otherSummary}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Model returned no text content.");
  const parsed = JSON.parse(textBlock.text);
  const question = generatedQuestionSchema.parse({
    ...parsed,
    orderIndex: target.orderIndex,
    category: target.category,
  });

  return {
    question,
    usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
  };
}
