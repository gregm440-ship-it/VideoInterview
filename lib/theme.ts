// Design tokens — BenchandBar.Travel "Sky & Sun" brand system.
// Sun #FF8A3D (primary/bar/CTAs) · Sky #2B8CD6 (secondary/gym/links) on a
// light "cloud" UI; deep navy #10233F is ink and the icon-tile ground.
export const colors = {
  bg: "#EEF4FA", // cloud
  surface: "#FFFFFF",
  surfaceAlt: "#E2ECF6",
  border: "#DCE7F1", // hairline (light)
  text: "#10233F", // ink
  textMuted: "#5B6E88",
  primary: "#FF8A3D", // sun — CTAs, bar score
  onPrimary: "#FFFFFF",
  accent: "#2B8CD6", // sky — links, gym score
  onAccent: "#FFFFFF",
  danger: "#E5484D",
  // Soft tints for selected/active states on the light background.
  primaryTint: "rgba(255,138,61,0.16)",
  accentTint: "rgba(43,140,214,0.14)",
  // Per-scale rating colors (brand: martini = sun, barbell = sky).
  ratingBar: "#FF8A3D",
  ratingGym: "#2B8CD6",
  ratingActive: "#FF8A3D",
  ratingInactive: "#C9D8E6",
  // Navy grounds (icon tile, dark accents).
  ink: "#10233F",
  inkSurface: "#1B3050",
  shadow: "#0A192D",
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
