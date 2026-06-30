# Testing Rep & Sip

Two ways to use the app yourself.

---

## 1. Fastest: Demo mode on your phone (~5 minutes, no accounts)

Demo mode runs the **real app** on realistic local data — no Supabase, no Google
keys, no sign-up. You start signed in as a demo user, so every feature is
unlocked.

**You need:** Node 18+, and the **Expo Go** app on your phone
([App Store](https://apps.apple.com/app/expo-go/id982107779) /
[Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)).
Phone and computer on the same Wi-Fi.

```bash
# in the project folder
npm install
printf "EXPO_PUBLIC_DEMO_MODE=1\n" > .env
npx expo start
```

Then scan the QR code in the terminal:
- **iPhone:** open the Camera app, point at the QR, tap the banner.
- **Android:** open Expo Go → “Scan QR code”.

If the QR won’t connect (corporate/!guest Wi-Fi), run `npx expo start --tunnel`.

### What to try (a 2-minute walkthrough)
1. **Search** — you land on hotels “near you”. Each card shows 🏋️ / 🍸 / ⭐.
2. **Filters** — tap **Filters**: set Gym ≥ 4, add a tag, pick a hotel brand, change sort. Apply.
3. **Rate** — tap the center **＋**, pick a hotel, tap gym / bar / overall (3 taps) → **Submit**. Time yourself.
4. **Check Prices** — on any result card tap **Check Prices**, change the dates, see the price, tap **Book**.
5. **Hotel detail** — open a hotel: big scores, “people you follow rated this”, tags, photo strips, community reviews. Tap a reviewer’s name.
6. **Feed** — bottom tab: reviews from people you follow. Tap **🏆 Leaderboard** → switch Top hotels / Top reviewers and the gym/bar/overall metric.
7. **Profile** — your tier + badges, and your travel-preference brand pickers (start typing “Mar…”).
8. **My Log** — your rated + saved hotels, searchable.

### Demo-mode notes
- **Maps** show a placeholder (real maps need a Google Maps key — see below).
- **Sign in with Apple** needs a native dev build; in demo you’re already signed
  in. Tap Profile → **Sign out** to see the guest (browse-only) experience, then
  any sign-in button signs you back in instantly.
- Nothing is persisted — relaunching resets the demo data.

---

## 2. Full end-to-end (real backend)

When you’re ready to test against real data, auth, and Google Places.

### a) Supabase (database + auth + storage)
1. Create a free project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql)
   (tables, RLS, triggers, the leaderboard function, and the `review-photos` bucket).
3. **Project Settings → API**: copy the **Project URL** and the **anon** key.

### b) Google (hotel data + maps)
1. In [Google Cloud Console](https://console.cloud.google.com), create a project and **enable billing**.
2. Enable **Places API (New)**, **Maps SDK for iOS**, and **Maps SDK for Android**.
3. Create an API key (restrict it to those APIs + your app’s bundle IDs).

### c) Configure `.env`
Copy `.env.example` to `.env`, leave `EXPO_PUBLIC_DEMO_MODE` blank, and fill in:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...
GOOGLE_MAPS_API_KEY=...
```
Optional: Apple/Google OAuth (configure the providers in Supabase Auth) and the
affiliate id (`EXPO_PUBLIC_AFFILIATE_ID`) for real booking commission.

### d) Run it
- **Email magic-link + guest** work in **Expo Go** (`npx expo start`).
- **Sign in with Apple** and **native maps** require a **development build**:
  ```bash
  npx expo install expo-dev-client
  npx eas build --profile development --platform ios   # (needs an Expo account)
  ```
  …then open the build and `npx expo start --dev-client`.

> A brand-new project has **no reviews yet**, so search shows hotels with “No
> ratings yet.” Rate a few to see aggregates, the leaderboard, and badges fill in.

---

## Switching between modes
Just toggle the one line in `.env` and restart Expo (`npx expo start -c` clears the cache):
```
EXPO_PUBLIC_DEMO_MODE=1   # local demo data
EXPO_PUBLIC_DEMO_MODE=    # real Supabase/Google backend
```
