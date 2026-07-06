import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { APP_NAME, BRAND_FONT, TAGLINE } from "../lib/constants";
import { colors } from "../lib/theme";

// Navy tile mark: martini-barbell fusion glyph (sun bowl, sky stem/base).
const mark = require("../assets/mark.png");

const SIZES = {
  sm: { mark: 30, font: 18, gap: 9, tagline: 0 },
  md: { mark: 42, font: 24, gap: 11, tagline: 13 },
  lg: { mark: 76, font: 32, gap: 14, tagline: 14 },
} as const;

type Size = keyof typeof SIZES;

/**
 * Bench & Bar brand lockup: the navy tile mark + the BENCH&BAR wordmark in
 * Archivo 800 with the ampersand in sun. Reads APP_NAME so a rename still
 * flows through from the one constant.
 */
export function Logo({
  size = "md",
  layout = "horizontal",
  tagline,
  style,
}: {
  size?: Size;
  layout?: "horizontal" | "stacked";
  /** Pass a string to show a tagline (or true-ish default via TAGLINE). */
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

export { TAGLINE };

function Wordmark({ fontSize, center }: { fontSize: number; center?: boolean }) {
  // Brand wordmark is tight uppercase with a sun ampersand: BENCH&BAR.
  const upper = APP_NAME.toUpperCase();
  const ampIndex = upper.indexOf("&");
  const pre = ampIndex >= 0 ? upper.slice(0, ampIndex).trim() : upper;
  const post = ampIndex >= 0 ? upper.slice(ampIndex + 1).trim() : "";
  return (
    <Text
      style={[styles.word, { fontSize }, center && { textAlign: "center" }]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {pre}
      {ampIndex >= 0 && <Text style={styles.amp}>&</Text>}
      {post}
    </Text>
  );
}

const styles = StyleSheet.create({
  horizontal: { flexDirection: "row", alignItems: "center" },
  stacked: { alignItems: "center" },
  center: { alignItems: "center" },
  mark: {
    borderRadius: 10,
    // Soft lift so the navy tile reads as a badge on light surfaces.
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  word: {
    color: colors.text,
    fontFamily: BRAND_FONT,
    letterSpacing: 0.3,
  },
  amp: { color: colors.primary },
  tagline: { color: colors.textMuted, marginTop: 3 },
});
