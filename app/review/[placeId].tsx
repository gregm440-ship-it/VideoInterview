import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/Button";
import { RatingRow } from "../../components/RatingRow";
import { TagToggles } from "../../components/TagToggles";
import { useAuth } from "../../hooks/useAuth";
import { getPlaceDetails } from "../../lib/places";
import {
  getMyReviewForPlace,
  submitReview,
  type PendingPhoto,
} from "../../lib/reviews";
import { queryClient } from "../../lib/queryClient";
import {
  ENABLE_PHOTOS,
  ENABLE_TAGS,
  ICONS,
  MAX_PHOTOS_PER_REVIEW,
} from "../../lib/constants";
import { colors, radius, spacing } from "../../lib/theme";

export default function ReviewScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const { isAuthenticated } = useAuth();

  // Ratings (0 = not yet set). Fast path requires all three.
  const [gym, setGym] = useState(0);
  const [bar, setBar] = useState(0);
  const [overall, setOverall] = useState(0);
  const [note, setNote] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [gymTags, setGymTags] = useState<Set<string>>(new Set());
  const [barTags, setBarTags] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

  const place = useQuery({
    queryKey: ["placeDetails", placeId],
    enabled: Boolean(placeId),
    queryFn: () => getPlaceDetails(placeId),
  });

  // Prefill if the user already reviewed this hotel (edit in place).
  const mine = useQuery({
    queryKey: ["myReview", placeId],
    enabled: Boolean(placeId) && isAuthenticated,
    queryFn: () => getMyReviewForPlace(placeId),
  });
  useEffect(() => {
    const r = mine.data;
    if (!r) return;
    if (r.gym_rating) setGym(r.gym_rating);
    if (r.bar_rating) setBar(r.bar_rating);
    if (r.overall_rating) setOverall(r.overall_rating);
    if (r.note) {
      setNote(r.note);
      setShowDetails(true);
    }
    setIsPrivate(r.is_private_log);
  }, [mine.data]);

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  };

  const pickPhoto = async (type: "gym" | "bar") => {
    if (photos.length >= MAX_PHOTOS_PER_REVIEW) {
      Alert.alert("Limit reached", `Up to ${MAX_PHOTOS_PER_REVIEW} photos per review.`);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotos((p) => [...p, { uri: res.assets[0].uri, type }]);
    }
  };

  const canSubmit = gym > 0 && bar > 0 && overall > 0 && Boolean(place.data);

  const submit = useMutation({
    mutationFn: () =>
      submitReview({
        place: place.data!,
        gymRating: gym,
        barRating: bar,
        overallRating: overall,
        note,
        isPrivate,
        tags: [
          ...[...gymTags].map((key) => ({ key, type: "gym" as const })),
          ...[...barTags].map((key) => ({ key, type: "bar" as const })),
        ],
        photos,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel", placeId] });
      queryClient.invalidateQueries({ queryKey: ["hotelReviews"] });
      queryClient.invalidateQueries({ queryKey: ["myLog"] });
      queryClient.invalidateQueries({ queryKey: ["hotelSearch"] });
      Alert.alert("Thanks!", "Your rating is in.");
      router.back();
    },
    onError: (e: unknown) =>
      Alert.alert("Couldn’t submit", e instanceof Error ? e.message : "Try again."),
  });

  if (place.isLoading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: "Rate hotel" }} />
      <Text style={styles.h1}>{place.data?.name ?? "Rate hotel"}</Text>
      <Text style={styles.sub}>Tap to score. Three taps and you’re done.</Text>

      {/* Fast path */}
      <RatingRow icon={ICONS.gym} label="Gym" value={gym} onChange={setGym} />
      <RatingRow icon={ICONS.bar} label="Bar" value={bar} onChange={setBar} />
      <RatingRow icon={ICONS.overall} label="Overall" value={overall} onChange={setOverall} />

      {/* Add details expander */}
      {ENABLE_TAGS && (
        <Expander
          icon="create-outline"
          label="Add details"
          hint="note + tags · optional"
          open={showDetails}
          onPress={() => setShowDetails((v) => !v)}
        >
          <TextInput
            style={styles.note}
            placeholder="Anything worth noting? (optional)"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
          />
          <TagToggles
            type="gym"
            selected={gymTags}
            onToggle={(k) => setGymTags((s) => toggle(s, k))}
          />
          <TagToggles
            type="bar"
            selected={barTags}
            onToggle={(k) => setBarTags((s) => toggle(s, k))}
          />
        </Expander>
      )}

      {/* Add photos expander */}
      {ENABLE_PHOTOS && (
        <Expander
          icon="camera-outline"
          label="Add photos"
          hint={`gym / bar · up to ${MAX_PHOTOS_PER_REVIEW}`}
          open={showPhotos}
          onPress={() => setShowPhotos((v) => !v)}
        >
          <View style={styles.photoBtns}>
            <Button label={`${ICONS.gym} Add gym photo`} variant="secondary" style={{ flex: 1 }} onPress={() => pickPhoto("gym")} />
            <Button label={`${ICONS.bar} Add bar photo`} variant="secondary" style={{ flex: 1 }} onPress={() => pickPhoto("bar")} />
          </View>
          {photos.length > 0 && (
            <View style={styles.thumbs}>
              {photos.map((p, i) => (
                <View key={`${p.uri}-${i}`} style={styles.thumbWrap}>
                  <Image source={{ uri: p.uri }} style={styles.thumb} />
                  <Text style={styles.thumbTag}>{p.type === "gym" ? ICONS.gym : ICONS.bar}</Text>
                  <Pressable
                    style={styles.thumbX}
                    onPress={() => setPhotos((ps) => ps.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Expander>
      )}

      {/* Public vs private (Section 6.2) */}
      <View style={styles.privacy}>
        <Pressable
          style={[styles.privOpt, !isPrivate && styles.privOptSel]}
          onPress={() => setIsPrivate(false)}
        >
          <Text style={[styles.privText, !isPrivate && styles.privTextSel]}>
            🌍 Share with the community
          </Text>
        </Pressable>
        <Pressable
          style={[styles.privOpt, isPrivate && styles.privOptSel]}
          onPress={() => setIsPrivate(true)}
        >
          <Text style={[styles.privText, isPrivate && styles.privTextSel]}>
            🔒 Keep private to my log
          </Text>
        </Pressable>
      </View>

      <Button
        label={submit.isPending ? "Submitting…" : "Submit"}
        disabled={!canSubmit}
        loading={submit.isPending}
        onPress={() => submit.mutate()}
        style={{ marginTop: spacing.lg }}
      />
      <Text style={styles.foot}>
        {canSubmit ? "Ready — everything below the scores is optional." : "Set gym, bar, and overall to submit."}
      </Text>
    </ScrollView>
  );
}

function Expander({
  icon,
  label,
  hint,
  open,
  onPress,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.expander}>
      <Pressable style={styles.expanderHead} onPress={onPress}>
        <Ionicons name={icon} size={18} color={colors.text} />
        <Text style={styles.expanderLabel}>{label}</Text>
        <Text style={styles.expanderHint}>{hint}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>
      {open && <View style={styles.expanderBody}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  h1: { color: colors.text, fontSize: 22, fontWeight: "800" },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: 2, marginBottom: spacing.lg },
  expander: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  expanderHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  expanderLabel: { color: colors.text, fontSize: 15, fontWeight: "700" },
  expanderHint: { color: colors.textMuted, fontSize: 12, marginLeft: "auto", marginRight: spacing.sm },
  expanderBody: { padding: spacing.md, gap: spacing.sm },
  note: {
    minHeight: 70,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 15,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  photoBtns: { flexDirection: "row", gap: spacing.sm },
  thumbs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  thumbWrap: { width: 84, height: 84, borderRadius: radius.sm, overflow: "hidden" },
  thumb: { width: "100%", height: "100%" },
  thumbTag: { position: "absolute", bottom: 2, left: 4, fontSize: 14 },
  thumbX: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  privacy: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  privOpt: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  privOptSel: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  privText: { color: colors.textMuted, fontSize: 13, textAlign: "center", fontWeight: "600" },
  privTextSel: { color: colors.text },
  foot: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: spacing.sm },
});
