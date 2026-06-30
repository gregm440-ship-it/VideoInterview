// Hand-written shape of the Supabase schema (Section 7). Once the project is
// linked you can replace this with `supabase gen types typescript`.

export type TagType = "gym" | "bar";
export type PhotoType = "gym" | "bar";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  home_city: string | null;
  traveler_type: string | null;
  preferred_airline: string | null;
  preferred_hotel_brand: string | null;
  preferred_cruise_line: string | null;
  created_at: string;
}

export interface Hotel {
  id: string;
  google_place_id: string;
  name: string;
  brand: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  price_tier: number | null;
  image_url: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  hotel_id: string;
  gym_rating: number | null;
  bar_rating: number | null;
  overall_rating: number | null;
  note: string | null;
  is_private_log: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewTag {
  id: string;
  review_id: string;
  tag_key: string;
  tag_type: TagType;
}

export interface ReviewPhoto {
  id: string;
  review_id: string;
  hotel_id: string;
  url: string;
  type: PhotoType;
  is_hidden: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  review_id: string | null;
  photo_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface HelpfulVote {
  id: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

export interface HotelAggregate {
  hotel_id: string;
  avg_gym: number;
  avg_bar: number;
  avg_overall: number;
  review_count: number;
  updated_at: string;
}
