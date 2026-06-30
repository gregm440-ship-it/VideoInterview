import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  getHotelReviews,
  getHotelPhotos,
  getHotelTagSummary,
  toggleHelpful,
  reportContent,
  type CommunityReview,
  type TagCount,
} from "../lib/reviews";
import type { ReviewPhoto } from "../lib/database.types";
import { tagLabel } from "../lib/tags";
import { queryClient } from "../lib/queryClient";
import { ICONS } from "../lib/constants";
import { colors, radius, spacing } from "../lib/theme";

export function CommunityReviews({
  hotelId,
  isAuthenticated,
}: {
  hotelId: string;
  isAuthenticated: boolean;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const reviews = useQuery({
    queryKey: ["hotelReviews", hotelId],
    queryFn: () => getHotelReviews(hotelId),
  });
  const photos = useQuery({
    queryKey: ["hotelPhotos", hotelId],
    queryFn: () => getHotelPhotos(hotelId),
  });
  const tags = useQuery({
    queryKey: ["hotelTags", hotelId],
    queryFn: () => getHotelTagSummary(hotelId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["hotelReviews", hotelId] });
    queryClient.invalidateQueries({ queryKey: ["hotelPhotos", hotelId] });
  };

  const helpful = useMutation({
    mutationFn: (reviewId: string) => toggleHelpful(reviewId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["hotelReviews", hotelId] }),
    onError: (e: unknown) =>
      Alert.alert("Vote failed", e instanceof Error ? e.message : "Try again."),
  });

  const report = (opts: { reviewId?: string; photoId?: string }) => {
    if (!isAuthenticated) return router.push("/sign-in");
    Alert.alert("Report content", "Hide this pending review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          try {
            await reportContent(opts);
            invalidate();
          } catch (e) {
            Alert.alert("Report failed", e instanceof Error ? e.message : "Try again.");
          }
        },
      },
    ]);
  };

  const onHelpful = (reviewId: string) => {
    if (!isAuthenticated) return router.push("/sign-in");
    helpful.mutate(reviewId);
  };

  if (reviews.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />;
  }

  const tagChips = [
    ...(tags.data?.gym ?? []).map((t: TagCount) => ({ ...t, icon: ICONS.gym })),
    ...(tags.data?.bar ?? []).map((t: TagCount) => ({ ...t, icon: ICONS.bar })),
  ];

  return (
    <View style={{ marginTop: spacing.lg }}>
      {tagChips.length > 0 && (
        <>
          <Text style={styles.sectionH}>Most-applied tags</Text>
          <View style={styles.chips}>
            {tagChips.map((t) => (
              <View key={`${t.tag_type}:${t.tag_key}`} style={styles.chip}>
                <Text style={styles.chipText}>
                  {t.icon} {tagLabel(t.tag_key)} · {t.count}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <PhotoStrip title="Gym photos" photos={photos.data?.gym ?? []} onOpen={setLightbox} onReport={(id) => report({ photoId: id })} />
      <PhotoStrip title="Bar photos" photos={photos.data?.bar ?? []} onOpen={setLightbox} onReport={(id) => report({ photoId: id })} />

      <Text style={styles.sectionH}>
        Community reviews{reviews.data?.length ? ` · ${reviews.data.length}` : ""}
      </Text>
      {reviews.data && reviews.data.length > 0 ? (
        reviews.data.map((r: CommunityReview) => (
          <ReviewCard
            key={r.id}
            review={r}
            onHelpful={() => onHelpful(r.id)}
            onReport={() => report({ reviewId: r.id })}
            voting={helpful.isPending}
          />
        ))
      ) : (
        <Text style={styles.empty}>No public reviews yet. Be the first.</Text>
      )}

      <Modal visible={lightbox != null} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable style={styles.lightbox} onPress={() => setLightbox(null)}>
          {lightbox && <Image source={{ uri: lightbox }} style={styles.lightboxImg} contentFit="contain" />}
        </Pressable>
      </Modal>
    </View>
  );
}

function PhotoStrip({
  title,
  photos,
  onOpen,
  onReport,
}: {
  title: string;
  photos: ReviewPhoto[];
  onOpen: (url: string) => void;
  onReport: (photoId: string) => void;
}) {
  if (photos.length === 0) return null;
  return (
    <>
      <Text style={styles.sectionH}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
        {photos.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onOpen(p.url)}
            onLongPress={() => onReport(p.id)}
            style={styles.stripItem}
          >
            <Image source={{ uri: p.url }} style={styles.stripImg} contentFit="cover" transition={150} />
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

function ReviewCard({
  review,
  onHelpful,
  onReport,
  voting,
}: {
  review: CommunityReview;
  onHelpful: () => void;
  onReport: () => void;
  voting: boolean;
}) {
  const name = review.author?.display_name?.trim() || "Traveler";
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.cardName}>{name}</Text>
        <Text style={styles.cardScores}>
          {ICONS.gym}
          {review.gym_rating ?? "–"} {ICONS.bar}
          {review.bar_rating ?? "–"} {ICONS.overall}
          {review.overall_rating ?? "–"}
        </Text>
      </View>
      {review.note ? <Text style={styles.cardNote}>{review.note}</Text> : null}
      {review.tags.length > 0 && (
        <View style={styles.cardTags}>
          {review.tags.map((t) => (
            <Text key={`${t.tag_type}:${t.tag_key}`} style={styles.cardTag}>
              {t.tag_type === "gym" ? ICONS.gym : ICONS.bar} {tagLabel(t.tag_key)}
            </Text>
          ))}
        </View>
      )}
      <View style={styles.cardActions}>
        <Pressable
          onPress={onHelpful}
          disabled={voting}
          style={[styles.helpful, review.votedByMe && styles.helpfulOn]}
        >
          <Ionicons
            name={review.votedByMe ? "thumbs-up" : "thumbs-up-outline"}
            size={13}
            color={review.votedByMe ? colors.onPrimary : colors.textMuted}
          />
          <Text style={[styles.helpfulText, review.votedByMe && styles.helpfulTextOn]}>
            Helpful{review.helpfulCount > 0 ? ` · ${review.helpfulCount}` : ""}
          </Text>
        </Pressable>
        <Pressable onPress={onReport} hitSlop={8} style={styles.report}>
          <Ionicons name="flag-outline" size={14} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionH: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipText: { color: colors.text, fontSize: 11 },
  strip: { flexGrow: 0 },
  stripItem: { marginRight: spacing.sm },
  stripImg: { width: 110, height: 84, borderRadius: radius.sm },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.onAccent, fontSize: 11, fontWeight: "800" },
  cardName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  cardScores: { color: colors.text, fontSize: 13, fontWeight: "700", marginLeft: "auto" },
  cardNote: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  cardTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  cardTag: {
    color: colors.textMuted,
    fontSize: 11,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardActions: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  helpful: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  helpfulOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  helpfulText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  helpfulTextOn: { color: colors.onPrimary },
  report: { marginLeft: "auto", padding: 6 },
  empty: { color: colors.textMuted, fontSize: 14 },
  lightbox: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  lightboxImg: { width: "92%", height: "70%" },
});
