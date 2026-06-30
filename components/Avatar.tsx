import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";

/** Round avatar: photo when available, else initials on the accent color. */
export function Avatar({
  name,
  url,
  size = 36,
}: {
  name?: string | null;
  url?: string | null;
  size?: number;
}) {
  const initials = (name?.trim() || "Traveler").slice(0, 2).toUpperCase();
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (url) {
    return <Image source={{ uri: url }} style={dim} contentFit="cover" />;
  }
  return (
    <View style={[styles.fallback, dim]}>
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  text: { color: colors.onAccent, fontWeight: "800" },
});
