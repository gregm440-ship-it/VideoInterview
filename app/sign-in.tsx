import { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { useAuth } from "../hooks/useAuth";
import { colors, radius, spacing, TAP_TARGET } from "../lib/theme";

export default function SignInScreen() {
  const { signInWithApple, signInWithGoogle, signInWithEmail, continueAsGuest } =
    useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<null | "apple" | "google" | "email">(null);

  const run = async (
    kind: "apple" | "google" | "email",
    fn: () => Promise<void>
  ) => {
    try {
      setBusy(kind);
      await fn();
      if (kind !== "email") router.back();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      // Apple/Google user-cancel shouldn't read as an error.
      if (!/cancel/i.test(message)) Alert.alert("Sign in", message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Logo size="lg" layout="stacked" />
        <Text style={styles.tagline}>
          Rate the gym. Rate the bar. Help the next traveler.
        </Text>
      </View>

      <View style={styles.actions}>
        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={radius.md}
            style={styles.appleButton}
            onPress={() => run("apple", signInWithApple)}
          />
        )}

        <Button
          label="Continue with Google"
          variant="secondary"
          loading={busy === "google"}
          onPress={() => run("google", signInWithGoogle)}
        />

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.line} />
        </View>

        {sent ? (
          <Text style={styles.sentText}>
            Check your email — we sent a magic link to {email}.
          </Text>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Button
              label="Email me a magic link"
              variant="ghost"
              loading={busy === "email"}
              disabled={!email.includes("@")}
              onPress={() =>
                run("email", async () => {
                  await signInWithEmail(email);
                  setSent(true);
                })
              }
            />
          </>
        )}
      </View>

      <View style={styles.guest}>
        <Button
          label="Continue as guest"
          variant="ghost"
          onPress={() => {
            continueAsGuest();
            router.back();
          }}
        />
        <Text style={styles.guestNote}>
          Browse and read freely. An account is only needed to post.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.xl, alignItems: "center" },
  tagline: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: spacing.md,
    textAlign: "center",
  },
  actions: { gap: spacing.md },
  appleButton: { height: TAP_TARGET, width: "100%" },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted },
  input: {
    minHeight: TAP_TARGET,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  sentText: { color: colors.accent, fontSize: 15, textAlign: "center" },
  guest: { marginTop: spacing.xl, alignItems: "center" },
  guestNote: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
