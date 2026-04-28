CREATE TYPE "public"."interview_status" AS ENUM('draft', 'sent', 'in_progress', 'submitted', 'transcribing', 'scoring', 'scored', 'sent_to_client', 'expired');--> statement-breakpoint
CREATE TYPE "public"."job_profile_source" AS ENUM('paste', 'docx', 'pdf', 'zoho');--> statement-breakpoint
CREATE TYPE "public"."question_category" AS ENUM('behavioral', 'technical', 'situational', 'motivation_fit', 'custom');--> statement-breakpoint
CREATE TYPE "public"."recommendation" AS ENUM('advance', 'hold', 'pass');--> statement-breakpoint
CREATE TYPE "public"."share_link_kind" AS ENUM('candidate', 'client_report');--> statement-breakpoint
CREATE TYPE "public"."usage_event_type" AS ENUM('ai_tokens', 'transcription_seconds', 'video_storage_bytes');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'recruiter', 'client');--> statement-breakpoint
CREATE TABLE "candidate_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"video_key" text,
	"video_url" text,
	"duration_seconds" integer,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	"transcript" jsonb,
	"recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"author_user_id" uuid,
	"author_name" text,
	"body" text NOT NULL,
	"decision" "recommendation",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"consent_version" text DEFAULT 'v1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fit_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"model" text NOT NULL,
	"overall_score" numeric(3, 1) NOT NULL,
	"score_rationale" text,
	"competency_scores" jsonb NOT NULL,
	"strengths" jsonb NOT NULL,
	"weaknesses" jsonb NOT NULL,
	"risk_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_next_step" "recommendation" NOT NULL,
	"headline_summary" text NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"cost_usd_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"text" text NOT NULL,
	"category" "question_category" NOT NULL,
	"time_limit_seconds" integer DEFAULT 90 NOT NULL,
	"retry_allowed" integer DEFAULT 1 NOT NULL,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"job_profile_id" uuid NOT NULL,
	"candidate_name" text NOT NULL,
	"candidate_email" text NOT NULL,
	"status" "interview_status" DEFAULT 'draft' NOT NULL,
	"locked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"title" text NOT NULL,
	"level" text,
	"responsibilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nice_to_haves" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"role_context" text,
	"success_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_input" text,
	"source" "job_profile_source" DEFAULT 'paste' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"monthly_token_budget" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"kind" "share_link_kind" NOT NULL,
	"interview_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"interview_id" uuid,
	"event_type" "usage_event_type" NOT NULL,
	"model" text,
	"units" numeric(18, 4) NOT NULL,
	"cost_usd_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"clerk_user_id" text,
	"email" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'recruiter' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_responses" ADD CONSTRAINT "candidate_responses_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_responses" ADD CONSTRAINT "candidate_responses_question_id_interview_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."interview_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fit_analyses" ADD CONSTRAINT "fit_analyses_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_job_profile_id_job_profiles_id_fk" FOREIGN KEY ("job_profile_id") REFERENCES "public"."job_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_profiles" ADD CONSTRAINT "job_profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_profiles" ADD CONSTRAINT "job_profiles_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_responses_interview_idx" ON "candidate_responses" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "candidate_responses_question_idx" ON "candidate_responses" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_responses_accepted_per_question" ON "candidate_responses" USING btree ("question_id") WHERE "candidate_responses"."accepted" = true;--> statement-breakpoint
CREATE INDEX "comments_interview_idx" ON "comments" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "consent_logs_interview_idx" ON "consent_logs" USING btree ("interview_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fit_analyses_interview_idx" ON "fit_analyses" USING btree ("interview_id");--> statement-breakpoint
CREATE UNIQUE INDEX "interview_questions_interview_order_idx" ON "interview_questions" USING btree ("interview_id","order_index");--> statement-breakpoint
CREATE INDEX "interviews_org_idx" ON "interviews" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "interviews_status_idx" ON "interviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "interviews_candidate_email_idx" ON "interviews" USING btree ("candidate_email");--> statement-breakpoint
CREATE INDEX "job_profiles_org_idx" ON "job_profiles" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_token_idx" ON "share_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "share_links_interview_kind_idx" ON "share_links" USING btree ("interview_id","kind");--> statement-breakpoint
CREATE INDEX "usage_events_org_created_idx" ON "usage_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_events_type_idx" ON "usage_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("org_id");