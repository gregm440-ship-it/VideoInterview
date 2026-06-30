import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { Logo } from "../../components/Logo";
import { BrandPicker } from "../../components/BrandPicker";
import { useAuth } from "../../hooks/useAuth";
import { useProfile } from "../../hooks/useProfile";
import { colors, spacing } from "../../lib/theme";

export default function ProfileScreen() {
  const { user, isGuest, isAuthenticated, loading, signOut } = useAuth();
  const { profile, update } = useProfile();

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!isAuthenticated) {
    return (
      <Screen>
        <Logo size="md" style={styles.brand} />
        <View style={styles.block}>
          <Text style={styles.value}>
            {isGuest ? "Browsing as a guest." : "You're not signed in."}
          </Text>
          <Text style={styles.muted}>
            Search and read freely. Sign in to rate hotels and build your travel log.
          </Text>
          <Button
            label="Sign in or create account"
            onPress={() => router.push("/sign-in")}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Logo size="md" style={styles.brand} />

        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email ?? user?.id}</Text>

        <Text style={styles.section}>Travel preferences</Text>
        <Text style={styles.sectionHint}>
          Optional. Set your go-to brands to filter search by them in one tap.
        </Text>
        <View style={styles.fields}>
          <BrandPicker
            label="Airline"
            icon="airplane-outline"
            category="airline"
            value={profile?.preferred_airline ?? null}
            onChange={(v) => update.mutate({ preferred_airline: v })}
          />
          <BrandPicker
            label="Hotel brand"
            icon="bed-outline"
            category="hotel"
            value={profile?.preferred_hotel_brand ?? null}
            onChange={(v) => update.mutate({ preferred_hotel_brand: v })}
          />
          <BrandPicker
            label="Cruise line"
            icon="boat-outline"
            category="cruise"
            value={profile?.preferred_cruise_line ?? null}
            onChange={(v) => update.mutate({ preferred_cruise_line: v })}
          />
        </View>

        <Button
          label="Sign out"
          variant="secondary"
          onPress={signOut}
          style={styles.signOut}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  brand: { marginBottom: spacing.lg },
  block: { gap: spacing.md },
  label: { color: colors.textMuted, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  value: { color: colors.text, fontSize: 18, fontWeight: "600" },
  muted: { color: colors.textMuted, fontSize: 15 },
  section: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: spacing.xl },
  sectionHint: { color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.md },
  fields: { gap: spacing.sm },
  signOut: { marginTop: spacing.xl },
});
