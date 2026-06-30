import type { TagType } from "./database.types";

export interface TagDef {
  key: string;
  label: string;
}

// Section 8.1 — stable keys stored, labels shown. None are required.
export const GYM_TAGS: TagDef[] = [
  { key: "free_weights", label: "Free weights" },
  { key: "squat_rack", label: "Squat rack / barbell" },
  { key: "heavy_dumbbells", label: "Dumbbells 50lb+" },
  { key: "cardio_variety", label: "Good cardio variety" },
  { key: "bikes", label: "Peloton / bikes" },
  { key: "24_hour", label: "24-hour access" },
  { key: "spacious", label: "Spacious" },
  { key: "clean", label: "Clean" },
  { key: "towels", label: "Towels provided" },
  { key: "pool", label: "Pool" },
  { key: "sauna", label: "Sauna / steam" },
];

export const BAR_TAGS: TagDef[] = [
  { key: "open_late", label: "Open past 11pm" },
  { key: "quality_cocktails", label: "Quality cocktails" },
  { key: "client_ready", label: "Good for client meetings" },
  { key: "solo_friendly", label: "Good for solo" },
  { key: "has_food", label: "Has food" },
  { key: "happy_hour", label: "Happy hour" },
  { key: "work_friendly", label: "Work-friendly (wifi/outlets)" },
  { key: "rooftop_view", label: "Rooftop / view" },
  { key: "local_craft", label: "Local / craft selection" },
];

export function tagsFor(type: TagType): TagDef[] {
  return type === "gym" ? GYM_TAGS : BAR_TAGS;
}

const LABELS: Record<string, string> = Object.fromEntries(
  [...GYM_TAGS, ...BAR_TAGS].map((t) => [t.key, t.label])
);

export function tagLabel(key: string): string {
  return LABELS[key] ?? key;
}
