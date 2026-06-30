import { supabase } from "./supabase";
import type { Hotel, Profile, Review, TagType } from "./database.types";

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in.");
  return user.id;
}

async function currentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ---- Follow graph ----------------------------------------------------------

export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (error) throw error;
  return ((data as { following_id: string }[]) ?? []).map((r) => r.following_id);
}

export async function isFollowing(targetId: string): Promise<boolean> {
  const me = await currentUserId();
  if (!me) return false;
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", me)
    .eq("following_id", targetId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function followUser(targetId: string): Promise<void> {
  const me = await requireUserId();
  if (me === targetId) return;
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: me, following_id: targetId });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function unfollowUser(targetId: string): Promise<void> {
  const me = await requireUserId();
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", me)
    .eq("following_id", targetId);
  if (error) throw error;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  if (followers.error) throw followers.error;
  if (following.error) throw following.error;
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

// ---- Feed ------------------------------------------------------------------

export interface FeedAuthor {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface FeedHotel {
  id: string;
  google_place_id: string;
  name: string;
  city: string | null;
  image_url: string | null;
}

export interface FeedItem {
  id: string;
  gym_rating: number | null;
  bar_rating: number | null;
  overall_rating: number | null;
  note: string | null;
  created_at: string;
  author: FeedAuthor;
  hotel: FeedHotel;
}

/** Recent public reviews from the people the current user follows. */
export async function getFeed(): Promise<FeedItem[]> {
  const me = await requireUserId();
  const ids = await getFollowingIds(me);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, gym_rating, bar_rating, overall_rating, note, created_at, user_id, " +
        "profiles(display_name, avatar_url), " +
        "hotels(id, google_place_id, name, city, image_url)"
    )
    .in("user_id", ids)
    .eq("is_private_log", false)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  type Row = {
    id: string;
    gym_rating: number | null;
    bar_rating: number | null;
    overall_rating: number | null;
    note: string | null;
    created_at: string;
    user_id: string;
    profiles: Pick<Profile, "display_name" | "avatar_url"> | null;
    hotels: FeedHotel | null;
  };

  return ((data as unknown as Row[]) ?? [])
    .filter((r) => r.hotels)
    .map((r) => ({
      id: r.id,
      gym_rating: r.gym_rating,
      bar_rating: r.bar_rating,
      overall_rating: r.overall_rating,
      note: r.note,
      created_at: r.created_at,
      author: {
        id: r.user_id,
        display_name: r.profiles?.display_name ?? null,
        avatar_url: r.profiles?.avatar_url ?? null,
      },
      hotel: r.hotels!,
    }));
}

// ---- Public profile --------------------------------------------------------

export interface PublicProfileReview {
  review: Review;
  hotel: Hotel;
}

export interface PublicProfile {
  profile: Profile | null;
  counts: FollowCounts;
  reviews: PublicProfileReview[];
}

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  const [profileRes, reviewsRes, counts] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("reviews")
      .select("*, hotels(*)")
      .eq("user_id", userId)
      .eq("is_private_log", false)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false }),
    getFollowCounts(userId),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (reviewsRes.error) throw reviewsRes.error;

  const reviews = ((reviewsRes.data as unknown as (Review & { hotels: Hotel })[]) ?? []).map(
    (row) => {
      const { hotels, ...review } = row;
      return { review: review as Review, hotel: hotels };
    }
  );

  return { profile: (profileRes.data as Profile | null) ?? null, counts, reviews };
}

// ---- "People you follow rated this" ---------------------------------------

export async function getFollowedReviewersAtHotel(
  hotelId: string
): Promise<FeedAuthor[]> {
  const me = await currentUserId();
  if (!me) return [];
  const ids = await getFollowingIds(me);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select("user_id, profiles(display_name, avatar_url)")
    .eq("hotel_id", hotelId)
    .in("user_id", ids)
    .eq("is_private_log", false)
    .eq("is_hidden", false);
  if (error) throw error;

  type Row = { user_id: string; profiles: Pick<Profile, "display_name" | "avatar_url"> | null };
  const seen = new Map<string, FeedAuthor>();
  ((data as unknown as Row[]) ?? []).forEach((r) => {
    if (!seen.has(r.user_id)) {
      seen.set(r.user_id, {
        id: r.user_id,
        display_name: r.profiles?.display_name ?? null,
        avatar_url: r.profiles?.avatar_url ?? null,
      });
    }
  });
  return [...seen.values()];
}

export type { TagType };
