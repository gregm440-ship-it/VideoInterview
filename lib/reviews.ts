import { supabase } from "./supabase";
import { upsertHotel } from "./hotels";
import { uploadReviewPhoto, type PendingPhoto } from "./photos";
import type { PlaceResult } from "./places";
import type {
  Hotel,
  PhotoType,
  Profile,
  Review,
  ReviewPhoto,
  TagType,
} from "./database.types";

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Please sign in to do that.");
  return data.user.id;
}

// ---- Submit / save ---------------------------------------------------------

export interface ReviewTagInput {
  key: string;
  type: TagType;
}

export interface SubmitReviewInput {
  place: PlaceResult;
  gymRating: number;
  barRating: number;
  overallRating: number;
  note?: string;
  isPrivate: boolean;
  tags?: ReviewTagInput[];
  photos?: PendingPhoto[];
}

/**
 * Write one review (insert or update the user's existing row for this hotel),
 * plus any tags/photos. The aggregate trigger recomputes scores automatically.
 */
export async function submitReview(input: SubmitReviewInput): Promise<Review> {
  const userId = await requireUserId();
  const hotel = await upsertHotel(input.place);

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", userId)
    .eq("hotel_id", hotel.id)
    .maybeSingle();

  const payload = {
    user_id: userId,
    hotel_id: hotel.id,
    gym_rating: input.gymRating,
    bar_rating: input.barRating,
    overall_rating: input.overallRating,
    note: input.note?.trim() || null,
    is_private_log: input.isPrivate,
  };

  let review: Review;
  if (existing) {
    const { data, error } = await supabase
      .from("reviews")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    review = data as Review;
    // Clean slate for tags on edit (photos are additive).
    await supabase.from("review_tags").delete().eq("review_id", review.id);
  } else {
    const { data, error } = await supabase
      .from("reviews")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    review = data as Review;
  }

  if (input.tags?.length) {
    const rows = input.tags.map((t) => ({
      review_id: review.id,
      tag_key: t.key,
      tag_type: t.type,
    }));
    const { error } = await supabase.from("review_tags").insert(rows);
    if (error) throw error;
  }

  if (input.photos?.length) {
    const urls = await Promise.all(
      input.photos.map((p, i) => uploadReviewPhoto(userId, review.id, p, i))
    );
    const rows = urls.map((url, i) => ({
      review_id: review.id,
      hotel_id: hotel.id,
      url,
      type: input.photos![i].type,
    }));
    const { error } = await supabase.from("review_photos").insert(rows);
    if (error) throw error;
  }

  return review;
}

/** "Add to my log": save a hotel privately without rating it yet (Section 5.4). */
export async function saveToLog(place: PlaceResult): Promise<void> {
  const userId = await requireUserId();
  const hotel = await upsertHotel(place);
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", userId)
    .eq("hotel_id", hotel.id)
    .maybeSingle();
  if (existing) return; // already logged or rated
  const { error } = await supabase
    .from("reviews")
    .insert({ user_id: userId, hotel_id: hotel.id, is_private_log: true });
  if (error) throw error;
}

/** The signed-in user's existing review for a place, for prefill (or null). */
export async function getMyReviewForPlace(placeId: string): Promise<Review | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("reviews")
    .select("*, hotels!inner(google_place_id)")
    .eq("user_id", user.id)
    .eq("hotels.google_place_id", placeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { hotels: _omit, ...review } = data as Review & { hotels: unknown };
  return review as Review;
}

// ---- My Log ----------------------------------------------------------------

export interface LogEntry {
  review: Review;
  hotel: Hotel;
}

export async function getMyLog(): Promise<LogEntry[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("reviews")
    .select("*, hotels(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data as (Review & { hotels: Hotel })[]) ?? []).map((row) => {
    const { hotels, ...review } = row;
    return { review: review as Review, hotel: hotels };
  });
}

// ---- Community reviews on hotel detail -------------------------------------

export interface CommunityReview {
  id: string;
  gym_rating: number | null;
  bar_rating: number | null;
  overall_rating: number | null;
  note: string | null;
  created_at: string;
  author: Pick<Profile, "display_name" | "avatar_url"> | null;
  tags: { tag_key: string; tag_type: TagType }[];
  photos: ReviewPhoto[];
  helpfulCount: number;
  votedByMe: boolean;
}

export async function getHotelReviews(hotelId: string): Promise<CommunityReview[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, gym_rating, bar_rating, overall_rating, note, created_at, " +
        "profiles(display_name, avatar_url), " +
        "review_tags(tag_key, tag_type), " +
        "review_photos(*), " +
        "helpful_votes(user_id)"
    )
    .eq("hotel_id", hotelId)
    .eq("is_private_log", false)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });
  if (error) throw error;

  type Row = {
    id: string;
    gym_rating: number | null;
    bar_rating: number | null;
    overall_rating: number | null;
    note: string | null;
    created_at: string;
    profiles: Pick<Profile, "display_name" | "avatar_url"> | null;
    review_tags: { tag_key: string; tag_type: TagType }[] | null;
    review_photos: ReviewPhoto[] | null;
    helpful_votes: { user_id: string }[] | null;
  };

  return ((data as unknown as Row[]) ?? []).map((r) => ({
    id: r.id,
    gym_rating: r.gym_rating,
    bar_rating: r.bar_rating,
    overall_rating: r.overall_rating,
    note: r.note,
    created_at: r.created_at,
    author: r.profiles,
    tags: r.review_tags ?? [],
    photos: (r.review_photos ?? []).filter((p) => !p.is_hidden),
    helpfulCount: r.helpful_votes?.length ?? 0,
    votedByMe: Boolean(user && r.helpful_votes?.some((v) => v.user_id === user.id)),
  }));
}

// ---- Photo strips + tag summary (Section 8.1 / 8.2) ------------------------

export async function getHotelPhotos(
  hotelId: string
): Promise<{ gym: ReviewPhoto[]; bar: ReviewPhoto[] }> {
  const { data, error } = await supabase
    .from("review_photos")
    .select("*, reviews!inner(is_private_log, is_hidden)")
    .eq("hotel_id", hotelId)
    .eq("is_hidden", false)
    .eq("reviews.is_private_log", false)
    .eq("reviews.is_hidden", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const photos = (data as (ReviewPhoto & { reviews: unknown })[]) ?? [];
  return {
    gym: photos.filter((p) => p.type === "gym"),
    bar: photos.filter((p) => p.type === "bar"),
  };
}

export interface TagCount {
  tag_key: string;
  tag_type: TagType;
  count: number;
}

/** Most-applied tags across a hotel's public reviews (top N per type). */
export async function getHotelTagSummary(
  hotelId: string,
  topPerType = 4
): Promise<{ gym: TagCount[]; bar: TagCount[] }> {
  const { data, error } = await supabase
    .from("review_tags")
    .select("tag_key, tag_type, reviews!inner(hotel_id, is_private_log, is_hidden)")
    .eq("reviews.hotel_id", hotelId)
    .eq("reviews.is_private_log", false)
    .eq("reviews.is_hidden", false);
  if (error) throw error;

  const tally = new Map<string, TagCount>();
  ((data as { tag_key: string; tag_type: TagType }[]) ?? []).forEach((t) => {
    const k = `${t.tag_type}:${t.tag_key}`;
    const cur = tally.get(k);
    if (cur) cur.count += 1;
    else tally.set(k, { tag_key: t.tag_key, tag_type: t.tag_type, count: 1 });
  });

  const all = [...tally.values()].sort((a, b) => b.count - a.count);
  return {
    gym: all.filter((t) => t.tag_type === "gym").slice(0, topPerType),
    bar: all.filter((t) => t.tag_type === "bar").slice(0, topPerType),
  };
}

// ---- Helpful + report ------------------------------------------------------

export async function toggleHelpful(reviewId: string): Promise<boolean> {
  const userId = await requireUserId();
  const { data: existing } = await supabase
    .from("helpful_votes")
    .select("id")
    .eq("review_id", reviewId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("helpful_votes").delete().eq("id", existing.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("helpful_votes")
    .insert({ review_id: reviewId, user_id: userId });
  if (error) throw error;
  return true;
}

/** File a report; a DB trigger hides the target pending review (Section 8.2). */
export async function reportContent(opts: {
  reviewId?: string;
  photoId?: string;
  reason?: string;
}): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    review_id: opts.reviewId ?? null,
    photo_id: opts.photoId ?? null,
    reason: opts.reason ?? null,
  });
  if (error) throw error;
}

export type { PendingPhoto, PhotoType };
