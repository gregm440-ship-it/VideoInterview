// Minimal design tokens. One screen = one job: dark, low-chrome, big tap targets.
export const colors = {
  bg: "#0E1116",
  surface: "#171B22",
  surfaceAlt: "#1F242D",
  border: "#2A313B",
  text: "#F5F7FA",
  textMuted: "#9AA4B2",
  primary: "#E8B84B", // warm "sip" gold
  accent: "#5BC0BE", // cool "rep" teal
  danger: "#E5484D",
  ratingActive: "#E8B84B",
  ratingInactive: "#3A4250",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

// Big, thumb-reachable tap target minimum (Section 2).
export const TAP_TARGET = 48;
