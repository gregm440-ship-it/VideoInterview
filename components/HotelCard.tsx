import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScorePills } from "./ScorePills";
import type { HotelCard as HotelCardData } from "../lib/hotels";
import { displayImageUrl } from "../lib/places";
import { formatDistance } from "../lib/distance";
import { colors, radius, spacing } from "../lib/theme";

/** Search result card: image, name, the two scores at a glance, distance. */
export function HotelCard({
  hotel,
  onPress,
  onCheckPrices,
}: {
  hotel: HotelCardData;
  onPress: () => void;
  onCheckPrices?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.heroWrap}>
        {hotel.image_url ? (
          <Image
            source={{ uri: displayImageUrl(hotel.image_url)! }}
            style={styles.hero}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.hero, styles.heroFallback]}>
            <Text style={styles.heroFallbackText}>🏨</Text>
          </View>
        )}
        {hotel.distanceM != null && (
          <View style={styles.distance}>
            <Text style={styles.distanceText}>{formatDistance(hotel.distanceM)}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {hotel.name}
        </Text>
        {hotel.address ? (
          <Text style={styles.address} numberOfLines={1}>
            {hotel.address}
          </Text>
        ) : null}
        <ScorePills aggregate={hotel.aggregate} />
        {onCheckPrices && (
          <Pressable
            onPress={onCheckPrices}
            style={({ pressed }) => [styles.priceLink, pressed && styles.priceLinkPressed]}
            hitSlop={6}
          >
            <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
            <Text style={styles.priceLinkText}>Check Prices</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.85 },
  heroWrap: { height: 120 },
  hero: { width: "100%", height: "100%" },
  heroFallback: {
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  heroFallbackText: { fontSize: 34 },
  distance: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  distanceText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  info: { padding: spacing.md, gap: spacing.xs },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  address: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs },
  priceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceLinkText: { color: colors.primary, fontSize: 13, fontWeight: "700", flex: 1 },
  priceLinkPressed: { opacity: 0.6 },
});

