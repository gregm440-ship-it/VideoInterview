import { Pressable, StyleSheet, Text, View } from "react-native";
import { RatingGlyph, type RatingKind } from "./RatingIcons";
import { MAX_RATING } from "../lib/constants";
import { colors, radius, spacing } from "../lib/theme";

const KIND_TINT: Record<RatingKind, string> = {
  bar: colors.primaryTint, // sun
  gym: colors.accentTint, // sky
  overall: colors.primaryTint,
};

const KIND_EDGE: Record<RatingKind, string> = {
  bar: colors.ratingBar,
  gym: colors.ratingGym,
  overall: colors.primary,
};

/**
 * The signature input: a tappable row of brand glyphs (martini for bar,
 * barbell for gym). Tap the 4th = 4/5. No typing. One tap sets a complete
 * score — the core of the <30s, ≤3-tap fast path.
 */
export function RatingRow({
  kind,
  label,
  value,
  onChange,
  hint,
}: {
  kind: RatingKind;
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <View style={styles.block}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <RatingGlyph kind={kind} size={16} filled />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.hint}>{value > 0 ? `${value}/5` : hint ?? "tap to rate"}</Text>
      </View>
      <View style={styles.row}>
        {Array.from({ length: MAX_RATING }, (_, i) => {
          const n = i + 1;
          const active = n <= value;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${n} of ${MAX_RATING}`}
              onPress={() => onChange(n)}
              style={({ pressed }) => [
                styles.pip,
                active && { backgroundColor: KIND_TINT[kind], borderColor: KIND_EDGE[kind] },
                pressed && styles.pipPressed,
              ]}
            >
              <RatingGlyph kind={kind} size={24} filled={active} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: spacing.sm },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  labelLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  label: { color: colors.text, fontSize: 16, fontWeight: "700" },
  hint: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  row: { flexDirection: "row", gap: spacing.sm },
  pip: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pipPressed: { opacity: 0.7 },
});
