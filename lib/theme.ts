// Design tokens. Light, warm, airy — one screen = one job, big tap targets.
export const colors = {
  bg: "#F7F5F0", // warm paper
  surface: "#FFFFFF",
  surfaceAlt: "#F0EDE6",
  border: "#E5E1D8",
  text: "#1C2533", // deep slate
  textMuted: "#6E7683",
  primary: "#E0A92E", // warm "sip" gold
  onPrimary: "#2A1F00", // dark ink that reads on gold
  accent: "#1FA39A", // cool "rep" teal
  onAccent: "#06241F",
  danger: "#D64045",
  // Soft tints for selected/active states on a light background.
  primaryTint: "rgba(224,169,46,0.18)",
  accentTint: "rgba(31,163,154,0.14)",
  ratingActive: "#E0A92E",
  ratingInactive: "#D9D4C8",
  shadow: "#1C2533",
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
