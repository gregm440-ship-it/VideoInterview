import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { brandList, suggestBrands, type BrandCategory } from "../lib/brands";
import { colors, radius, spacing, TAP_TARGET } from "../lib/theme";

/**
 * Typeahead field for picking a brand. Tap to open a search modal; as you type,
 * the most likely matches surface (prefix-ranked). Lets the user enter a brand
 * that isn't in the curated list too.
 */
export function BrandPicker({
  label,
  icon,
  value,
  category,
  placeholder = "None",
  onChange,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string | null;
  category: BrandCategory;
  placeholder?: string;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const list = useMemo(() => brandList(category), [category]);
  const suggestions = useMemo(() => suggestBrands(list, query, 10), [list, query]);

  const exact = suggestions.some((s) => s.toLowerCase() === query.trim().toLowerCase());
  const customOption = query.trim().length > 1 && !exact ? query.trim() : null;

  const choose = (v: string | null) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text
          style={[styles.fieldValue, !value && styles.fieldPlaceholder]}
          numberOfLines={1}
        >
          {value ?? placeholder}
        </Text>
        {value ? (
          <Pressable hitSlop={10} onPress={() => onChange(null)}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handleRow}>
              <Text style={styles.title}>{label}</Text>
              <Pressable hitSlop={10} onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Start typing…"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoFocus
                autoCorrect={false}
              />
            </View>

            <FlatList
              data={suggestions}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListHeaderComponent={
                value ? (
                  <Pressable style={styles.row} onPress={() => choose(null)}>
                    <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                    <Text style={[styles.rowText, { color: colors.danger }]}>Clear selection</Text>
                  </Pressable>
                ) : null
              }
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <Pressable style={styles.row} onPress={() => choose(item)}>
                    <Text style={styles.rowText}>{item}</Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </Pressable>
                );
              }}
              ListFooterComponent={
                customOption ? (
                  <Pressable style={styles.row} onPress={() => choose(customOption)}>
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={styles.rowText}>Use “{customOption}”</Text>
                  </Pressable>
                ) : null
              }
              ListEmptyComponent={
                !customOption ? (
                  <Text style={styles.empty}>No matches.</Text>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: TAP_TARGET,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  fieldLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  fieldValue: { flex: 1, textAlign: "right", color: colors.text, fontSize: 15 },
  fieldPlaceholder: { color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "82%",
    paddingTop: spacing.sm,
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: TAP_TARGET,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  input: { flex: 1, color: colors.text, fontSize: 16 },
  list: { marginTop: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { flex: 1, color: colors.text, fontSize: 15 },
  empty: { color: colors.textMuted, textAlign: "center", padding: spacing.lg },
});
