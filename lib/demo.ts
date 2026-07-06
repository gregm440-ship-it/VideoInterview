// ---------------------------------------------------------------------------
// Demo mode: feed the real app realistic local data with no backend/keys.
// Turn on with EXPO_PUBLIC_DEMO_MODE=1 in .env, then run `npx expo start`.
// Every data function in lib/* checks DEMO_MODE and returns these fixtures.
// ---------------------------------------------------------------------------

import type { PlaceResult } from "./places";
import type { HotelCard } from "./hotels";
import type {
  Hotel,
  HotelAggregate,
  Profile,
  Review,
  ReviewPhoto,
  TagType,
} from "./database.types";
import type { CommunityReview, LogEntry } from "./reviews";
import type {
  FeedItem,
  FeedAuthor,
  FollowCounts,
  PublicProfile,
} from "./social";
import type { TopHotel, TopReviewer, HotelMetric } from "./leaderboard";
import type { UserStats } from "./badges";

export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === "1";

export const DEMO_USER = {
  id: "demo-you",
  email: "you@benchandbar.travel",
  display_name: "You",
};

const NOW = "2026-03-01T12:00:00Z";

const img = (id: string) => `https://images.unsplash.com/${id}?w=600`;

// ---- Hotels (as Places results) -------------------------------------------

interface DemoHotel {
  place: PlaceResult;
  agg: { gym: number; bar: number; overall: number; count: number };
  tags: { key: string; type: TagType }[];
}

const H: DemoHotel[] = [
  {
    place: {
      google_place_id: "demo-driskill",
      name: "The Driskill",
      address: "604 Brazos St, Austin, TX",
      city: "Austin",
      country: "United States",
      lat: 30.2686, lng: -97.7414, price_tier: 3,
      image_url: img("photo-1566073771259-6a8506099945"),
    },
    agg: { gym: 4.6, bar: 4.8, overall: 4.7, count: 128 },
    tags: [
      { key: "squat_rack", type: "gym" }, { key: "24_hour", type: "gym" },
      { key: "heavy_dumbbells", type: "gym" }, { key: "quality_cocktails", type: "bar" },
      { key: "open_late", type: "bar" }, { key: "rooftop_view", type: "bar" },
    ],
  },
  {
    place: {
      google_place_id: "demo-vanzandt",
      name: "Hotel Van Zandt",
      address: "605 Davis St, Austin, TX",
      city: "Austin", country: "United States",
      lat: 30.2596, lng: -97.7390, price_tier: 3,
      image_url: img("photo-1542314831-068cd1dbfeeb"),
    },
    agg: { gym: 3.8, bar: 4.9, overall: 4.4, count: 203 },
    tags: [
      { key: "cardio_variety", type: "gym" }, { key: "rooftop_view", type: "bar" },
      { key: "client_ready", type: "bar" }, { key: "quality_cocktails", type: "bar" },
    ],
  },
  {
    place: {
      google_place_id: "demo-fairmont",
      name: "Fairmont Austin",
      address: "101 Red River St, Austin, TX",
      city: "Austin", country: "United States",
      lat: 30.2625, lng: -97.7385, price_tier: 3,
      image_url: img("photo-1551882547-ff40c63fe5fa"),
    },
    agg: { gym: 4.9, bar: 4.2, overall: 4.5, count: 86 },
    tags: [
      { key: "spacious", type: "gym" }, { key: "heavy_dumbbells", type: "gym" },
      { key: "pool", type: "gym" }, { key: "happy_hour", type: "bar" },
    ],
  },
  {
    place: {
      google_place_id: "demo-jwmarriott",
      name: "JW Marriott Austin",
      address: "110 E 2nd St, Austin, TX",
      city: "Austin", country: "United States",
      lat: 30.2640, lng: -97.7415, price_tier: 3,
      image_url: img("photo-1455587734955-081b22074882"),
    },
    agg: { gym: 4.7, bar: 4.0, overall: 4.4, count: 71 },
    tags: [
      { key: "free_weights", type: "gym" }, { key: "towels", type: "gym" },
      { key: "work_friendly", type: "bar" },
    ],
  },
  {
    place: {
      google_place_id: "demo-1hotel",
      name: "1 Hotel Brooklyn Bridge",
      address: "60 Furman St, Brooklyn, NY",
      city: "New York", country: "United States",
      lat: 40.7003, lng: -73.9967, price_tier: 4,
      image_url: img("photo-1564501049412-61c2a3083791"),
    },
    agg: { gym: 3.2, bar: 4.9, overall: 4.3, count: 96 },
    tags: [
      { key: "bikes", type: "gym" }, { key: "rooftop_view", type: "bar" },
      { key: "local_craft", type: "bar" }, { key: "solo_friendly", type: "bar" },
    ],
  },
  {
    place: {
      google_place_id: "demo-kimpton",
      name: "Kimpton Gray Hotel",
      address: "122 W Monroe St, Chicago, IL",
      city: "Chicago", country: "United States",
      lat: 41.8806, lng: -87.6312, price_tier: 2,
      image_url: img("photo-1611892440504-42a792e24d32"),
    },
    agg: { gym: 4.4, bar: 4.4, overall: 4.4, count: 54 },
    tags: [
      { key: "clean", type: "gym" }, { key: "sauna", type: "gym" },
      { key: "has_food", type: "bar" }, { key: "happy_hour", type: "bar" },
    ],
  },
];

const byPlace = new Map(H.map((h) => [h.place.google_place_id, h]));

function aggregate(h: DemoHotel): HotelAggregate {
  return {
    hotel_id: `hid-${h.place.google_place_id}`,
    avg_gym: h.agg.gym, avg_bar: h.agg.bar, avg_overall: h.agg.overall,
    review_count: h.agg.count, updated_at: NOW,
  };
}

function toHotel(p: PlaceResult): Hotel {
  return {
    id: `hid-${p.google_place_id}`,
    google_place_id: p.google_place_id,
    name: p.name, brand: null, address: p.address, city: p.city,
    country: p.country, lat: p.lat, lng: p.lng, price_tier: p.price_tier,
    image_url: p.image_url, created_at: NOW,
  };
}

// ---- People ---------------------------------------------------------------

const PEOPLE: Record<string, { name: string; type: string; city: string }> = {
  "u-marcus": { name: "Marcus K.", type: "Frequent flyer", city: "Chicago" },
  "u-jess": { name: "Jess T.", type: "Road warrior", city: "Austin" },
  "u-ravi": { name: "Ravi P.", type: "Consultant", city: "New York" },
  [DEMO_USER.id]: { name: "You", type: "Frequent flyer", city: "Austin" },
};

const author = (id: string): FeedAuthor => ({
  id, display_name: PEOPLE[id]?.name ?? "Traveler", avatar_url: null,
});

// ---- Public access functions (used by lib/* early returns) ----------------

export function demoSearchPlaces(): PlaceResult[] {
  return H.map((h) => h.place);
}

export function demoAttachAggregates(places: PlaceResult[]): HotelCard[] {
  return places.map((p) => {
    const h = byPlace.get(p.google_place_id);
    return {
      ...p,
      id: `hid-${p.google_place_id}`,
      aggregate: h ? aggregate(h) : null,
      tagKeys: h ? h.tags.map((t) => t.key) : [],
    };
  });
}

export function demoTagsForHotels(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  H.forEach((h) => map.set(`hid-${h.place.google_place_id}`, new Set(h.tags.map((t) => t.key))));
  return map;
}

export function demoPlaceDetails(placeId: string): PlaceResult {
  return byPlace.get(placeId)?.place ?? H[0].place;
}

export function demoStoredHotel(placeId: string): { hotel: Hotel; aggregate: HotelAggregate } | null {
  const h = byPlace.get(placeId);
  if (!h) return null;
  return { hotel: toHotel(h.place), aggregate: aggregate(h) };
}

const REVIEW_NOTES: Record<string, string> = {
  "demo-driskill": "Squat rack + dumbbells to 80lb, open 24h. Bar does a proper Negroni past midnight.",
  "demo-vanzandt": "Rooftop bar is the move for client meetings. Gym smaller but clean.",
  "demo-1hotel": "Bar and the view are unreal. Gym is just pelotons though.",
};

export function demoHotelReviews(hotelId: string): CommunityReview[] {
  const placeId = hotelId.replace(/^hid-/, "");
  const h = byPlace.get(placeId);
  if (!h) return [];
  const tagObjs = h.tags.map((t) => ({ tag_key: t.key, tag_type: t.type }));
  const base: CommunityReview[] = [
    {
      id: `${placeId}-r1`, userId: "u-marcus",
      gym_rating: 5, bar_rating: 4, overall_rating: 5,
      note: REVIEW_NOTES[placeId] ?? "Solid pick for a work trip.",
      created_at: NOW, author: { display_name: "Marcus K.", avatar_url: null },
      tags: tagObjs.slice(0, 3), photos: [], helpfulCount: 24, votedByMe: false,
    },
    {
      id: `${placeId}-r2`, userId: "u-jess",
      gym_rating: 4, bar_rating: 5, overall_rating: 5,
      note: "Towels stocked, bartender knows what they're doing.",
      created_at: NOW, author: { display_name: "Jess T.", avatar_url: null },
      tags: tagObjs.slice(2, 4), photos: [], helpfulCount: 11, votedByMe: false,
    },
  ];
  return base;
}

export function demoHotelPhotos(hotelId: string): { gym: ReviewPhoto[]; bar: ReviewPhoto[] } {
  const placeId = hotelId.replace(/^hid-/, "");
  const mk = (i: number, type: TagType, id: string): ReviewPhoto => ({
    id: `${placeId}-${type}-${i}`, review_id: "r", hotel_id: hotelId,
    url: img(id), type, is_hidden: false, created_at: NOW,
  });
  return {
    gym: [mk(1, "gym", "photo-1534438327276-14e5300c3a48"), mk(2, "gym", "photo-1571902943202-507ec2618e8f")],
    bar: [mk(1, "bar", "photo-1514362545857-3bc16c4c7d1b"), mk(2, "bar", "photo-1470337458703-46ad1756a187")],
  };
}

export function demoTagSummary(hotelId: string) {
  const placeId = hotelId.replace(/^hid-/, "");
  const h = byPlace.get(placeId);
  const gym = (h?.tags ?? []).filter((t) => t.type === "gym").map((t) => ({ tag_key: t.key, tag_type: "gym" as TagType, count: 3 }));
  const bar = (h?.tags ?? []).filter((t) => t.type === "bar").map((t) => ({ tag_key: t.key, tag_type: "bar" as TagType, count: 4 }));
  return { gym, bar };
}

export function demoMyLog(): LogEntry[] {
  const pick = (placeId: string, g: number, b: number, o: number, note: string | null, priv = false): LogEntry => {
    const h = byPlace.get(placeId)!;
    return {
      hotel: toHotel(h.place),
      review: {
        id: `log-${placeId}`, user_id: DEMO_USER.id, hotel_id: `hid-${placeId}`,
        gym_rating: g, bar_rating: b, overall_rating: o, note,
        is_private_log: priv, is_hidden: false, created_at: NOW, updated_at: NOW,
      },
    };
  };
  return [
    pick("demo-driskill", 4, 5, 5, "24h gym, great Negroni."),
    pick("demo-fairmont", 5, 4, 4, null, true),
    pick("demo-kimpton", 4, 4, 4, "Saved for next Chicago trip"),
  ];
}

export function demoReview(): Review {
  return {
    id: "demo-new-review", user_id: DEMO_USER.id, hotel_id: "hid-demo-driskill",
    gym_rating: 4, bar_rating: 5, overall_rating: 5, note: null,
    is_private_log: false, is_hidden: false, created_at: NOW, updated_at: NOW,
  };
}

// ---- Social ---------------------------------------------------------------

export function demoFeed(): FeedItem[] {
  const item = (id: string, uid: string, placeId: string, g: number, b: number, o: number, note: string): FeedItem => {
    const h = byPlace.get(placeId)!;
    return {
      id, gym_rating: g, bar_rating: b, overall_rating: o, note, created_at: NOW,
      author: author(uid),
      hotel: { id: `hid-${placeId}`, google_place_id: placeId, name: h.place.name, city: h.place.city, image_url: h.place.image_url },
    };
  };
  return [
    item("f1", "u-marcus", "demo-driskill", 5, 4, 5, "Squat rack + 24h access. Proper Negroni at the bar."),
    item("f2", "u-jess", "demo-vanzandt", 4, 5, 5, "Rooftop bar is the move for client meetings."),
    item("f3", "u-ravi", "demo-1hotel", 3, 5, 4, "Bar > gym here, but the view is unreal."),
  ];
}

export function demoFollowedAtHotel(): FeedAuthor[] {
  return [author("u-marcus"), author("u-jess"), author("u-ravi")];
}

export function demoFollowCounts(userId: string): FollowCounts {
  return userId === DEMO_USER.id ? { followers: 18, following: 24 } : { followers: 212, following: 96 };
}

export function demoPublicProfile(userId: string): PublicProfile {
  const p = PEOPLE[userId] ?? { name: "Traveler", type: "Traveler", city: "" };
  const profile: Profile = {
    id: userId, display_name: p.name, avatar_url: null, home_city: p.city,
    traveler_type: p.type, preferred_airline: "Delta Air Lines",
    preferred_hotel_brand: "Marriott", preferred_cruise_line: null, created_at: NOW,
  };
  const reviews = demoMyLog().map((e) => ({ review: e.review, hotel: e.hotel }));
  return { profile, counts: demoFollowCounts(userId), reviews };
}

export function demoProfile(): Profile {
  return {
    id: DEMO_USER.id, display_name: "You", avatar_url: null, home_city: "Austin",
    traveler_type: "Frequent flyer", preferred_airline: null,
    preferred_hotel_brand: null, preferred_cruise_line: null, created_at: NOW,
  };
}

// ---- Leaderboard ----------------------------------------------------------

export function demoTopHotels(metric: HotelMetric): TopHotel[] {
  return [...H]
    .map((h) => ({ hotel: toHotel(h.place), aggregate: aggregate(h) }))
    .sort((a, b) => (b.aggregate[metric] as number) - (a.aggregate[metric] as number));
}

export function demoTopReviewers(): TopReviewer[] {
  return [
    { user_id: "u-marcus", display_name: "Marcus K.", avatar_url: null, review_count: 48, helpful_count: 142 },
    { user_id: "u-jess", display_name: "Jess T.", avatar_url: null, review_count: 39, helpful_count: 96 },
    { user_id: DEMO_USER.id, display_name: "You", avatar_url: null, review_count: 18, helpful_count: 34 },
    { user_id: "u-ravi", display_name: "Ravi P.", avatar_url: null, review_count: 12, helpful_count: 21 },
  ];
}

// ---- Stats (badges) -------------------------------------------------------

export function demoUserStats(userId: string): UserStats {
  if (userId === DEMO_USER.id) {
    return { reviewCount: 18, photoCount: 12, helpfulReceived: 34, followers: 18, gymFives: 8, barFives: 6, cities: 5 };
  }
  return { reviewCount: 48, photoCount: 30, helpfulReceived: 142, followers: 212, gymFives: 22, barFives: 19, cities: 14 };
}
