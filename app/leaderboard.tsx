import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "../components/Avatar";
import {
  getTopHotels,
  getTopReviewers,
  HOTEL_METRICS,
  type HotelMetric,
} from "../lib/leaderboard";
import { ICONS } from "../lib/constants";
import { colors, radius, spacing } from "../lib/theme";

type Board = "hotels" | "reviewers";

function rankLabel(i: number): string {
  return ["🥇", "🥈", "🥉"][i] ?? `${i + 1}`;
}

export default function LeaderboardScreen() {
  const [board, setBoard] = useState<Board>("hotels");
  const [metric, setMetric] = useState<HotelMetric>("avg_overall");

  const hotels = useQuery({
    queryKey: ["topHotels", metric],
    enabled: board === "hotels",
    queryFn: () => getTopHotels(metric),
  });
  const reviewers = useQuery({
    queryKey: ["topReviewers"],
    enabled: board === "reviewers",
    queryFn: () => getTopReviewers(),
  });

  const loading = board === "hotels" ? hotels.isLoading : reviewers.isLoading;
  const metricIcon =
    metric === "avg_gym" ? ICONS.gym : metric === "avg_bar" ? ICONS.bar : ICONS.overall;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: "Leaderboard" }} />

      <View style={styles.controls}>
        <Segmented
          options={[
            { value: "hotels", label: "🏨 Top hotels" },
            { value: "reviewers", label: "👤 Top reviewers" },
          ]}
          value={board}
          onChange={setBoard}
        />
        {board === "hotels" && (
          <Segmented
            options={HOTEL_METRICS.map((m) => ({ value: m.key, label: m.label }))}
            value={metric}
            onChange={setMetric}
            small
          />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : board === "hotels" ? (
        <FlatList
          data={hotels.data ?? []}
          keyExtractor={(h) => h.hotel.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Empty text="No rated hotels yet." />}
          renderItem={({ item, index }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push(`/hotel/${item.hotel.google_place_id}`)}
            >
              <Text style={styles.rank}>{rankLabel(index)}</Text>
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.hotel.name}
                </Text>
                <Text style={styles.meta}>
                  {item.hotel.city ?? ""} · {item.aggregate.review_count} review
                  {item.aggregate.review_count === 1 ? "" : "s"}
                </Text>
              </View>
              <Text style={styles.score}>
                {metricIcon} {Number(item.aggregate[metric]).toFixed(1)}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={reviewers.data ?? []}
          keyExtractor={(r) => r.user_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Empty text="No reviewers yet." />}
          renderItem={({ item, index }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push(`/user/${item.user_id}`)}
            >
              <Text style={styles.rank}>{rankLabel(index)}</Text>
              <Avatar name={item.display_name} url={item.avatar_url} size={36} />
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.display_name?.trim() || "Traveler"}
                </Text>
                <Text style={styles.meta}>
                  {item.review_count} review{item.review_count === 1 ? "" : "s"} ·{" "}
                  {item.helpful_count} helpful
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  small,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn, small && styles.segmentSmall]}
          >
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  controls: { padding: spacing.md, gap: spacing.sm },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: "center" },
  segmentSmall: { paddingVertical: 6 },
  segmentOn: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  segmentTextOn: { color: colors.onPrimary },
  list: { padding: spacing.md, paddingTop: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  rank: { fontSize: 16, fontWeight: "800", color: colors.text, minWidth: 26, textAlign: "center" },
  rowBody: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  score: { color: colors.text, fontSize: 15, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: "center" },
});
