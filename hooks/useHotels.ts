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
  type HotelCard,
} from "../lib/hotels";
import type { HotelAggregate } from "../lib/database.types";
import { haversineMeters } from "../lib/distance";

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

/** Search hotels: empty query => "near me", otherwise text search biased nearby. */
export function useHotelSearch(query: string, near: LatLng, enabled = true) {
  const trimmed = query.trim();
  const mode = trimmed.length > 0 ? "text" : "near";
  return useQuery({
    queryKey: ["hotelSearch", mode, mode === "text" ? trimmed : near],
    enabled,
    queryFn: async () => {
      const places =
        mode === "text"
          ? await searchHotelsByText(trimmed, near)
          : await searchHotelsNearby(near);
      const cards = withDistance(await attachAggregates(places), near);
      // Nearby is already distance-ranked; sort text results too.
      return mode === "text"
        ? cards.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity))
        : cards;
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
