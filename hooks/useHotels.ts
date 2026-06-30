import { useQuery } from "@tanstack/react-query";
import {
  searchHotelsByText,
  searchHotelsNearby,
  getPlaceDetails,
  type LatLng,
} from "../lib/places";
import {
  attachAggregates,
  upsertHotel,
  getStoredHotel,
  getTagsForHotels,
  type HotelCard,
} from "../lib/hotels";
import type { HotelAggregate } from "../lib/database.types";
import { haversineMeters } from "../lib/distance";
import {
  applyFilters,
  defaultFilters,
  type SearchFilters,
} from "../lib/filters";

export function emptyAggregate(hotelId = ""): HotelAggregate {
  return {
    hotel_id: hotelId,
    avg_gym: 0,
    avg_bar: 0,
    avg_overall: 0,
    review_count: 0,
    updated_at: "",
  };
}

function withDistance(cards: HotelCard[], from: LatLng): HotelCard[] {
  return cards.map((c) => ({
    ...c,
    distanceM:
      c.lat != null && c.lng != null
        ? haversineMeters(from, { lat: c.lat, lng: c.lng })
        : null,
  }));
}

const PLACES_MAX_RADIUS_M = 50000;

/** Search hotels: empty query => "near me", otherwise text search biased nearby. */
export function useHotelSearch(
  query: string,
  near: LatLng,
  filters: SearchFilters = defaultFilters(),
  enabled = true
) {
  const trimmed = query.trim();
  const mode = trimmed.length > 0 ? "text" : "near";
  return useQuery({
    queryKey: ["hotelSearch", mode, mode === "text" ? trimmed : near, filters],
    enabled,
    queryFn: async () => {
      const radiusM = Math.min(filters.radiusMi * 1609.34, PLACES_MAX_RADIUS_M);
      const places =
        mode === "text"
          ? await searchHotelsByText(trimmed, near)
          : await searchHotelsNearby(near, radiusM);

      let cards = withDistance(await attachAggregates(places), near);

      // Only pay for the tag query when a tag filter is actually set.
      if (filters.tags.length > 0) {
        const ids = cards.map((c) => c.id).filter((id): id is string => Boolean(id));
        const tagMap = await getTagsForHotels(ids);
        cards = cards.map((c) => ({
          ...c,
          tagKeys: c.id ? [...(tagMap.get(c.id) ?? [])] : [],
        }));
      }

      return applyFilters(cards, filters);
    },
  });
}

export interface HotelDetailData {
  place: Awaited<ReturnType<typeof getPlaceDetails>>;
  hotelId: string | null;
  aggregate: HotelAggregate;
}

/**
 * Load a hotel's detail. When `canPersist` (signed-in), upsert the viewed hotel
 * keyed by google_place_id so it joins the shared dataset (Section 5.2).
 */
export function useHotelDetail(placeId: string, canPersist: boolean) {
  return useQuery<HotelDetailData>({
    queryKey: ["hotel", placeId, canPersist],
    enabled: Boolean(placeId),
    queryFn: async () => {
      const place = await getPlaceDetails(placeId);
      if (canPersist) await upsertHotel(place);
      const stored = await getStoredHotel(placeId);
      return {
        place,
        hotelId: stored?.hotel.id ?? null,
        aggregate: stored?.aggregate ?? emptyAggregate(),
      };
    },
  });
}
