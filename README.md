# Rep & Sip

A hotel app for business travelers that rates hotels on the two things that
actually matter on the road:

- 🏋️ **Gym** quality (1–5 barbells)
- 🍸 **Bar** quality (1–5 martini glasses)
- ⭐ an **Overall** score, plus an optional note

**Core job:** _"Find me a hotel near [place] with a good gym and a good bar."_

> Display name lives in one constant — `APP_NAME` in `lib/constants.ts` — so it
> can be swapped to "Rep, Sip, Trip" with a single edit.

## Stack

| Layer | Choice |
| --- | --- |
| Mobile | Expo (React Native) + TypeScript + Expo Router |
| Backend / DB / Auth / Storage | Supabase (Postgres, Auth, Storage, RLS) |
| Hotel data | Google Places API |
| Maps | react-native-maps (Google provider) |
| Data fetching | TanStack Query + Supabase JS |
| Auth | Apple, Google, email magic-link, + Continue as guest |

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your keys
npm run start          # press i / a for iOS / Android
```

Sign in with Apple/Google needs a development build (not Expo Go). The schema,
RLS, triggers, and Storage bucket live in `supabase/schema.sql` — run it once in
the Supabase SQL editor on a fresh project.

## Project layout

```
app/            Expo Router routes
  (tabs)/       Search · Add (center) · My Log · Profile
  sign-in.tsx   Apple / Google / magic-link / guest
components/     Reusable UI (Button, Screen, Placeholder, …)
hooks/          useAuth (app-wide auth state)
lib/            supabase client, constants, theme, types, query client
supabase/       schema.sql (tables + RLS + triggers + storage)
```

## Build phases

- **Phase 0 — Foundation** ✅ project, env wiring, schema/RLS, auth, tabs.
- **Phase 1 — Hotels & Search** ✅ Google Places, search + map, hotel detail.
- **Phase 2 — Reviews & Travel Log** ✅ rating flow, My Log, aggregates, photos/tags.
- **Phase 3 — Advanced filters & search** ✅ filter by gym/bar/overall score,
  must-have tags, price tier, and distance; sort by nearest/best gym/best
  bar/best overall/most reviewed.
- **Phase 3 — Travel preferences & Check Prices** ✅ profile brand preferences
  (airline/hotel/cruise) + hotel-brand search; date-range price check with
  affiliate booking hand-off.
- **Phase 3 — Social** ✅ follow travelers, a feed of their reviews, public
  profiles, and "people you follow rated this" on hotel detail.

## Non-negotiable UX rules

1. Rating a hotel takes under 30 seconds and ≤ 3 taps.
2. Ratings are a tappable row of icons — no typing required.
3. Notes are always optional.
4. Anyone can search and read without an account; an account is only needed to post.
5. One screen = one job. Big thumb-reachable targets, no nested menus.
6. Default search = "near me." Every result shows both scores at a glance.
7. Fast loads, optimistic UI, minimal chrome.
