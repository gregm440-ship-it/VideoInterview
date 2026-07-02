import { supabase } from "./supabase";
import type { Hotel, HotelAggregate } from "./database.types";
import { DEMO_MODE, demoTopHotels, demoTopReviewers } from "./demo";

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

// Bayesian-style shrinkage: pull small samples toward a prior so one lone
// 5.0 review can't outrank a hotel with a hundred reviews at 4.7.
const PRIOR_WEIGHT = 5;
const PRIOR_MEAN = 3.5;

export function weightedScore(avg: number, reviewCount: number): number {
  return (reviewCount * avg + PRIOR_WEIGHT * PRIOR_MEAN) / (reviewCount + PRIOR_WEIGHT);
}

/** Highest-rated hotels by a metric (public reviews only, via the trigger). */
export async function getTopHotels(metric: HotelMetric, limit = 25): Promise<TopHotel[]> {
  if (DEMO_MODE) return demoTopHotels(metric);
  // Over-fetch by raw average, then rank by the shrunk score client-side.
  const { data, error } = await supabase
    .from("hotel_aggregates")
    .select("*, hotels(*)")
    .gte("review_count", 1)
    .order(metric, { ascending: false })
    .order("review_count", { ascending: false })
    .limit(limit * 4);
  if (error) throw error;

  type Row = HotelAggregate & { hotels: Hotel | null };
  return ((data as unknown as Row[]) ?? [])
    .filter((r) => r.hotels)
    .map((r) => {
      const { hotels, ...aggregate } = r;
      return { hotel: hotels as Hotel, aggregate: aggregate as HotelAggregate };
    })
    .sort(
      (a, b) =>
        weightedScore(Number(b.aggregate[metric]), b.aggregate.review_count) -
        weightedScore(Number(a.aggregate[metric]), a.aggregate.review_count)
    )
    .slice(0, limit);
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
  if (DEMO_MODE) return demoTopReviewers();
  const { data, error } = await supabase.rpc("get_top_reviewers", { limit_count: limit });
  if (error) throw error;
  return (data as TopReviewer[]) ?? [];
}
