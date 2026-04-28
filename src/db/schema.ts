import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------

export const userRoleEnum = pgEnum("user_role", ["admin", "recruiter", "client"]);

export const jobProfileSourceEnum = pgEnum("job_profile_source", [
  "paste",
  "docx",
  "pdf",
  "zoho",
]);

export const interviewStatusEnum = pgEnum("interview_status", [
  "draft",
  "sent",
  "in_progress",
  "submitted",
  "transcribing",
  "scoring",
  "scored",
  "sent_to_client",
  "expired",
]);

export const questionCategoryEnum = pgEnum("question_category", [
  "behavioral",
  "technical",
  "situational",
  "motivation_fit",
  "custom",
]);

export const recommendationEnum = pgEnum("recommendation", ["advance", "hold", "pass"]);

export const shareLinkKindEnum = pgEnum("share_link_kind", [
  "candidate",
  "client_report",
]);

export const usageEventTypeEnum = pgEnum("usage_event_type", [
  "ai_tokens",
  "transcription_seconds",
  "video_storage_bytes",
]);

// ---------- Tables ----------

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  monthlyTokenBudget: integer("monthly_token_budget"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex("organizations_slug_idx").on(t.slug),
}));

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id"),
  email: text("email").notNull(),
  name: text("name"),
  role: userRoleEnum("role").notNull().default("recruiter"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
  clerkIdx: uniqueIndex("users_clerk_user_id_idx").on(t.clerkUserId),
  orgIdx: index("users_org_idx").on(t.orgId),
}));

export const jobProfiles = pgTable("job_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  level: text("level"),
  responsibilities: jsonb("responsibilities").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  requiredSkills: jsonb("required_skills").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  niceToHaves: jsonb("nice_to_haves").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  roleContext: text("role_context"),
  successCriteria: jsonb("success_criteria").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  rawInput: text("raw_input"),
  source: jobProfileSourceEnum("source").notNull().default("paste"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgIdx: index("job_profiles_org_idx").on(t.orgId),
}));

export const interviews = pgTable("interviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  jobProfileId: uuid("job_profile_id").notNull().references(() => jobProfiles.id, { onDelete: "restrict" }),
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email").notNull(),
  status: interviewStatusEnum("status").notNull().default("draft"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgIdx: index("interviews_org_idx").on(t.orgId),
  statusIdx: index("interviews_status_idx").on(t.status),
  candidateEmailIdx: index("interviews_candidate_email_idx").on(t.candidateEmail),
}));

export const interviewQuestions = pgTable("interview_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  interviewId: uuid("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(),
  text: text("text").notNull(),
  category: questionCategoryEnum("category").notNull(),
  timeLimitSeconds: integer("time_limit_seconds").notNull().default(90),
  retryAllowed: integer("retry_allowed").notNull().default(1),
  rationale: text("rationale"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  interviewOrderIdx: uniqueIndex("interview_questions_interview_order_idx").on(t.interviewId, t.orderIndex),
}));

export const candidateResponses = pgTable("candidate_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  interviewId: uuid("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  questionId: uuid("question_id").notNull().references(() => interviewQuestions.id, { onDelete: "cascade" }),
  videoKey: text("video_key"),
  videoUrl: text("video_url"),
  durationSeconds: integer("duration_seconds"),
  attemptNumber: integer("attempt_number").notNull().default(1),
  accepted: boolean("accepted").notNull().default(false),
  transcript: jsonb("transcript").$type<TranscriptDocument | null>(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  interviewIdx: index("candidate_responses_interview_idx").on(t.interviewId),
  questionIdx: index("candidate_responses_question_idx").on(t.questionId),
  acceptedPerQuestion: uniqueIndex("candidate_responses_accepted_per_question")
    .on(t.questionId)
    .where(sql`${t.accepted} = true`),
}));

export type TranscriptSegment = {
  startMs: number;
  endMs: number;
  text: string;
  confidence: number;
};

export type TranscriptDocument = {
  language: string;
  fullText: string;
  segments: TranscriptSegment[];
};

export const fitAnalyses = pgTable("fit_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  interviewId: uuid("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  overallScore: numeric("overall_score", { precision: 3, scale: 1 }).notNull(),
  scoreRationale: text("score_rationale"),
  competencyScores: jsonb("competency_scores").$type<CompetencyScore[]>().notNull(),
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  weaknesses: jsonb("weaknesses").$type<string[]>().notNull(),
  riskFlags: jsonb("risk_flags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  recommendedNextStep: recommendationEnum("recommended_next_step").notNull(),
  headlineSummary: text("headline_summary").notNull(),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  costUsdCents: integer("cost_usd_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  interviewIdx: uniqueIndex("fit_analyses_interview_idx").on(t.interviewId),
}));

export type CompetencyScore = {
  name: string;
  score: number;
  evidence: string;
};

export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull(),
  kind: shareLinkKindEnum("kind").notNull(),
  interviewId: uuid("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tokenIdx: uniqueIndex("share_links_token_idx").on(t.token),
  interviewKindIdx: index("share_links_interview_kind_idx").on(t.interviewId, t.kind),
}));

export const consentLogs = pgTable("consent_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  interviewId: uuid("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  consentVersion: text("consent_version").notNull().default("v1"),
}, (t) => ({
  interviewIdx: index("consent_logs_interview_idx").on(t.interviewId),
}));

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  interviewId: uuid("interview_id").notNull().references(() => interviews.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name"),
  body: text("body").notNull(),
  decision: recommendationEnum("decision"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  interviewIdx: index("comments_interview_idx").on(t.interviewId),
}));

export const usageEvents = pgTable("usage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  interviewId: uuid("interview_id").references(() => interviews.id, { onDelete: "set null" }),
  eventType: usageEventTypeEnum("event_type").notNull(),
  model: text("model"),
  units: numeric("units", { precision: 18, scale: 4 }).notNull(),
  costUsdCents: integer("cost_usd_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgCreatedIdx: index("usage_events_org_created_idx").on(t.orgId, t.createdAt),
  typeIdx: index("usage_events_type_idx").on(t.eventType),
}));

// ---------- Inferred types ----------

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type JobProfile = typeof jobProfiles.$inferSelect;
export type Interview = typeof interviews.$inferSelect;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;
export type CandidateResponse = typeof candidateResponses.$inferSelect;
export type FitAnalysis = typeof fitAnalyses.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
export type ConsentLog = typeof consentLogs.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type UsageEvent = typeof usageEvents.$inferSelect;
