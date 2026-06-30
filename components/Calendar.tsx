import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toISO, todayISO } from "../lib/dates";
import { colors, radius, spacing } from "../lib/theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Compact month calendar with check-in → check-out range selection.
 * Pure RN, no native date-picker dependency. Dates are YYYY-MM-DD strings.
 */
export function Calendar({
  checkIn,
  checkOut,
  onChange,
}: {
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
}) {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const today = todayISO();

  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(view.year, view.month, d)));

  const step = (delta: number) => {
    const m = view.month + delta;
    setView({ year: view.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 });
  };

  const onDay = (iso: string) => {
    if (!checkIn || (checkIn && checkOut)) onChange(iso, null);
    else if (iso <= checkIn) onChange(iso, null);
    else onChange(checkIn, iso);
  };

  const canGoBack = view.year > now.getFullYear() || view.month > now.getMonth();

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => step(-1)} disabled={!canGoBack} hitSlop={8} style={styles.nav}>
          <Ionicons
            name="chevron-back"
            size={20}
            color={canGoBack ? colors.text : colors.border}
          />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTHS[view.month]} {view.year}
        </Text>
        <Pressable onPress={() => step(1)} hitSlop={8} style={styles.nav}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((iso, i) => {
          if (!iso) return <View key={`b${i}`} style={styles.cell} />;
          const past = iso < today;
          const isStart = iso === checkIn;
          const isEnd = iso === checkOut;
          const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;
          const endpoint = isStart || isEnd;
          return (
            <Pressable
              key={iso}
              style={styles.cell}
              disabled={past}
              onPress={() => onDay(iso)}
            >
              <View
                style={[
                  styles.day,
                  inRange && styles.dayInRange,
                  endpoint && styles.dayEndpoint,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    past && styles.dayPast,
                    endpoint && styles.dayTextEndpoint,
                  ]}
                >
                  {Number(iso.slice(8))}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  nav: { padding: 4 },
  monthLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
  weekRow: { flexDirection: "row" },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 },
  day: { width: "100%", height: "100%", borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  dayInRange: { backgroundColor: colors.primaryTint, borderRadius: 0 },
  dayEndpoint: { backgroundColor: colors.primary, borderRadius: radius.sm },
  dayText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  dayPast: { color: colors.border },
  dayTextEndpoint: { color: colors.onPrimary, fontWeight: "800" },
});
