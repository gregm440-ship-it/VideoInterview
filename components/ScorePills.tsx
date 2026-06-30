import { StyleSheet, Text, View } from "react-native";
import type { HotelAggregate } from "../lib/database.types";
import { ICONS } from "../lib/constants";
import { colors, radius, spacing } from "../lib/theme";

function fmt(n: number, count: number): string {
  return count > 0 ? n.toFixed(1) : "—";
}

/** Compact 🏋️ · 🍸 · ⭐ row for result + log cards. Both scores at a glance. */
export function ScorePills({
  aggregate,
  reviewCount,
}: {
  aggregate: HotelAggregate | null;
  reviewCount?: number;
}) {
  const count = aggregate?.review_count ?? 0;
  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <Text style={styles.icon}>{ICONS.gym}</Text>
        <Text style={styles.val}>{fmt(aggregate?.avg_gym ?? 0, count)}</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.icon}>{ICONS.bar}</Text>
        <Text style={styles.val}>{fmt(aggregate?.avg_bar ?? 0, count)}</Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.icon}>{ICONS.overall}</Text>
        <Text style={styles.val}>{fmt(aggregate?.avg_overall ?? 0, count)}</Text>
      </View>
      <Text style={styles.count}>
        {count > 0 ? `${reviewCount ?? count} reviews` : "No ratings yet"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  icon: { fontSize: 12 },
  val: { color: colors.text, fontSize: 12, fontWeight: "700" },
  count: { marginLeft: "auto", color: colors.textMuted, fontSize: 11 },
});
