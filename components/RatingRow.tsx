import { Pressable, StyleSheet, Text, View } from "react-native";
import { MAX_RATING } from "../lib/constants";
import { colors, radius, spacing } from "../lib/theme";

/**
 * The signature input: a tappable row of icons. Tap the 4th = 4/5. No typing.
 * One tap sets a complete score — the core of the <30s, ≤3-tap fast path.
 */
export function RatingRow({
  icon,
  label,
  value,
  onChange,
  hint,
}: {
  icon: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <View style={styles.block}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {icon} {label}
        </Text>
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
                active && styles.pipActive,
                pressed && styles.pipPressed,
              ]}
            >
              <Text style={[styles.icon, !active && styles.iconInactive]}>{icon}</Text>
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
  pipActive: {
    backgroundColor: "rgba(232,184,75,0.16)",
    borderColor: colors.primary,
  },
  pipPressed: { opacity: 0.7 },
  icon: { fontSize: 24 },
  iconInactive: { opacity: 0.3 },
});
