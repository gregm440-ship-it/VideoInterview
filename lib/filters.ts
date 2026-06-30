import type { HotelCard } from "./hotels";
import type { HotelAggregate } from "./database.types";

export type SortKey =
  | "nearest"
  | "best_gym"
  | "best_bar"
  | "best_overall"
  | "most_reviewed";

export const SORT_LABELS: Record<SortKey, string> = {
  nearest: "Nearest",
  best_gym: "Best gym",
  best_bar: "Best bar",
  best_overall: "Best overall",
  most_reviewed: "Most reviewed",
};

export interface SearchFilters {
  minGym: number; // 0 = any, else minimum avg score
  minBar: number;
  minOverall: number;
  tags: string[]; // tag_keys (gym + bar mixed); a hotel must have ALL selected
  priceTiers: number[]; // selected price tiers (1–4); empty = any
  radiusMi: number; // near-me search radius + label
  sort: SortKey;
  // Hotel brand narrows hotel results (matched against the hotel name/brand).
  // Airline & cruise line live on the profile only (future use), not here.
  hotelBrand: string | null;
}

export const DEFAULT_RADIUS_MI = 5;
export const RADIUS_OPTIONS = [1, 5, 25] as const;
// Minimum-score thresholds offered in the UI (1/2 aren't useful filters).
export const MIN_SCORE_OPTIONS = [0, 3, 4, 5] as const;
export const PRICE_TIERS = [1, 2, 3, 4] as const;

export function defaultFilters(): SearchFilters {
  return {
    minGym: 0,
    minBar: 0,
    minOverall: 0,
    tags: [],
    priceTiers: [],
    radiusMi: DEFAULT_RADIUS_MI,
    sort: "nearest",
    hotelBrand: null,
  };
}

/** Count of meaningful filters set (sort isn't a filter; default radius isn't). */
export function activeFilterCount(f: SearchFilters): number {
  let n = 0;
  if (f.minGym) n += 1;
  if (f.minBar) n += 1;
  if (f.minOverall) n += 1;
  n += f.tags.length;
  if (f.priceTiers.length) n += 1;
  if (f.radiusMi !== DEFAULT_RADIUS_MI) n += 1;
  if (f.hotelBrand) n += 1;
  return n;
}

function ratedAgg(c: HotelCard): HotelAggregate | null {
  return c.aggregate && c.aggregate.review_count > 0 ? c.aggregate : null;
}

function sortCards(cards: HotelCard[], sort: SortKey): HotelCard[] {
  const byDist = (a: HotelCard, b: HotelCard) =>
    (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);
  const score = (c: HotelCard, key: keyof HotelAggregate) => {
    const agg = ratedAgg(c);
    return agg ? (agg[key] as number) : -1;
  };
  const list = [...cards];
  switch (sort) {
    case "best_gym":
      return list.sort((a, b) => score(b, "avg_gym") - score(a, "avg_gym") || byDist(a, b));
    case "best_bar":
      return list.sort((a, b) => score(b, "avg_bar") - score(a, "avg_bar") || byDist(a, b));
    case "best_overall":
      return list.sort((a, b) => score(b, "avg_overall") - score(a, "avg_overall") || byDist(a, b));
    case "most_reviewed":
      return list.sort(
        (a, b) =>
          (b.aggregate?.review_count ?? 0) - (a.aggregate?.review_count ?? 0) || byDist(a, b)
      );
    case "nearest":
    default:
      return list.sort(byDist);
  }
}

/**
 * Filter + sort already-fetched cards. Score/tag/price filters require data we
 * only have for hotels in our DB, so a hotel with no ratings is excluded once
 * any score/tag filter is set. Radius bounds the near-me search itself (see the
 * search hook), so it isn't re-applied here for text searches.
 */
export function applyFilters(cards: HotelCard[], f: SearchFilters): HotelCard[] {
  const filtered = cards.filter((c) => {
    const agg = ratedAgg(c);
    if (f.minGym && !(agg && agg.avg_gym >= f.minGym)) return false;
    if (f.minBar && !(agg && agg.avg_bar >= f.minBar)) return false;
    if (f.minOverall && !(agg && agg.avg_overall >= f.minOverall)) return false;
    if (f.priceTiers.length && !(c.price_tier != null && f.priceTiers.includes(c.price_tier)))
      return false;
    if (f.hotelBrand) {
      // Places doesn't expose a brand field, but the hotel name almost always
      // carries it (e.g. "Marriott Marquis", "Hilton Austin").
      if (!c.name.toLowerCase().includes(f.hotelBrand.toLowerCase())) return false;
    }
    if (f.tags.length) {
      const have = new Set(c.tagKeys ?? []);
      if (!f.tags.every((t) => have.has(t))) return false;
    }
    return true;
  });
  return sortCards(filtered, f.sort);
}
