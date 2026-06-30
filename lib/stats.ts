import { supabase } from "./supabase";
import { getFollowCounts } from "./social";
import type { UserStats } from "./badges";
import { DEMO_MODE, demoUserStats } from "./demo";

/** Aggregate a user's contributor stats (public content only) for badges/tier. */
export async function getUserStats(userId: string): Promise<UserStats> {
  if (DEMO_MODE) return demoUserStats(userId);
  const { data, error } = await supabase
    .from("reviews")
    .select("id, gym_rating, bar_rating, hotels(city)")
    .eq("user_id", userId)
    .eq("is_private_log", false)
    .eq("is_hidden", false);
  if (error) throw error;

  type Row = {
    id: string;
    gym_rating: number | null;
    bar_rating: number | null;
    hotels: { city: string | null } | { city: string | null }[] | null;
  };
  const rows = (data as unknown as Row[]) ?? [];
  const ids = rows.map((r) => r.id);

  const cities = new Set<string>();
  let gymFives = 0;
  let barFives = 0;
  for (const r of rows) {
    if (r.gym_rating === 5) gymFives += 1;
    if (r.bar_rating === 5) barFives += 1;
    const h = Array.isArray(r.hotels) ? r.hotels[0] : r.hotels;
    if (h?.city) cities.add(h.city);
  }

  const countIn = async (table: string): Promise<number> => {
    if (ids.length === 0) return 0;
    const res = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("review_id", ids);
    if (res.error) throw res.error;
    return res.count ?? 0;
  };

  const [photoCount, helpfulReceived, counts] = await Promise.all([
    countIn("review_photos"),
    countIn("helpful_votes"),
    getFollowCounts(userId),
  ]);

  return {
    reviewCount: rows.length,
    photoCount,
    helpfulReceived,
    followers: counts.followers,
    gymFives,
    barFives,
    cities: cities.size,
  };
}
