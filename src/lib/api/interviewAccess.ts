import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { conflict, notFound } from "./errors";
import type { Interview, JobProfile, InterviewQuestion } from "@/db/schema";

export async function getInterviewForOrg(
  interviewId: string,
  orgId: string,
): Promise<{ interview: Interview; profile: JobProfile; questions: InterviewQuestion[] }> {
  const interview = await db.query.interviews.findFirst({
    where: and(eq(schema.interviews.id, interviewId), eq(schema.interviews.orgId, orgId)),
  });
  if (!interview) notFound("Interview not found.");

  const [profile, questions] = await Promise.all([
    db.query.jobProfiles.findFirst({ where: eq(schema.jobProfiles.id, interview.jobProfileId) }),
    db.query.interviewQuestions.findMany({
      where: eq(schema.interviewQuestions.interviewId, interview.id),
      orderBy: (q, { asc }) => asc(q.orderIndex),
    }),
  ]);
  if (!profile) notFound("Job profile not found.");

  return { interview, profile, questions };
}

export function assertEditable(interview: Interview): void {
  if (interview.lockedAt) {
    conflict("Interview is locked — questions cannot be edited after the invite is sent.");
  }
}
