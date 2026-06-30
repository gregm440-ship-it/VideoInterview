import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../lib/theme";

/** Single-column, padded, safe-area screen container. One screen = one job. */
export function Screen({
  children,
  style,
  padded = true,
}: PropsWithChildren<{ style?: ViewStyle; padded?: boolean }>) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  padded: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },
});
