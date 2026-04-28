import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db/client";
import { getCurrentContext } from "@/lib/auth/devUser";
import { parseJobProfile } from "@/lib/ai/parseJobProfile";
import { recordAiUsage } from "@/lib/api/usage";
import { handleApiError, badRequest } from "@/lib/api/errors";
import { MODELS } from "@/lib/ai/anthropic";

const bodySchema = z.object({
  rawText: z.string().min(20, "Job description must be at least 20 characters."),
});

export async function POST(req: Request) {
  try {
    const { org, user } = await getCurrentContext();
    const body = await req.json().catch(() => badRequest("Invalid JSON body."));
    const { rawText } = bodySchema.parse(body);

    const { profile, usage } = await parseJobProfile(rawText);

    const [row] = await db
      .insert(schema.jobProfiles)
      .values({
        orgId: org.id,
        createdByUserId: user.id,
        title: profile.title,
        level: profile.level,
        responsibilities: profile.responsibilities,
        requiredSkills: profile.requiredSkills,
        niceToHaves: profile.niceToHaves,
        roleContext: profile.roleContext,
        successCriteria: profile.successCriteria,
        rawInput: rawText,
        source: "paste",
      })
      .returning();

    await recordAiUsage({
      orgId: org.id,
      model: MODELS.questions(),
      inputTokens: usage.input,
      outputTokens: usage.output,
    });

    return NextResponse.json({ jobProfile: row }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
