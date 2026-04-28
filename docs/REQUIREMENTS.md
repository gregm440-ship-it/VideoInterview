# Outsorcy Video Interview Tool — Build Requirements

**Owner:** Greg
**Audience:** Claude Code (build agent)
**Version:** 0.1 (draft for iteration)
**Strategic context:** This tool is part of Outsorcy's AI-augmented delivery layer. It must reduce recruiter screening time, raise submission quality, and produce a client-facing artifact (video + scored report) that justifies premium positioning over price-based offshore competitors.

---

## 1. Outcomes (what this tool must produce)

1. **Recruiter outcome:** Move from "screen 30 candidates manually" → "review 5 AI-scored video interviews." Target: 70%+ reduction in screening time per role.
2. **Client outcome:** Receive a branded, scored, watchable interview package per submitted candidate — not just a resume. This is the primary differentiation artifact.
3. **Candidate outcome:** Complete a self-paced video interview in <20 minutes, on any device, without scheduling friction.
4. **Brand outcome:** Every artifact (interview window, report, share link) is unmistakably Outsorcy — dark navy palette, accent color, logo, professional typography.

---

## 2. User Roles

| Role | What they do | Auth |
|---|---|---|
| **Recruiter / Outsorcy Operator** | Creates interview from job profile, reviews AI-generated questions, sends invites, reviews scored reports | Account login |
| **Candidate** | Receives unique link, completes video interview | Token-based, no login |
| **Client Hiring Manager** | Views completed interview + report via shared link | Token-based or light account |
| **Admin** | Manages users, branding, retention policies | Account login + role |

---

## 3. Functional Requirements

### 3.1 Job Profile Ingestion
- Accept job profile via three input methods:
  - Paste structured text
  - Upload `.docx` or `.pdf`
  - Pull from internal source (V2 — leave hook for Zoho CRM integration)
- Parse into structured fields: `title`, `level`, `responsibilities[]`, `required_skills[]`, `nice_to_haves[]`, `role_context`, `success_criteria[]`
- Display parsed structure for recruiter to confirm/edit before generating questions
- Store as canonical `JobProfile` record linked to the interview

### 3.2 AI Question Generation
- Generate **5–8 questions** per interview using Claude API (model: claude-opus-4-7 for quality, claude-haiku-4-5 for cost-tier option)
- Question mix must include:
  - 1–2 **behavioral** (past experience, STAR-friendly)
  - 1–2 **role-specific / technical** (tied to required skills)
  - 1–2 **situational** (hypothetical scenarios from role context)
  - 1 **motivation/fit** (why this role, why remote, why Outsorcy-style)
- Each question record includes: `text`, `category`, `time_limit_seconds` (default 90, max 180), `retry_allowed` (default 1), `rationale` (why this question — visible to recruiter only)
- Recruiter can: edit question text, delete, reorder, add custom question, regenerate single question, regenerate full set
- Lock state: once invite is sent, questions are frozen for that candidate

### 3.3 Candidate Invitation
- Generate unique signed token URL per candidate (e.g., `interview.outsorcy.com/i/{token}`)
- Token expires after configurable window (default 7 days)
- Send via email (transactional — Postmark or Resend) with Outsorcy-branded template
- Email includes: candidate name, role title, expected duration, device requirements, privacy/consent notice
- Optional resend / extend expiry from recruiter view

### 3.4 Pre-Interview Flow (candidate-side)
- Landing page with: role title, Outsorcy branding, what to expect, estimated duration
- **Consent screen** — explicit opt-in for video recording, transcription, and sharing with hiring client. Required before proceeding. Log consent timestamp + IP.
- **Device check:** camera permission, mic permission, mic level test, network speed estimate, browser compatibility check
- **Practice question** (1 throwaway) — not stored, lets candidate confirm their setup works
- Mobile responsive — assume 30%+ of candidates use phone

### 3.5 Interview Window (Outsorcy-Branded)
- Layout (desktop):
  - Outsorcy logo top-left
  - Question text displayed prominently (visible throughout recording)
  - Webcam self-preview top-right (smaller)
  - Timer countdown for current question
  - Progress indicator (e.g., "Question 3 of 6")
  - Big primary action button (Record / Stop / Next)
- Per-question flow:
  1. Question displayed with 30-second "prepare" timer (skippable)
  2. Candidate clicks Record → webcam captures
  3. Timer counts down to `time_limit_seconds`
  4. Candidate clicks Stop or auto-stops at limit
  5. Option to re-record (if `retry_allowed > 0`) or accept and move on
  6. Last accepted take is the submission
- Recording:
  - Use `MediaRecorder` API (WebM/VP9 with Opus audio)
  - Chunked upload during recording (resilient to slow connections — Kosovo bandwidth varies)
  - Final clip stored to S3-compatible object store (or Mux/Cloudflare Stream for managed playback)
- Confirmation screen on completion: "Thank you. Your interview has been submitted to [Client] via Outsorcy."

### 3.6 Transcription
- Trigger: video upload completes
- Service: Deepgram or AssemblyAI (preferred — faster + speaker diarization), Whisper API as fallback
- Per-question transcript stored with timestamps
- Full interview transcript = concatenation with question headers
- Store transcript as structured JSON (segments with `start_ms`, `end_ms`, `text`, `confidence`)

### 3.7 AI Fit Analysis
- Input: `JobProfile` + all transcripts + question metadata
- Output (Claude API call, structured JSON):
  ```json
  {
    "overall_score": 7.5,
    "score_rationale": "...",
    "competency_scores": [
      {"name": "Technical depth", "score": 8, "evidence": "..."},
      {"name": "Communication", "score": 7, "evidence": "..."},
      {"name": "Role fit", "score": 7, "evidence": "..."}
    ],
    "strengths": ["bullet 1", "bullet 2", "bullet 3"],
    "weaknesses": ["bullet 1", "bullet 2"],
    "risk_flags": ["..."],
    "recommended_next_step": "Advance to client interview | Hold | Pass",
    "headline_summary": "2-sentence summary for top of report"
  }
  ```
- Score scale: **1–10, where 10 is best.** Rubric anchored:
  - 9–10: Exceptional, advance immediately
  - 7–8: Strong fit, recommend
  - 5–6: Mixed, conditional
  - 3–4: Weak fit, likely pass
  - 1–2: Not a fit
- Rubric must be visible in the report (not a black box).
- Show competency scores as a small inline visual (bar or radial) — keep it scannable.

### 3.8 Hiring Manager Report
- Generated immediately after fit analysis completes
- Delivered via:
  - Shareable web link (token-based, Outsorcy-branded page)
  - Optional PDF export (V2)
- Report contents (in order):
  1. **Header:** Candidate name, role, date, overall score (large, prominent)
  2. **Headline summary** (2 sentences)
  3. **Strengths** (3 bullets max)
  4. **Weaknesses / gaps** (2–3 bullets)
  5. **Competency scores** (visual)
  6. **Watch the interview** — embedded player with question chapter markers (jump to Q1, Q2, etc.)
  7. **Full transcript** (collapsible, per question)
  8. **Recommended next step**
  9. **Outsorcy footer** with CTA to discuss candidate
- Hiring manager can: leave a comment, mark "Advance / Hold / Pass," share link with their team

### 3.9 Recruiter Dashboard
- List view of all interviews: candidate, role, status (Sent / In progress / Submitted / Scored / Sent to client), score, date
- Filters: by role, status, score range
- Per-role view: side-by-side candidate comparison (score, top strength, top weakness, watch button)
- Action: "Send report to client" — generates and emails the shareable link

---

## 4. Technical Architecture

### 4.1 Stack (recommended)
- **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind. Use shadcn/ui for components.
- **Backend:** Next.js API routes for thin layer; Node.js worker process for transcription + AI analysis jobs (BullMQ + Redis queue)
- **Database:** Postgres (Supabase or Neon for speed of build)
- **Object storage:** Cloudflare R2 or AWS S3 for raw video; consider Mux for managed playback + chapter markers
- **Auth:** Clerk or Auth.js for recruiter/client accounts; signed JWTs for candidate tokens
- **AI:** Anthropic Claude API (`claude-opus-4-7` for analysis quality; `claude-haiku-4-5` for cheap question generation if cost is tight)
- **Transcription:** Deepgram (recommended) or AssemblyAI
- **Email:** Resend or Postmark
- **Hosting:** Vercel (frontend) + Railway/Fly (worker)

### 4.2 Data Model (core tables)
- `users` — recruiter, client, admin accounts
- `organizations` — multi-tenant if Outsorcy wants to white-label later
- `job_profiles` — parsed structured profile
- `interviews` — links profile + candidate + status
- `interview_questions` — questions per interview (frozen on send)
- `candidate_responses` — video URL, transcript JSON, per-question
- `fit_analyses` — AI analysis output JSON
- `share_links` — tokenized URLs for candidates and clients with expiry
- `consent_logs` — audit trail
- `comments` — hiring manager notes on reports

### 4.3 Key API Endpoints (sketch)
- `POST /api/job-profiles` — ingest + parse
- `POST /api/interviews` — create from profile, generate questions
- `PATCH /api/interviews/:id/questions` — recruiter edits
- `POST /api/interviews/:id/send` — generate token, email candidate
- `GET /api/i/:token` — candidate-side interview load
- `POST /api/i/:token/responses` — chunked video upload
- `POST /api/interviews/:id/finalize` — triggers transcription + analysis pipeline
- `GET /api/reports/:token` — client-side report view

---

## 5. Branding & UX Requirements

- **Color palette:** Dark navy primary (`#0A1628` or Outsorcy's existing hex), accent color (TBD — confirm with brand), white/off-white backgrounds for readability sections
- **Typography:** Match outsorcy.com — clean sans-serif for body, slightly heavier weight for headers
- **Logo:** Top-left on every page, candidate-facing pages especially
- **Tone in copy:** Professional, direct, confident. No corporate fluff. Match Outsorcy's "outcomes over price" positioning — every touchpoint should feel premium.
- **Empty states / errors:** Branded, helpful, never default browser styling
- **Footer:** "Powered by Outsorcy" on candidate and client pages — this is a marketing surface, not just a tool

---

## 6. Non-Functional Requirements

- **Privacy & compliance:**
  - GDPR-compliant (candidates often EU-based)
  - Explicit consent capture before recording
  - Data retention: video deleted after 90 days unless flagged; transcripts retained 1 year (configurable)
  - Right-to-deletion endpoint for candidates
- **Performance:**
  - Interview page load < 2s on 4G
  - Video upload resilient to dropped connections (chunked, resumable)
  - Transcription + analysis pipeline target: < 5 min from submission to report-ready
- **Reliability:**
  - Auto-save candidate progress between questions (don't lose recordings on browser crash)
  - Retry logic on all external API calls (transcription, AI)
- **Security:**
  - All tokens signed and expiring
  - S3 URLs presigned, short-lived
  - Rate limit candidate endpoints
- **Accessibility:**
  - WCAG 2.1 AA target
  - Captions on candidate-facing instructional content
  - Keyboard navigable

---

## 7. Build Phases

### Phase 1 — MVP (target: shippable in 2–3 weeks of focused build)
- Job profile paste-in → AI question generation
- Candidate token URL → branded interview window → record + upload
- Transcription pipeline
- Basic AI fit analysis with score + bullets
- Single shareable client report page (web only)
- Recruiter dashboard (list view)

### Phase 2 — Polish & Scale
- PDF report export
- Side-by-side candidate comparison
- Hiring manager comments + Advance/Hold/Pass
- Branded email templates (transactional + report delivery)
- Mobile UX hardening

### Phase 3 — Integrations & Leverage
- Zoho CRM sync (job profile pull, candidate push)
- ATS webhooks
- White-label option for enterprise clients
- Custom rubrics per client / per role family

### Phase 4 — Differentiation
- Multi-language interview support (Albanian, Spanish for LATAM expansion)
- Live AI-flagged "moments worth watching" in the video
- Bias auditing on AI scoring
- Client-side custom question banks

---

## 8. Out of Scope (V1)

- Live two-way video interviews (this is async only — that's the point)
- Coding assessments / live whiteboarding
- Calendar scheduling
- Background checks
- Reference checks
- Offer letter generation

---

## 9. Open Decisions Needed Before Build

1. **Video storage:** Self-host (R2 + custom player) vs. managed (Mux). Mux is faster to ship and has chapter markers built-in, but ~$1/hr of video stored. Decide based on volume forecast.
2. **Transcription provider:** Deepgram vs. AssemblyAI vs. Whisper. Deepgram is fastest and cheapest at scale; AssemblyAI has better speaker labels. Pick one for MVP.
3. **Auth provider:** Clerk (fastest) vs. Auth.js (more control, free).
4. **Domain strategy:** `interview.outsorcy.com` for candidates, `clients.outsorcy.com` for hiring managers, or single domain with path routing.
5. **Pricing model for clients:** Per-interview, per-role, per-seat, or bundled into placement fee. This affects whether usage tracking needs to be a first-class feature.
6. **AI cost guardrails:** Set per-org token budgets? Default model tier?
7. **Brand assets:** Need final logo SVG, color hex codes, font files, and any existing Outsorcy design system tokens before UI build starts.

---

## 10. Success Metrics (post-launch)

- Time-to-first-client-report from interview submission: **< 10 minutes** (P50)
- Recruiter screening time per role: **70% reduction** vs. baseline
- Candidate completion rate (started → submitted): **> 80%**
- Hiring manager report open rate: **> 90%**
- Client-reported quality of pre-screen: tracked qualitatively, target net-positive
- Submission-to-interview-request conversion (does the report drive client interviews?): **> 60%** — this is the differentiation metric

---

## How to use this doc with Claude Code

1. Drop this file into the repo as `docs/REQUIREMENTS.md`
2. Start with: *"Read docs/REQUIREMENTS.md and propose a Phase 1 build plan with file structure, task breakdown, and the first 5 tickets to implement."*
3. Iterate phase-by-phase. Don't let it build everything at once.
4. Keep this doc as the source of truth — update it as decisions are made (especially Section 9).
