import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/Button";
import { BigScores } from "../../components/BigScores";
import { CommunityReviews } from "../../components/CommunityReviews";
import { useAuth } from "../../hooks/useAuth";
import { useHotelDetail } from "../../hooks/useHotels";
import { saveToLog } from "../../lib/reviews";
import { colors, radius, spacing } from "../../lib/theme";

export default function HotelDetailScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError, error } = useHotelDetail(
    placeId ?? "",
    isAuthenticated
  );

  const save = useMutation({
    mutationFn: () => {
      if (!data) throw new Error("Hotel not loaded yet.");
      return saveToLog(data.place);
    },
    onSuccess: () => Alert.alert("Saved", "Added to your travel log."),
    onError: (e: unknown) =>
      Alert.alert("Couldn’t save", e instanceof Error ? e.message : "Try again."),
  });

  const requireAuth = (then: () => void) => {
    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }
    then();
  };

  const region = useMemo(() => {
    if (!data?.place.lat || !data?.place.lng) return null;
    return {
      latitude: data.place.lat,
      longitude: data.place.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [data]);

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
        <Text style={styles.error}>
          {(error as Error)?.message ?? "Couldn’t load this hotel."}
        </Text>
      </Centered>
    );
  }

  const { place, aggregate } = data;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: place.name, headerBackTitle: "Search" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroWrap}>
          {place.image_url ? (
            <Image source={{ uri: place.image_url }} style={styles.hero} contentFit="cover" />
          ) : (
            <View style={[styles.hero, styles.heroFallback]}>
              <Text style={{ fontSize: 48 }}>🏨</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{place.name}</Text>
          {place.address ? <Text style={styles.address}>{place.address}</Text> : null}

          <View style={styles.scores}>
            <BigScores aggregate={aggregate} />
          </View>

          {region && (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              pointerEvents="none"
              initialRegion={region}
            >
              <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
            </MapView>
          )}

          <View style={styles.cta}>
            <Button
              label="Rate this hotel"
              style={{ flex: 1 }}
              onPress={() => requireAuth(() => router.push(`/review/${placeId}`))}
            />
            <Button
              label="＋ My log"
              variant="secondary"
              loading={save.isPending}
              style={{ flex: 1 }}
              onPress={() => requireAuth(() => save.mutate())}
            />
          </View>

          {/* Community reviews, gym/bar photo strips, top tags, helpful votes. */}
          {data.hotelId ? (
            <CommunityReviews hotelId={data.hotelId} isAuthenticated={isAuthenticated} />
          ) : (
            <View style={styles.phase2}>
              <Ionicons name="chatbubbles-outline" size={22} color={colors.textMuted} />
              <Text style={styles.phase2Text}>
                No reviews yet — be the first to rate this hotel.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={[styles.root, styles.center]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center", padding: spacing.lg },
  error: { color: colors.danger, textAlign: "center" },
  scroll: { paddingBottom: spacing.xl },
  heroWrap: { height: 200 },
  hero: { width: "100%", height: "100%" },
  heroFallback: { backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.md },
  name: { color: colors.text, fontSize: 24, fontWeight: "800" },
  address: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  scores: { marginTop: spacing.lg },
  map: {
    height: 130,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    overflow: "hidden",
  },
  cta: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  phase2: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    gap: spacing.sm,
  },
  phase2Text: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
});
