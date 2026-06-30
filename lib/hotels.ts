import { supabase } from "./supabase";
import type { Hotel, HotelAggregate } from "./database.types";
import type { PlaceResult } from "./places";

/** A hotel ready to render in a card: Places info + (maybe) our DB id + aggregate. */
export interface HotelCard extends PlaceResult {
  id: string | null;
  aggregate: HotelAggregate | null;
  distanceM?: number | null;
}

const EMPTY_AGG: Omit<HotelAggregate, "hotel_id"> = {
  avg_gym: 0,
  avg_bar: 0,
  avg_overall: 0,
  review_count: 0,
  updated_at: "",
};

type HotelWithAgg = Pick<Hotel, "id" | "google_place_id"> & {
  hotel_aggregates: HotelAggregate | HotelAggregate[] | null;
};

function oneAgg(value: HotelWithAgg["hotel_aggregates"]): HotelAggregate | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/**
 * Merge Places results with any aggregates we already store, so search cards
 * can show 🏋️/🍸/⭐ at a glance without an upsert per result.
 */
export async function attachAggregates(
  places: PlaceResult[]
): Promise<HotelCard[]> {
  if (places.length === 0) return [];
  const ids = places.map((p) => p.google_place_id);

  const { data, error } = await supabase
    .from("hotels")
    .select("id, google_place_id, hotel_aggregates(*)")
    .in("google_place_id", ids);
  if (error) throw error;

  const byPlace = new Map<string, HotelWithAgg>();
  (data as HotelWithAgg[] | null)?.forEach((h) => byPlace.set(h.google_place_id, h));

  return places.map((p) => {
    const match = byPlace.get(p.google_place_id);
    return {
      ...p,
      id: match?.id ?? null,
      aggregate: match ? oneAgg(match.hotel_aggregates) : null,
    };
  });
}

/**
 * Upsert a viewed hotel keyed by google_place_id (Section 5.2 — never free-typed,
 * always from Places, so the dataset stays dedup-free). Returns the stored row.
 */
export async function upsertHotel(place: PlaceResult): Promise<Hotel> {
  const { data, error } = await supabase
    .from("hotels")
    .upsert(
      {
        google_place_id: place.google_place_id,
        name: place.name,
        address: place.address,
        city: place.city,
        country: place.country,
        lat: place.lat,
        lng: place.lng,
        price_tier: place.price_tier,
        image_url: place.image_url,
      },
      { onConflict: "google_place_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Hotel;
}

/** Read a stored hotel + its aggregate by google_place_id (null if unseen). */
export async function getStoredHotel(
  placeId: string
): Promise<{ hotel: Hotel; aggregate: HotelAggregate } | null> {
  const { data, error } = await supabase
    .from("hotels")
    .select("*, hotel_aggregates(*)")
    .eq("google_place_id", placeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { hotel_aggregates, ...hotel } = data as Hotel & {
    hotel_aggregates: HotelAggregate | HotelAggregate[] | null;
  };
  return {
    hotel: hotel as Hotel,
    aggregate: oneAgg(hotel_aggregates) ?? { hotel_id: hotel.id, ...EMPTY_AGG },
  };
}
