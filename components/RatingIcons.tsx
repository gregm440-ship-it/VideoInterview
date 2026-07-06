import { StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";

// Brand rating icons (Sky & Sun handoff), built from plain Views so no SVG
// dependency is needed. Spec proportions — martini: bowl 32×18, stem 4×11,
// base 20×4; barbell: outer plate 6×22, inner plate 8×32, bar 24×7.

/** Martini (bar score). `size` is the glyph width; height ≈ size. */
export function MartiniIcon({
  size = 28,
  color = colors.ratingBar,
}: {
  size?: number;
  color?: string;
}) {
  const s = size / 32;
  return (
    <View style={[styles.column, { width: size, height: 34 * s }]}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 16 * s,
          borderRightWidth: 16 * s,
          borderTopWidth: 18 * s,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: color,
        }}
      />
      <View style={{ width: 4 * s, height: 11 * s, backgroundColor: color }} />
      <View
        style={{ width: 20 * s, height: 4 * s, borderRadius: 2 * s, backgroundColor: color }}
      />
    </View>
  );
}

/** Barbell (gym score). `size` is the glyph height; width ≈ 1.75×. */
export function BarbellIcon({
  size = 24,
  color = colors.ratingGym,
}: {
  size?: number;
  color?: string;
}) {
  const s = size / 32;
  const r = 2 * s;
  return (
    <View style={[styles.row, { height: size, gap: 2 * s }]}>
      <View style={{ width: 6 * s, height: 22 * s, borderRadius: r, backgroundColor: color }} />
      <View style={{ width: 8 * s, height: 32 * s, borderRadius: r, backgroundColor: color }} />
      <View style={{ width: 24 * s, height: 7 * s, borderRadius: r, backgroundColor: color }} />
      <View style={{ width: 8 * s, height: 32 * s, borderRadius: r, backgroundColor: color }} />
      <View style={{ width: 6 * s, height: 22 * s, borderRadius: r, backgroundColor: color }} />
    </View>
  );
}

export type RatingKind = "gym" | "bar" | "overall";

/** One rating unit: filled uses the scale's brand color, empty is muted. */
export function RatingGlyph({
  kind,
  size = 26,
  filled = true,
}: {
  kind: RatingKind;
  size?: number;
  filled?: boolean;
}) {
  if (kind === "gym") {
    return (
      <BarbellIcon size={size} color={filled ? colors.ratingGym : colors.ratingInactive} />
    );
  }
  if (kind === "bar") {
    return (
      <MartiniIcon size={size} color={filled ? colors.ratingBar : colors.ratingInactive} />
    );
  }
  // Overall keeps the star.
  return (
    <Text style={{ fontSize: size, opacity: filled ? 1 : 0.3 }} allowFontScaling={false}>
      ⭐
    </Text>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: "center", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center" },
});
