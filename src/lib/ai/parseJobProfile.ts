import { z } from "zod";
import { getAnthropic, MODELS } from "./anthropic";
import { JOB_PROFILE_PARSER_SYSTEM } from "./prompts/jobProfile";

export const parsedJobProfileSchema = z.object({
  title: z.string().min(1),
  level: z.string().nullable(),
  responsibilities: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  niceToHaves: z.array(z.string()),
  roleContext: z.string().nullable(),
  successCriteria: z.array(z.string()),
});

export type ParsedJobProfile = z.infer<typeof parsedJobProfileSchema>;

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "level",
    "responsibilities",
    "requiredSkills",
    "niceToHaves",
    "roleContext",
    "successCriteria",
  ],
  properties: {
    title: { type: "string", description: "Concise role title, e.g. 'Senior Backend Engineer'." },
    level: {
      type: ["string", "null"],
      description: "Seniority signal — junior | mid | senior | staff | lead | principal — or null if unclear.",
    },
    responsibilities: {
      type: "array",
      items: { type: "string" },
      description: "Short active-voice bullets describing what the hire will do day-to-day.",
    },
    requiredSkills: {
      type: "array",
      items: { type: "string" },
      description: "Must-have skills, technologies, or domains.",
    },
    niceToHaves: {
      type: "array",
      items: { type: "string" },
      description: "Preferred-but-not-required skills and bonuses.",
    },
    roleContext: {
      type: ["string", "null"],
      description: "One short paragraph on team shape, working model, and any unusual constraints.",
    },
    successCriteria: {
      type: "array",
      items: { type: "string" },
      description: "Observable outcomes the hire would deliver in their first 6–12 months.",
    },
  },
} as const;

export async function parseJobProfile(rawText: string): Promise<{
  profile: ParsedJobProfile;
  usage: { input: number; output: number };
}> {
  const trimmed = rawText.trim();
  if (trimmed.length < 20) {
    throw new Error("Job description is too short to parse (minimum 20 characters).");
  }

  const client = getAnthropic();

  const response = await client.messages.create({
    model: MODELS.questions(),
    max_tokens: 4096,
    system: JOB_PROFILE_PARSER_SYSTEM,
    output_config: {
      format: { type: "json_schema", schema: jsonSchema },
    },
    messages: [
      {
        role: "user",
        content: `Parse the following job description into the structured profile schema.\n\n---\n${trimmed}\n---`,
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

  return {
    profile: parsedJobProfileSchema.parse(parsed),
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
  };
}
