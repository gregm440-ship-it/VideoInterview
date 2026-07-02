import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { useAuth } from "../../hooks/useAuth";
import { getMyLog, type LogEntry } from "../../lib/reviews";
import { displayImageUrl } from "../../lib/places";
import { ICONS } from "../../lib/constants";
import { colors, radius, spacing, TAP_TARGET } from "../../lib/theme";

export default function MyLogScreen() {
  const { isAuthenticated } = useAuth();
  const [q, setQ] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["myLog"],
    enabled: isAuthenticated,
    queryFn: getMyLog,
  });

  const entries = useMemo(() => {
    const list = data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (e: LogEntry) =>
        e.hotel.name.toLowerCase().includes(term) ||
        (e.hotel.city ?? "").toLowerCase().includes(term)
    );
  }, [data, q]);

  if (!isAuthenticated) {
    return (
      <Screen>
        <Text style={styles.title}>My Log</Text>
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Sign in to start your travel log — every hotel you rate or save lives here.
          </Text>
          <Button label="Sign in" onPress={() => router.push("/sign-in")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Log</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Search my hotels…"
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.retry} onPress={() => refetch()}>
            Couldn’t load. Tap to retry.
          </Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {q ? "No matches." : "Nothing logged yet. Rate a hotel to get started."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.review.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <LogRow entry={item} />}
        />
      )}
    </Screen>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const { review, hotel } = entry;
  const rated = review.overall_rating != null;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => router.push(`/hotel/${hotel.google_place_id}`)}
    >
      {hotel.image_url ? (
        <Image source={{ uri: displayImageUrl(hotel.image_url)! }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={{ fontSize: 22 }}>🏨</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {hotel.name}
        </Text>
        <Text style={styles.meta}>
          {hotel.city ?? "—"}
          {rated
            ? ` · ${ICONS.gym}${review.gym_rating} · ${ICONS.bar}${review.bar_rating} · ${ICONS.overall}${review.overall_rating}`
            : ""}
        </Text>
        {review.note ? (
          <Text style={styles.note} numberOfLines={1}>
            “{review.note}”
          </Text>
        ) : !rated ? (
          <Text style={styles.saved}>Saved · not yet rated</Text>
        ) : null}
      </View>
      {review.is_private_log && (
        <View style={styles.privBadge}>
          <Text style={styles.privText}>🔒 Private</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: spacing.md },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: TAP_TARGET,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, color: colors.text, fontSize: 16 },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  thumbFallback: { backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 12 },
  note: { color: colors.textMuted, fontSize: 12, fontStyle: "italic" },
  saved: { color: colors.textMuted, fontSize: 12 },
  privBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  privText: { color: colors.accent, fontSize: 10, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: "center", maxWidth: 280 },
  retry: { color: colors.accent, fontWeight: "700" },
});
