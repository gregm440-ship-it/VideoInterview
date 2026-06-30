// Affiliate booking deep links. Configure your program via env — your
// affiliate id is what earns commission, so it must be set for "Book" to pay.
//
//   EXPO_PUBLIC_AFFILIATE_PROVIDER = booking | stay22   (default: booking)
//   EXPO_PUBLIC_AFFILIATE_ID       = <your affiliate / partner id>
//   EXPO_PUBLIC_AFFILIATE_TEMPLATE = optional full URL template override
//
// Template placeholders: {aid} {name} {city} {lat} {lng} {checkin} {checkout} {guests}

export type AffiliateProvider = "booking" | "stay22";

const PROVIDER = (process.env.EXPO_PUBLIC_AFFILIATE_PROVIDER ?? "booking") as AffiliateProvider;
const AFFILIATE_ID = process.env.EXPO_PUBLIC_AFFILIATE_ID ?? "";
const TEMPLATE = process.env.EXPO_PUBLIC_AFFILIATE_TEMPLATE ?? "";

export const affiliateConfigured = Boolean(AFFILIATE_ID || TEMPLATE);

export function affiliateProviderName(): string {
  if (TEMPLATE) return "your booking partner";
  return PROVIDER === "stay22" ? "Stay22" : "Booking.com";
}

export interface BookingHotel {
  name: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
}

export interface BookingDates {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guests: number;
}

/** Build the affiliate booking URL for a hotel + dates. */
export function buildBookingUrl(hotel: BookingHotel, d: BookingDates): string {
  const enc = encodeURIComponent;
  const query = [hotel.name, hotel.city].filter(Boolean).join(" ");

  if (TEMPLATE) {
    return TEMPLATE.replace("{aid}", enc(AFFILIATE_ID))
      .replace("{name}", enc(hotel.name))
      .replace("{city}", enc(hotel.city ?? ""))
      .replace("{lat}", String(hotel.lat ?? ""))
      .replace("{lng}", String(hotel.lng ?? ""))
      .replace("{checkin}", d.checkIn)
      .replace("{checkout}", d.checkOut)
      .replace("{guests}", String(d.guests));
  }

  if (PROVIDER === "stay22") {
    const params = new URLSearchParams({
      aid: AFFILIATE_ID,
      checkin: d.checkIn,
      checkout: d.checkOut,
      adults: String(d.guests),
      address: query,
    });
    if (hotel.lat != null && hotel.lng != null) {
      params.set("lat", String(hotel.lat));
      params.set("lng", String(hotel.lng));
    }
    return `https://www.stay22.com/l/?${params.toString()}`;
  }

  // Booking.com affiliate deep link (aid earns commission).
  const params = new URLSearchParams({
    aid: AFFILIATE_ID,
    ss: query,
    checkin: d.checkIn,
    checkout: d.checkOut,
    group_adults: String(d.guests),
    no_rooms: "1",
    dest_type: "hotel",
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}
