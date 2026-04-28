import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { verifyCandidateToken } from "@/lib/tokens/candidate";
import { HttpError } from "./errors";
import type {
  Interview,
  ShareLink,
  InterviewQuestion,
  CandidateResponse,
} from "@/db/schema";

export type CandidateAccess = {
  shareLink: ShareLink;
  interview: Interview;
  questions: InterviewQuestion[];
  responses: CandidateResponse[];
};

export async function resolveCandidateAccess(token: string): Promise<CandidateAccess> {
  const payload = await verifyCandidateToken(token).catch(() => {
    throw new HttpError(401, "Token is invalid or expired.");
  });

  const shareLink = await db.query.shareLinks.findFirst({
    where: eq(schema.shareLinks.id, payload.shareLinkId),
  });
  if (!shareLink) throw new HttpError(404, "Share link not found.");
  if (shareLink.revokedAt) throw new HttpError(401, "This link has been revoked.");
  if (shareLink.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, "This link has expired.");
  }
  if (shareLink.kind !== "candidate") {
    throw new HttpError(401, "Wrong link kind for this surface.");
  }
  if (shareLink.interviewId !== payload.interviewId) {
    throw new HttpError(401, "Token / link mismatch.");
  }

  const interview = await db.query.interviews.findFirst({
    where: eq(schema.interviews.id, shareLink.interviewId),
  });
  if (!interview) throw new HttpError(404, "Interview not found.");

  const [questions, responses] = await Promise.all([
    db.query.interviewQuestions.findMany({
      where: eq(schema.interviewQuestions.interviewId, interview.id),
      orderBy: (q, { asc }) => asc(q.orderIndex),
    }),
    db.query.candidateResponses.findMany({
      where: eq(schema.candidateResponses.interviewId, interview.id),
    }),
  ]);

  return { shareLink, interview, questions, responses };
}

/** First question that doesn't yet have an accepted response — used to resume. */
export function nextUnansweredQuestion(
  questions: InterviewQuestion[],
  responses: CandidateResponse[],
): InterviewQuestion | null {
  const acceptedQ = new Set(responses.filter((r) => r.accepted).map((r) => r.questionId));
  return questions.find((q) => !acceptedQ.has(q.id)) ?? null;
}
