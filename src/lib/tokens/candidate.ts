import { jwtVerify, SignJWT } from "jose";

const ISSUER = "outsorcy-interview";
const AUDIENCE = "candidate";

export type CandidatePayload = {
  interviewId: string;
  shareLinkId: string;
};

function getSecret(): Uint8Array {
  const raw = process.env.CANDIDATE_TOKEN_SECRET;
  if (!raw) throw new Error("CANDIDATE_TOKEN_SECRET is not set.");
  return new TextEncoder().encode(raw);
}

function getTtlSeconds(): number {
  const days = Number(process.env.CANDIDATE_TOKEN_TTL_DAYS ?? "7");
  if (!Number.isFinite(days) || days <= 0) return 7 * 24 * 60 * 60;
  return Math.floor(days * 24 * 60 * 60);
}

export async function signCandidateToken(payload: CandidatePayload): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const ttl = getTtlSeconds();
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecret());
  return { token, expiresAt };
}

export async function verifyCandidateToken(token: string): Promise<CandidatePayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (typeof payload.interviewId !== "string" || typeof payload.shareLinkId !== "string") {
    throw new Error("Token payload is missing interviewId or shareLinkId.");
  }
  return { interviewId: payload.interviewId, shareLinkId: payload.shareLinkId };
}
