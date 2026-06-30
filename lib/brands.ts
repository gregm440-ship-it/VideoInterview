// Curated reference lists for the world's top airlines, hotel brands, and
// cruise lines — used by the profile preference fields and advanced search.
// Not exhaustive; covers the brands a frequent traveler is most likely to pick.

export const AIRLINES: string[] = [
  "American Airlines",
  "Delta Air Lines",
  "United Airlines",
  "Southwest Airlines",
  "JetBlue Airways",
  "Alaska Airlines",
  "Spirit Airlines",
  "Frontier Airlines",
  "Hawaiian Airlines",
  "Air Canada",
  "WestJet",
  "Aeromexico",
  "LATAM Airlines",
  "Avianca",
  "Copa Airlines",
  "British Airways",
  "Virgin Atlantic",
  "Lufthansa",
  "Air France",
  "KLM",
  "Iberia",
  "Swiss International Air Lines",
  "Austrian Airlines",
  "Brussels Airlines",
  "TAP Air Portugal",
  "Aer Lingus",
  "SAS Scandinavian Airlines",
  "Finnair",
  "Norwegian",
  "Ryanair",
  "easyJet",
  "Wizz Air",
  "Vueling",
  "Turkish Airlines",
  "Emirates",
  "Qatar Airways",
  "Etihad Airways",
  "Saudia",
  "Royal Air Maroc",
  "Ethiopian Airlines",
  "South African Airways",
  "Singapore Airlines",
  "Cathay Pacific",
  "Japan Airlines",
  "ANA (All Nippon Airways)",
  "Korean Air",
  "Asiana Airlines",
  "EVA Air",
  "China Airlines",
  "Air China",
  "China Southern Airlines",
  "China Eastern Airlines",
  "Thai Airways",
  "Malaysia Airlines",
  "Philippine Airlines",
  "Vietnam Airlines",
  "IndiGo",
  "Air India",
  "Qantas",
  "Air New Zealand",
];

export const HOTEL_BRANDS: string[] = [
  "Marriott",
  "Ritz-Carlton",
  "St. Regis",
  "JW Marriott",
  "W Hotels",
  "Westin",
  "Sheraton",
  "Le Méridien",
  "Renaissance Hotels",
  "Autograph Collection",
  "Courtyard by Marriott",
  "Residence Inn",
  "Fairfield by Marriott",
  "Aloft Hotels",
  "Moxy Hotels",
  "Hilton",
  "Waldorf Astoria",
  "Conrad Hotels",
  "Canopy by Hilton",
  "DoubleTree by Hilton",
  "Hampton by Hilton",
  "Embassy Suites",
  "Curio Collection",
  "Hyatt",
  "Park Hyatt",
  "Grand Hyatt",
  "Hyatt Regency",
  "Andaz",
  "Thompson Hotels",
  "InterContinental",
  "Kimpton Hotels",
  "Crowne Plaza",
  "Holiday Inn",
  "Holiday Inn Express",
  "Hotel Indigo",
  "Regent Hotels",
  "Six Senses",
  "Sofitel",
  "Fairmont",
  "Raffles",
  "Novotel",
  "Pullman Hotels",
  "Mövenpick",
  "Ibis",
  "Four Seasons",
  "Mandarin Oriental",
  "Shangri-La",
  "The Peninsula",
  "Rosewood Hotels",
  "Aman",
  "Wyndham",
  "Best Western",
  "Radisson",
  "Radisson Blu",
  "Comfort Inn",
  "Loews Hotels",
  "Omni Hotels",
  "Jumeirah",
  "Banyan Tree",
  "Langham Hotels",
];

export const CRUISE_LINES: string[] = [
  "Carnival Cruise Line",
  "Royal Caribbean International",
  "Norwegian Cruise Line",
  "Princess Cruises",
  "Celebrity Cruises",
  "MSC Cruises",
  "Holland America Line",
  "Costa Cruises",
  "Disney Cruise Line",
  "Virgin Voyages",
  "Cunard Line",
  "Viking Ocean Cruises",
  "Viking River Cruises",
  "Oceania Cruises",
  "Regent Seven Seas Cruises",
  "Seabourn",
  "Silversea Cruises",
  "Azamara",
  "Windstar Cruises",
  "Crystal Cruises",
  "Ponant",
  "Hurtigruten",
  "AIDA Cruises",
  "P&O Cruises",
  "TUI Cruises",
  "Explora Journeys",
];

export type BrandCategory = "airline" | "hotel" | "cruise";

export function brandList(category: BrandCategory): string[] {
  switch (category) {
    case "airline":
      return AIRLINES;
    case "hotel":
      return HOTEL_BRANDS;
    case "cruise":
      return CRUISE_LINES;
  }
}

/**
 * Suggest the most likely matches for what the user has typed so far. Ranks
 * full-string prefix first, then any-word prefix, then a loose contains match —
 * i.e. the first few letters surface the most likely fits.
 */
export function suggestBrands(
  list: string[],
  query: string,
  limit = 8
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return list.slice(0, limit);

  const startsWith: string[] = [];
  const wordStartsWith: string[] = [];
  const contains: string[] = [];

  for (const item of list) {
    const lower = item.toLowerCase();
    if (lower.startsWith(q)) {
      startsWith.push(item);
    } else if (lower.split(/[^a-z0-9]+/).some((w) => w.startsWith(q))) {
      wordStartsWith.push(item);
    } else if (lower.includes(q)) {
      contains.push(item);
    }
  }
  return [...startsWith, ...wordStartsWith, ...contains].slice(0, limit);
}
