import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { getCurrentContext } from "@/lib/auth/devUser";
import { getInterviewForOrg } from "@/lib/api/interviewAccess";
import { handleApiError, conflict } from "@/lib/api/errors";
import { signCandidateToken } from "@/lib/tokens/candidate";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { org, user } = await getCurrentContext();
    const { id } = await ctx.params;
    const { interview, questions } = await getInterviewForOrg(id, org.id);

    if (interview.status === "expired") conflict("Interview has expired.");
    if (questions.length < 5) conflict("Need at least 5 questions before sending.");

    // Reuse an existing live candidate share link if one is unrevoked + unexpired.
    let shareLink = await db.query.shareLinks.findFirst({
      where: and(
        eq(schema.shareLinks.interviewId, interview.id),
        eq(schema.shareLinks.kind, "candidate"),
        isNull(schema.shareLinks.revokedAt),
        gt(schema.shareLinks.expiresAt, new Date()),
      ),
    });

    if (!shareLink) {
      const ttlDays = Number(process.env.CANDIDATE_TOKEN_TTL_DAYS ?? 7);
      const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
      const [row] = await db
        .insert(schema.shareLinks)
        .values({
          token: "pending", // replaced below once we have signed the JWT against this row id
          kind: "candidate",
          interviewId: interview.id,
          expiresAt,
          createdByUserId: user.id,
        })
        .returning();
      shareLink = row;
    }

    const signed = await signCandidateToken({
      interviewId: interview.id,
      shareLinkId: shareLink.id,
    });

    // We don't store the raw JWT for verification (that's done with HMAC), but we
    // persist the latest signed string for forensic / "show last URL" purposes
    // and so revoked_at is the single source of truth for invalidation.
    await db
      .update(schema.shareLinks)
      .set({ token: signed.token, expiresAt: signed.expiresAt })
      .where(eq(schema.shareLinks.id, shareLink.id));

    if (!interview.lockedAt) {
      await db
        .update(schema.interviews)
        .set({
          status: "sent",
          lockedAt: new Date(),
          expiresAt: signed.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(schema.interviews.id, interview.id));
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = `${baseUrl}/i/${signed.token}`;

    return NextResponse.json({ url, token: signed.token, expiresAt: signed.expiresAt });
  } catch (err) {
    return handleApiError(err);
  }
}
