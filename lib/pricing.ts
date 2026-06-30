// Best-price lookup for a hotel + date range.
//
// Live prices need a hotel pricing API (and the matching affiliate program).
// Set EXPO_PUBLIC_HOTEL_PRICE_ENDPOINT to a URL that accepts
// ?placeId&lat&lng&checkin&checkout&guests and returns
// { nightlyFrom, total, currency }, and we'll use it. Without it we show a
// clearly-labelled demo estimate so the flow is fully usable in development.

const PRICE_ENDPOINT = process.env.EXPO_PUBLIC_HOTEL_PRICE_ENDPOINT ?? "";

export interface PriceableHotel {
  google_place_id: string;
  name: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  price_tier: number | null;
}

export interface PriceQuote {
  nightlyFrom: number;
  total: number;
  currency: string;
  nights: number;
  source: string;
  isEstimate: boolean;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00`).getTime();
  const b = new Date(`${checkOut}T00:00:00`).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

// Stable pseudo-variation per hotel so the demo price doesn't jump around.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const BASE_BY_TIER: Record<number, number> = { 0: 90, 1: 120, 2: 180, 3: 280, 4: 440 };

function demoEstimate(hotel: PriceableHotel, nights: number): PriceQuote {
  const base = BASE_BY_TIER[hotel.price_tier ?? 2] ?? 180;
  const variation = (hash(hotel.google_place_id) % 60) - 20; // -20..+39
  const nightly = Math.max(70, base + variation);
  return {
    nightlyFrom: nightly,
    total: nightly * nights,
    currency: "USD",
    nights,
    source: "demo estimate",
    isEstimate: true,
  };
}

export async function getBestPrice(
  hotel: PriceableHotel,
  checkIn: string,
  checkOut: string,
  guests: number
): Promise<PriceQuote> {
  const nights = nightsBetween(checkIn, checkOut);

  if (PRICE_ENDPOINT) {
    try {
      const params = new URLSearchParams({
        placeId: hotel.google_place_id,
        checkin: checkIn,
        checkout: checkOut,
        guests: String(guests),
      });
      if (hotel.lat != null) params.set("lat", String(hotel.lat));
      if (hotel.lng != null) params.set("lng", String(hotel.lng));
      const res = await fetch(`${PRICE_ENDPOINT}?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as {
          nightlyFrom?: number;
          total?: number;
          currency?: string;
        };
        if (json.nightlyFrom != null) {
          return {
            nightlyFrom: json.nightlyFrom,
            total: json.total ?? json.nightlyFrom * nights,
            currency: json.currency ?? "USD",
            nights,
            source: "live rates",
            isEstimate: false,
          };
        }
      }
    } catch {
      // Fall through to the estimate so the UI never dead-ends.
    }
  }

  return demoEstimate(hotel, nights);
}

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Math.round(amount)}`;
  }
}
