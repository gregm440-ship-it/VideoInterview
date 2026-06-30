import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../lib/theme";

/** Phase-boundary placeholder so tabs render before their feature lands. */
export function Placeholder({
  icon,
  title,
  subtitle,
  phase,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  phase: string;
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.phase}>{phase}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "700" },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    maxWidth: 280,
  },
  phase: {
    color: colors.accent,
    fontSize: 12,
    marginTop: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
