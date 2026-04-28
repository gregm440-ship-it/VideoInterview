# Outsorcy Video Interview

AI-augmented async video interview tool. Generates role-specific questions, captures candidate video responses on a unique link, transcribes them, scores fit against the job profile, and produces a branded report for the hiring client.

See [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) for the full product spec and phased build plan.

## Stack (Phase 1)

- Next.js 15 (App Router) · TypeScript · Tailwind
- Postgres (Neon) + Drizzle ORM
- Cloudflare R2 for video storage
- Clerk (recruiter/client auth) + jose (candidate JWTs)
- Anthropic Claude API (Opus for analysis, Haiku for question generation) with prompt caching
- Deepgram for transcription
- BullMQ + Upstash Redis for background jobs
- Resend for transactional email

## Local development

```bash
pnpm install
cp .env.example .env.local   # then fill in keys
pnpm dev
```

Open http://localhost:3000.

## Scripts

- `pnpm dev` — start the Next.js dev server
- `pnpm build` — production build
- `pnpm typecheck` — TypeScript only, no emit
- `pnpm lint` — ESLint

## Layout

```
app/             Next.js routes (recruiter, candidate, client report)
src/components/  UI components, including brand shell
src/lib/         Service adapters (Anthropic, Deepgram, R2, etc.)
src/db/          Drizzle schema + client
src/jobs/        BullMQ workers
docs/            Product requirements
```
