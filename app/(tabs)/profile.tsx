import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { Logo } from "../../components/Logo";
import { useAuth } from "../../hooks/useAuth";
import { colors, spacing } from "../../lib/theme";

export default function ProfileScreen() {
  const { user, isGuest, isAuthenticated, loading, signOut } = useAuth();

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Logo size="md" style={styles.brand} />

      {isAuthenticated ? (
        <View style={styles.block}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{user?.email ?? user?.id}</Text>
          <Button label="Sign out" variant="secondary" onPress={signOut} />
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.value}>
            {isGuest ? "Browsing as a guest." : "You're not signed in."}
          </Text>
          <Text style={styles.muted}>
            Search and read freely. Sign in to rate hotels and build your travel
            log.
          </Text>
          <Button
            label="Sign in or create account"
            onPress={() => router.push("/sign-in")}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  brand: { marginBottom: spacing.lg },
  block: { gap: spacing.md },
  label: { color: colors.textMuted, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  value: { color: colors.text, fontSize: 18, fontWeight: "600" },
  muted: { color: colors.textMuted, fontSize: 15 },
});
