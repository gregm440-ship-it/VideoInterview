import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { HotelCard } from "../../components/HotelCard";
import { Logo } from "../../components/Logo";
import { useLocation } from "../../hooks/useLocation";
import { useHotelSearch } from "../../hooks/useHotels";
import type { HotelCard as HotelCardData } from "../../lib/hotels";
import { colors, radius, spacing, TAP_TARGET } from "../../lib/theme";

type ViewMode = "list" | "map";

export default function SearchScreen() {
  const { location, hasFix, status, request } = useLocation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [mode, setMode] = useState<ViewMode>("list");

  // Debounce typing so we don't fire a Places call per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isError, error, refetch, isFetching } = useHotelSearch(
    debounced,
    location
  );

  const hotels: HotelCardData[] = data ?? [];
  const open = (h: HotelCardData) => router.push(`/hotel/${h.google_place_id}`);

  const locationLabel = useMemo(() => {
    if (status === "denied") return "Location off · tap to enable";
    if (debounced.trim()) return `Results for “${debounced.trim()}”`;
    return hasFix ? "Near me" : "Near me (approx.)";
  }, [status, debounced, hasFix]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Logo size="sm" style={styles.brandHeader} />

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Hotel, brand, or place"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textMuted}
              onPress={() => setQuery("")}
            />
          )}
        </View>

        <View style={styles.locRow}>
          <Ionicons name="location" size={14} color={colors.accent} />
          <Text
            style={styles.locText}
            onPress={status === "denied" ? request : undefined}
          >
            {locationLabel}
          </Text>
          {isFetching && <ActivityIndicator size="small" color={colors.textMuted} />}
        </View>

        <View style={styles.toggle}>
          {(["list", "map"] as ViewMode[]).map((m) => (
            <Text
              key={m}
              onPress={() => setMode(m)}
              style={[styles.toggleItem, mode === m && styles.toggleItemOn]}
            >
              {m === "list" ? "List" : "Map"}
            </Text>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {(error as Error)?.message ?? "Search failed."}
          </Text>
          <Text style={styles.retry} onPress={() => refetch()}>
            Tap to retry
          </Text>
        </View>
      ) : hotels.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>No hotels found here. Try a different place.</Text>
        </View>
      ) : mode === "list" ? (
        <FlatList
          data={hotels}
          keyExtractor={(h) => h.google_place_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HotelCard hotel={item} onPress={() => open(item)} />
          )}
        />
      ) : (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
        >
          {hotels
            .filter((h) => h.lat != null && h.lng != null)
            .map((h) => (
              <Marker
                key={h.google_place_id}
                coordinate={{ latitude: h.lat as number, longitude: h.lng as number }}
                title={h.name}
                description={
                  h.aggregate && h.aggregate.review_count > 0
                    ? `🏋️ ${h.aggregate.avg_gym.toFixed(1)} · 🍸 ${h.aggregate.avg_bar.toFixed(1)}`
                    : "No ratings yet"
                }
                onCalloutPress={() => open(h)}
              />
            ))}
        </MapView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  brandHeader: { marginBottom: spacing.md },
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
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  locText: { color: colors.textMuted, fontSize: 13 },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 3,
    marginTop: spacing.md,
  },
  toggleItem: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 7,
    borderRadius: radius.sm,
    color: colors.textMuted,
    fontWeight: "600",
    overflow: "hidden",
  },
  toggleItemOn: { backgroundColor: colors.primary, color: colors.onPrimary },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  map: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.sm },
  muted: { color: colors.textMuted, textAlign: "center" },
  errorText: { color: colors.danger, textAlign: "center" },
  retry: { color: colors.accent, fontWeight: "700" },
});
