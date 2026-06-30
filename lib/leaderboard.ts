import { supabase } from "./supabase";
import type { Hotel, HotelAggregate } from "./database.types";

export type HotelMetric = "avg_overall" | "avg_gym" | "avg_bar";

export const HOTEL_METRICS: { key: HotelMetric; label: string }[] = [
  { key: "avg_overall", label: "Overall" },
  { key: "avg_gym", label: "Best gym" },
  { key: "avg_bar", label: "Best bar" },
];

export interface TopHotel {
  hotel: Hotel;
  aggregate: HotelAggregate;
}

/** Highest-rated hotels by a metric (public reviews only, via the trigger). */
export async function getTopHotels(metric: HotelMetric, limit = 25): Promise<TopHotel[]> {
  const { data, error } = await supabase
    .from("hotel_aggregates")
    .select("*, hotels(*)")
    .gte("review_count", 1)
    .order(metric, { ascending: false })
    .order("review_count", { ascending: false })
    .limit(limit);
  if (error) throw error;

  type Row = HotelAggregate & { hotels: Hotel | null };
  return ((data as unknown as Row[]) ?? [])
    .filter((r) => r.hotels)
    .map((r) => {
      const { hotels, ...aggregate } = r;
      return { hotel: hotels as Hotel, aggregate: aggregate as HotelAggregate };
    });
}

export interface TopReviewer {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  review_count: number;
  helpful_count: number;
}

/** Most active reviewers (via the get_top_reviewers RPC). */
export async function getTopReviewers(limit = 25): Promise<TopReviewer[]> {
  const { data, error } = await supabase.rpc("get_top_reviewers", { limit_count: limit });
  if (error) throw error;
  return (data as TopReviewer[]) ?? [];
}
