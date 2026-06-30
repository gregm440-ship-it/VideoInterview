// Design tokens. Deep-sky-blue travel palette — light, airy, big tap targets.
export const colors = {
  bg: "#F1F6FB", // cool light sky-tinted paper
  surface: "#FFFFFF",
  surfaceAlt: "#E8F1FA",
  border: "#D6E3F0",
  text: "#15273B", // deep navy slate
  textMuted: "#5E6E82",
  primary: "#1488DB", // deep sky blue
  onPrimary: "#FFFFFF", // white reads on the saturated blue
  accent: "#F2994A", // warm amber — sip warmth, complements the blue
  onAccent: "#2A1600",
  danger: "#E5484D",
  // Soft tints for selected/active states on a light background.
  primaryTint: "rgba(20,136,219,0.14)",
  accentTint: "rgba(242,153,74,0.16)",
  ratingActive: "#1488DB",
  ratingInactive: "#CBD8E6",
  shadow: "#15273B",
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
