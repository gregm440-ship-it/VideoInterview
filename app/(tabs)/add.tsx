import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { HotelCard } from "../../components/HotelCard";
import { useAuth } from "../../hooks/useAuth";
import { useLocation } from "../../hooks/useLocation";
import { useHotelSearch } from "../../hooks/useHotels";
import type { HotelCard as HotelCardData } from "../../lib/hotels";
import { colors, radius, spacing, TAP_TARGET } from "../../lib/theme";

export default function AddScreen() {
  const { isAuthenticated } = useAuth();
  const { location } = useLocation();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useHotelSearch(debounced, location, isAuthenticated);
  const hotels: HotelCardData[] = data ?? [];

  if (!isAuthenticated) {
    return (
      <Screen>
        <Text style={styles.title}>Rate a hotel</Text>
        <View style={styles.empty}>
          <Ionicons name="add-circle-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Sign in to rate hotels. Browsing and reading stay free — an account is
            only needed to post.
          </Text>
          <Button label="Sign in" onPress={() => router.push("/sign-in")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Rate a hotel</Text>
        <Text style={styles.sub}>Pick the hotel you stayed at — then it’s three taps.</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Search hotels near you"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={hotels}
          keyExtractor={(h) => h.google_place_id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <HotelCard
              hotel={item}
              onPress={() => router.push(`/review/${item.google_place_id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: 2, marginBottom: spacing.md },
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: "center", maxWidth: 300 },
});
