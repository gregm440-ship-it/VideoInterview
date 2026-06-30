// Google Places API (v1 / "Places API New"). Used to search hotels and fetch
// details. Users never free-type a hotel name — they pick from these results,
// and we upsert the chosen place into Supabase keyed by google_place_id.

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

const BASE = "https://places.googleapis.com/v1";

// Only the fields we actually use — keeps the bill (and payload) small.
const PLACE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "photos",
  "priceLevel",
  "addressComponents",
] as const;

const SEARCH_FIELD_MASK = PLACE_FIELDS.map((f) => `places.${f}`).join(",");
const DETAILS_FIELD_MASK = PLACE_FIELDS.join(",");

export interface PlaceResult {
  google_place_id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  price_tier: number | null;
  image_url: string | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

// ---- Raw API response shapes (only what we read) ---------------------------

interface RawAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}
interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  photos?: { name?: string }[];
  priceLevel?: string;
  addressComponents?: RawAddressComponent[];
}

const PRICE_LEVELS: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/** Build a directly-loadable photo URL from a Places photo resource name. */
export function placePhotoUrl(photoName: string, maxWidthPx = 800): string {
  return `${BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${PLACES_KEY}`;
}

function pickComponent(
  components: RawAddressComponent[] | undefined,
  type: string
): string | null {
  return components?.find((c) => c.types?.includes(type))?.longText ?? null;
}

function mapPlace(p: RawPlace): PlaceResult {
  const photoName = p.photos?.[0]?.name;
  return {
    google_place_id: p.id,
    name: p.displayName?.text ?? "Unknown hotel",
    address: p.formattedAddress ?? null,
    city:
      pickComponent(p.addressComponents, "locality") ??
      pickComponent(p.addressComponents, "postal_town") ??
      pickComponent(p.addressComponents, "administrative_area_level_1"),
    country: pickComponent(p.addressComponents, "country"),
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    price_tier: p.priceLevel ? PRICE_LEVELS[p.priceLevel] ?? null : null,
    image_url: photoName ? placePhotoUrl(photoName) : null,
  };
}

function assertKey() {
  if (!PLACES_KEY) {
    throw new Error(
      "Google Places key missing. Set EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in .env."
    );
  }
}

async function postPlaces(
  endpoint: string,
  body: unknown,
  fieldMask: string
): Promise<RawPlace[]> {
  assertKey();
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": PLACES_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Places ${endpoint} failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { places?: RawPlace[] };
  return json.places ?? [];
}

/** Free-text hotel search, optionally biased toward the user's location. */
export async function searchHotelsByText(
  query: string,
  near?: LatLng
): Promise<PlaceResult[]> {
  const body: Record<string, unknown> = {
    textQuery: query,
    includedType: "lodging",
    maxResultCount: 20,
  };
  if (near) {
    body.locationBias = {
      circle: {
        center: { latitude: near.lat, longitude: near.lng },
        radius: 30000,
      },
    };
  }
  const places = await postPlaces("places:searchText", body, SEARCH_FIELD_MASK);
  return places.map(mapPlace);
}

/** "Near me" — hotels within `radiusM` of a point, closest first. */
export async function searchHotelsNearby(
  center: LatLng,
  radiusM = 5000
): Promise<PlaceResult[]> {
  const body = {
    includedTypes: ["lodging"],
    maxResultCount: 20,
    rankPreference: "DISTANCE",
    locationRestriction: {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: radiusM,
      },
    },
  };
  const places = await postPlaces("places:searchNearby", body, SEARCH_FIELD_MASK);
  return places.map(mapPlace);
}

/** Full details for one place (used when opening a hotel that isn't cached). */
export async function getPlaceDetails(placeId: string): Promise<PlaceResult> {
  assertKey();
  const res = await fetch(`${BASE}/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": PLACES_KEY,
      "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Places details failed (${res.status}): ${text}`);
  }
  const place = (await res.json()) as RawPlace;
  return mapPlace(place);
}
