import { supabase } from "./supabase";
import type { Profile } from "./database.types";
import { DEMO_MODE, demoProfile } from "./demo";

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | "display_name"
    | "home_city"
    | "traveler_type"
    | "preferred_airline"
    | "preferred_hotel_brand"
    | "preferred_cruise_line"
  >
>;

export async function getMyProfile(): Promise<Profile | null> {
  if (DEMO_MODE) return demoProfile();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function updateMyProfile(patch: ProfilePatch): Promise<Profile> {
  if (DEMO_MODE) return { ...demoProfile(), ...patch };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in.");
  // Upsert so a missing profile row (rare) is created rather than failing.
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...patch }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}
