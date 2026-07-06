// Single source of truth for the display name (BenchandBar.Travel brand,
// direction "Sky & Sun"). The wordmark renders as BENCH&BAR with a sun `&`.
export const APP_NAME = "Bench & Bar";

// Brand tagline (Sky & Sun handoff).
export const TAGLINE = "Hotels. Ranked by the best bars and gyms.";

// Display typeface for the wordmark/headlines (loaded in app/_layout.tsx).
// Archivo 800 per the brand spec; body copy stays on the system font.
export const BRAND_FONT = "Archivo-ExtraBold";

// ---- Feature flags (Section 8) ---------------------------------------------
// All three ship ON for MVP, but stay behind flags so they can be toggled.

// DECISION: RATINGS_MODE = "three" — gym + bar + overall, all required on the
// fast path. ("overall-only" would be a future simplification lever.)
export const RATINGS_MODE: "three" | "overall-only" = "three";

// DECISION: ENABLE_TAGS — quick-tag toggles inside "Add details", optional/skippable.
export const ENABLE_TAGS = true;

// DECISION: ENABLE_PHOTOS — gym/bar photos inside "Add photos", optional/skippable.
export const ENABLE_PHOTOS = true;

// ---- Rating + media limits --------------------------------------------------
export const MAX_RATING = 5;
export const MAX_PHOTOS_PER_REVIEW = 3;

// Client-side image compression target before upload (Section 8.2).
export const PHOTO_MAX_WIDTH = 1080;
export const PHOTO_COMPRESS_QUALITY = 0.7;

// Supabase Storage bucket for review photos (public read).
export const REVIEW_PHOTOS_BUCKET = "review-photos";

// ---- Rating iconography -----------------------------------------------------
// The two signature scores. Overall uses a star.
export const ICONS = {
  gym: "🏋️", // barbell
  bar: "🍸", // martini
  overall: "⭐",
} as const;
