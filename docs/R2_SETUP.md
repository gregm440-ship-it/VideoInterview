# Cloudflare R2 — bucket setup

The candidate's browser uploads recordings directly to R2 via a presigned PUT URL. R2 needs a CORS rule on the bucket allowing PUT from the candidate domain — without it the browser pre-flight fails and the upload returns a network error.

## Required env vars

In `.env.local`:

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=outsorcy-interviews-dev
```

The S3 client uses Cloudflare's R2 endpoint with **path-style addressing** (`https://{account_id}.r2.cloudflarestorage.com/{bucket}/{key}`). Virtual-host-style produced TLS handshake failures behind some intercepting proxies.

## CORS rule

Apply this once per bucket (Cloudflare dashboard → R2 → bucket → Settings → CORS Policy, or via Wrangler):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://interview.outsorcy.com"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add additional origins (staging, preview deploys) as they come online.

## Object key layout

Recorded videos are stored under:

```
org/{orgId}/interviews/{interviewId}/q/{questionId}/take-{attemptNumber}-{timestamp}.webm
```

The `take-N` suffix lets us keep all attempts for audit, while a partial unique index on `candidate_responses` enforces that only one response per question is `accepted = true`.

## Lifecycle (Phase 1 retention)

Per `docs/REQUIREMENTS.md` §6: video deleted after 90 days unless flagged. Configure a bucket lifecycle rule expiring objects older than 90 days. Out of scope for T4 — added in a later ticket.
