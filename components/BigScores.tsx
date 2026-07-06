import { StyleSheet, Text, View } from "react-native";
import type { HotelAggregate } from "../lib/database.types";
import { RatingGlyph, type RatingKind } from "./RatingIcons";
import { colors, radius, spacing } from "../lib/theme";

function Box({ kind, value, label, count }: { kind: RatingKind; value: number; label: string; count: number }) {
  return (
    <View style={styles.box}>
      <View style={styles.icon}>
        <RatingGlyph kind={kind} size={22} filled />
      </View>
      <Text style={styles.value}>
        {count > 0 ? value.toFixed(1) : "—"}
        {count > 0 && <Text style={styles.outOf}>/5</Text>}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

/** The three signature scores, shown big and clear on hotel detail (Section 5.4). */
export function BigScores({ aggregate }: { aggregate: HotelAggregate }) {
  const count = aggregate.review_count;
  return (
    <View>
      <View style={styles.row}>
        <Box kind="gym" value={aggregate.avg_gym} label="Gym" count={count} />
        <Box kind="bar" value={aggregate.avg_bar} label="Bar" count={count} />
        <Box kind="overall" value={aggregate.avg_overall} label="Overall" count={count} />
      </View>
      <Text style={styles.caption}>
        {count > 0
          ? `${count} community ${count === 1 ? "review" : "reviews"}`
          : "Be the first to rate this hotel"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  box: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  icon: { height: 26, justifyContent: "center" },
  value: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 2 },
  outOf: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  label: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 1 },
  caption: { color: colors.textMuted, fontSize: 13, textAlign: "center", marginTop: spacing.sm },
});
