import { NextResponse } from "next/server";
import { db, schema } from "@/db/client";
import { resolveCandidateAccess } from "@/lib/api/candidateAccess";
import { handleApiError } from "@/lib/api/errors";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const { interview } = await resolveCandidateAccess(token);

    const fwd = req.headers.get("x-forwarded-for");
    const ip = fwd?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent");

    const [row] = await db
      .insert(schema.consentLogs)
      .values({
        interviewId: interview.id,
        ipAddress: ip,
        userAgent,
        consentVersion: "v1",
      })
      .returning();

    return NextResponse.json({ ok: true, consentId: row.id, consentedAt: row.consentedAt });
  } catch (err) {
    return handleApiError(err);
  }
}
