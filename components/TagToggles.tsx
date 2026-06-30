import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TagType } from "../lib/database.types";
import { tagsFor } from "../lib/tags";
import { ICONS } from "../lib/constants";
import { colors, radius, spacing } from "../lib/theme";

/** Skippable toggle group of quick tags for one type (Section 8.1). */
export function TagToggles({
  type,
  selected,
  onToggle,
}: {
  type: TagType;
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.heading}>
        {type === "gym" ? `${ICONS.gym} Gym` : `${ICONS.bar} Bar`}
      </Text>
      <View style={styles.chips}>
        {tagsFor(type).map((t) => {
          const on = selected.has(t.key);
          return (
            <Pressable
              key={t.key}
              onPress={() => onToggle(t.key)}
              style={({ pressed }) => [
                styles.chip,
                on && styles.chipOn,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.md },
  heading: { color: colors.textMuted, fontSize: 13, fontWeight: "700", marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: "rgba(91,192,190,0.14)" },
  chipPressed: { opacity: 0.7 },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextOn: { color: colors.text, fontWeight: "700" },
});
