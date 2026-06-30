import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { APP_NAME, BRAND_FONT } from "../lib/constants";
import { colors } from "../lib/theme";

// Transparent-corner gold badge mark (pin + martini + barbell).
const mark = require("../assets/mark.png");

const SIZES = {
  sm: { mark: 30, font: 19, gap: 9, tagline: 0 },
  md: { mark: 42, font: 25, gap: 11, tagline: 13 },
  lg: { mark: 76, font: 34, gap: 14, tagline: 15 },
} as const;

type Size = keyof typeof SIZES;

/**
 * Rep & Sip brand lockup: the badge mark + the wordmark, with the ampersand
 * tinted gold. Reads APP_NAME so the one-constant rename still flows through.
 */
export function Logo({
  size = "md",
  layout = "horizontal",
  tagline,
  style,
}: {
  size?: Size;
  layout?: "horizontal" | "stacked";
  tagline?: string;
  style?: ViewStyle;
}) {
  const s = SIZES[size];
  const stacked = layout === "stacked";
  return (
    <View
      style={[
        stacked ? styles.stacked : styles.horizontal,
        { gap: s.gap },
        style,
      ]}
    >
      <Image
        source={mark}
        style={[styles.mark, { width: s.mark, height: s.mark }]}
        resizeMode="contain"
      />
      <View style={stacked ? styles.center : undefined}>
        <Wordmark fontSize={s.font} center={stacked} />
        {tagline ? (
          <Text style={[styles.tagline, { fontSize: s.tagline }]}>{tagline}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Wordmark({ fontSize, center }: { fontSize: number; center?: boolean }) {
  const tokens = APP_NAME.split(" ");
  return (
    <Text
      style={[styles.word, { fontSize }, center && { textAlign: "center" }]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {tokens.map((t, i) => (
        <Text key={i} style={t === "&" ? styles.amp : undefined}>
          {t}
          {i < tokens.length - 1 ? " " : ""}
        </Text>
      ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  horizontal: { flexDirection: "row", alignItems: "center" },
  stacked: { alignItems: "center" },
  center: { alignItems: "center" },
  mark: {
    // Soft lift so the badge reads as a brand mark on light surfaces.
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  word: {
    color: colors.text,
    fontFamily: BRAND_FONT,
    letterSpacing: 0.5,
  },
  amp: { color: colors.accent },
  tagline: { color: colors.textMuted, marginTop: 2 },
});
