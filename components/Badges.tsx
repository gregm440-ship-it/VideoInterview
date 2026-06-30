import { StyleSheet, Text, View } from "react-native";
import { computeBadges, computeTier, type UserStats } from "../lib/badges";
import { colors, radius, spacing } from "../lib/theme";

/** Tier pill + progress to the next tier. */
export function TierPill({ stats }: { stats: UserStats }) {
  const { current, next, toNext } = computeTier(stats);
  return (
    <View style={styles.tierRow}>
      <View style={[styles.tierPill, { borderColor: current.color }]}>
        <Text style={styles.tierEmoji}>{current.emoji}</Text>
        <Text style={[styles.tierLabel, { color: current.color }]}>{current.label}</Text>
      </View>
      {next ? (
        <Text style={styles.tierNext}>
          {toNext} more review{toNext === 1 ? "" : "s"} → {next.emoji} {next.label}
        </Text>
      ) : (
        <Text style={styles.tierNext}>Top tier reached 🎉</Text>
      )}
    </View>
  );
}

/** Grid of badges: earned ones lit, locked ones dim with progress. */
export function BadgeGrid({ stats }: { stats: UserStats }) {
  const badges = computeBadges(stats);
  return (
    <View style={styles.grid}>
      {badges.map((b) => (
        <View key={b.key} style={[styles.badge, b.earned ? styles.earned : styles.locked]}>
          <Text style={[styles.emoji, !b.earned && styles.dim]}>{b.emoji}</Text>
          <Text style={[styles.label, !b.earned && styles.dimText]} numberOfLines={1}>
            {b.label}
          </Text>
          <Text style={styles.sub}>
            {b.earned ? "Earned" : `${Math.min(b.value, b.target)}/${b.target}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tierRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  tierPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  tierEmoji: { fontSize: 16 },
  tierLabel: { fontSize: 14, fontWeight: "800" },
  tierNext: { color: colors.textMuted, fontSize: 12, flexShrink: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  badge: {
    width: "31%",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    gap: 2,
  },
  earned: { backgroundColor: colors.surface, borderColor: colors.primary },
  locked: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  emoji: { fontSize: 26 },
  dim: { opacity: 0.35 },
  label: { color: colors.text, fontSize: 12, fontWeight: "700", textAlign: "center" },
  dimText: { color: colors.textMuted },
  sub: { color: colors.textMuted, fontSize: 11 },
});
