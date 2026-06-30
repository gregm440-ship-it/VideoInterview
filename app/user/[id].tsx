import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Button } from "../../components/Button";
import { Avatar } from "../../components/Avatar";
import { usePublicProfile, useFollow } from "../../hooks/useSocial";
import { useAuth } from "../../hooks/useAuth";
import type { PublicProfileReview } from "../../lib/social";
import { ICONS } from "../../lib/constants";
import { colors, radius, spacing } from "../../lib/theme";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = usePublicProfile(id ?? "");
  const follow = useFollow(id ?? "");

  if (isLoading) {
    return (
      <Centered>
        <ActivityIndicator color={colors.primary} />
      </Centered>
    );
  }
  if (isError || !data) {
    return (
      <Centered>
        <Text style={styles.error}>Couldn’t load this traveler.</Text>
      </Centered>
    );
  }

  const name = data.profile?.display_name?.trim() || "Traveler";
  const subtitle = [data.profile?.traveler_type, data.profile?.home_city]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: name }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Avatar name={name} url={data.profile?.avatar_url} size={64} />
          <View style={styles.headText}>
            <Text style={styles.name}>{name}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={styles.stats}>
          <Stat n={data.reviews.length} label="Reviews" />
          <Stat n={data.counts.followers} label="Followers" />
          <Stat n={data.counts.following} label="Following" />
        </View>

        {!follow.isSelf && (
          <Button
            label={follow.isFollowing ? "Following ✓" : "Follow"}
            variant={follow.isFollowing ? "secondary" : "primary"}
            loading={follow.pending}
            onPress={() => (isAuthenticated ? follow.toggle() : router.push("/sign-in"))}
            style={styles.followBtn}
          />
        )}

        <Text style={styles.section}>Reviews</Text>
        {data.reviews.length === 0 ? (
          <Text style={styles.muted}>No public reviews yet.</Text>
        ) : (
          data.reviews.map((r: PublicProfileReview) => (
            <ProfileReview key={r.review.id} entry={r} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ProfileReview({ entry }: { entry: PublicProfileReview }) {
  const { review, hotel } = entry;
  return (
    <Pressable
      style={({ pressed }) => [styles.review, pressed && styles.pressed]}
      onPress={() => router.push(`/hotel/${hotel.google_place_id}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.reviewHotel} numberOfLines={1}>
          {hotel.name}
        </Text>
        <Text style={styles.reviewMeta}>{hotel.city ?? ""}</Text>
        {review.note ? (
          <Text style={styles.reviewNote} numberOfLines={2}>
            “{review.note}”
          </Text>
        ) : null}
      </View>
      <Text style={styles.reviewScores}>
        {ICONS.gym}
        {review.gym_rating ?? "–"} {ICONS.bar}
        {review.bar_rating ?? "–"} {ICONS.overall}
        {review.overall_rating ?? "–"}
      </Text>
    </Pressable>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={[styles.root, styles.center]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headText: { flex: 1 },
  name: { color: colors.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  stats: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  statN: { color: colors.text, fontSize: 20, fontWeight: "800" },
  statL: { color: colors.textMuted, fontSize: 12 },
  followBtn: { marginTop: spacing.lg },
  section: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.xl, marginBottom: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 15 },
  review: {
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
  reviewHotel: { color: colors.text, fontSize: 15, fontWeight: "700" },
  reviewMeta: { color: colors.textMuted, fontSize: 12 },
  reviewNote: { color: colors.textMuted, fontSize: 13, fontStyle: "italic", marginTop: 2 },
  reviewScores: { color: colors.text, fontSize: 13, fontWeight: "700" },
});
