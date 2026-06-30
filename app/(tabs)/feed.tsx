import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { Avatar } from "../../components/Avatar";
import { useAuth } from "../../hooks/useAuth";
import { useFeed } from "../../hooks/useSocial";
import type { FeedItem } from "../../lib/social";
import { ICONS } from "../../lib/constants";
import { formatShort } from "../../lib/dates";
import { colors, radius, spacing } from "../../lib/theme";

export default function FeedScreen() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError, refetch } = useFeed();

  if (!isAuthenticated) {
    return (
      <Screen>
        <Text style={styles.title}>Feed</Text>
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Sign in and follow other travelers to see what they’re rating.
          </Text>
          <Button label="Sign in" onPress={() => router.push("/sign-in")} />
        </View>
      </Screen>
    );
  }

  const items = data ?? [];

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
        <Pressable
          style={styles.trophy}
          onPress={() => router.push("/leaderboard")}
          hitSlop={8}
        >
          <Ionicons name="trophy" size={16} color={colors.onPrimary} />
          <Text style={styles.trophyText}>Leaderboard</Text>
        </Pressable>
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
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Your feed is empty. Tap a reviewer’s name on any hotel to see their
            profile and follow them.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <FeedRow item={item} />}
        />
      )}
    </Screen>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const name = item.author.display_name?.trim() || "Traveler";
  return (
    <View style={styles.row}>
      <Pressable onPress={() => router.push(`/user/${item.author.id}`)}>
        <Avatar name={name} url={item.author.avatar_url} size={40} />
      </Pressable>
      <Pressable style={styles.body} onPress={() => router.push(`/hotel/${item.hotel.google_place_id}`)}>
        <Text style={styles.line}>
          <Text style={styles.name} onPress={() => router.push(`/user/${item.author.id}`)}>
            {name}
          </Text>
          <Text style={styles.muted}> rated </Text>
          <Text style={styles.hotel}>{item.hotel.name}</Text>
        </Text>
        <Text style={styles.scores}>
          {ICONS.gym}
          {item.gym_rating ?? "–"} {ICONS.bar}
          {item.bar_rating ?? "–"} {ICONS.overall}
          {item.overall_rating ?? "–"}
          <Text style={styles.muted}>
            {"  ·  "}
            {item.hotel.city ?? ""} · {formatShort(item.created_at.slice(0, 10))}
          </Text>
        </Text>
        {item.note ? (
          <Text style={styles.note} numberOfLines={2}>
            “{item.note}”
          </Text>
        ) : null}
      </Pressable>
      {item.hotel.image_url ? (
        <Pressable onPress={() => router.push(`/hotel/${item.hotel.google_place_id}`)}>
          <Image source={{ uri: item.hotel.image_url }} style={styles.thumb} contentFit="cover" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  trophy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  trophyText: { color: colors.onPrimary, fontSize: 13, fontWeight: "700" },
  list: { padding: spacing.md, paddingTop: 0 },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  body: { flex: 1, gap: 3 },
  line: { color: colors.text, fontSize: 14 },
  name: { fontWeight: "800", color: colors.text },
  hotel: { fontWeight: "700", color: colors.text },
  muted: { color: colors.textMuted, fontWeight: "400" },
  scores: { color: colors.text, fontSize: 13, fontWeight: "700" },
  note: { color: colors.textMuted, fontSize: 13, fontStyle: "italic" },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: "center", maxWidth: 300 },
  retry: { color: colors.accent, fontWeight: "700" },
});
