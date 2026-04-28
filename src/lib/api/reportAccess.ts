import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { verifyReportToken } from "@/lib/tokens/candidate";
import { HttpError } from "./errors";
import type {
  Interview,
  ShareLink,
  InterviewQuestion,
  CandidateResponse,
  FitAnalysis,
  JobProfile,
} from "@/db/schema";

export type ReportAccess = {
  shareLink: ShareLink;
  interview: Interview;
  profile: JobProfile;
  questions: InterviewQuestion[];
  responses: CandidateResponse[];
  fitAnalysis: FitAnalysis;
};

export async function resolveReportAccess(token: string): Promise<ReportAccess> {
  const payload = await verifyReportToken(token).catch(() => {
    throw new HttpError(401, "Report link is invalid or expired.");
  });

  const shareLink = await db.query.shareLinks.findFirst({
    where: eq(schema.shareLinks.id, payload.shareLinkId),
  });
  if (!shareLink) throw new HttpError(404, "Report link not found.");
  if (shareLink.revokedAt) throw new HttpError(401, "This link has been revoked.");
  if (shareLink.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, "This link has expired.");
  }
  if (shareLink.kind !== "client_report") {
    throw new HttpError(401, "Wrong link kind for the report surface.");
  }
  if (shareLink.interviewId !== payload.interviewId) {
    throw new HttpError(401, "Token / link mismatch.");
  }

  const interview = await db.query.interviews.findFirst({
    where: eq(schema.interviews.id, shareLink.interviewId),
  });
  if (!interview) throw new HttpError(404, "Interview not found.");

  const [profile, questions, responses, fitAnalysis] = await Promise.all([
    db.query.jobProfiles.findFirst({
      where: eq(schema.jobProfiles.id, interview.jobProfileId),
    }),
    db.query.interviewQuestions.findMany({
      where: eq(schema.interviewQuestions.interviewId, interview.id),
      orderBy: (q, { asc }) => asc(q.orderIndex),
    }),
    db.query.candidateResponses.findMany({
      where: and(
        eq(schema.candidateResponses.interviewId, interview.id),
        eq(schema.candidateResponses.accepted, true),
      ),
    }),
    db.query.fitAnalyses.findFirst({
      where: eq(schema.fitAnalyses.interviewId, interview.id),
    }),
  ]);

  if (!profile) throw new HttpError(404, "Job profile not found.");
  if (!fitAnalysis) throw new HttpError(409, "Report not generated yet.");

  return { shareLink, interview, profile, questions, responses, fitAnalysis };
}
