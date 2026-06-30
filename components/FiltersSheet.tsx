import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";
import { TagToggles } from "./TagToggles";
import { BrandPicker } from "./BrandPicker";
import {
  activeFilterCount,
  defaultFilters,
  MIN_SCORE_OPTIONS,
  PRICE_TIERS,
  RADIUS_OPTIONS,
  SORT_LABELS,
  type SearchFilters,
  type SortKey,
} from "../lib/filters";
import { ICONS } from "../lib/constants";
import { colors, radius, spacing } from "../lib/theme";

const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

export function FiltersSheet({
  visible,
  initial,
  myHotelBrand,
  onClose,
  onApply,
}: {
  visible: boolean;
  initial: SearchFilters;
  /** The signed-in user's preferred hotel brand, for a one-tap shortcut. */
  myHotelBrand?: string | null;
  onClose: () => void;
  onApply: (f: SearchFilters) => void;
}) {
  const [draft, setDraft] = useState<SearchFilters>(initial);

  // Re-sync the draft whenever the sheet is opened.
  useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible, initial]);

  const set = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleTag = (key: string) =>
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(key) ? d.tags.filter((t) => t !== key) : [...d.tags, key],
    }));

  const togglePrice = (tier: number) =>
    setDraft((d) => ({
      ...d,
      priceTiers: d.priceTiers.includes(tier)
        ? d.priceTiers.filter((t) => t !== tier)
        : [...d.priceTiers, tier],
    }));

  const count = activeFilterCount(draft);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <Text style={styles.title}>Filters & sort</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Section label="Sort by">
              <Segmented
                options={SORT_KEYS.map((k) => ({ value: k, label: SORT_LABELS[k] }))}
                value={draft.sort}
                onChange={(v) => set("sort", v)}
              />
            </Section>

            <Section label="Minimum scores">
              <MinScoreRow
                icon={ICONS.gym}
                label="Gym"
                value={draft.minGym}
                onChange={(v) => set("minGym", v)}
              />
              <MinScoreRow
                icon={ICONS.bar}
                label="Bar"
                value={draft.minBar}
                onChange={(v) => set("minBar", v)}
              />
              <MinScoreRow
                icon={ICONS.overall}
                label="Overall"
                value={draft.minOverall}
                onChange={(v) => set("minOverall", v)}
              />
            </Section>

            <Section label="Must have tags">
              <TagToggles
                type="gym"
                selected={new Set(draft.tags)}
                onToggle={toggleTag}
              />
              <TagToggles
                type="bar"
                selected={new Set(draft.tags)}
                onToggle={toggleTag}
              />
            </Section>

            <Section label="Hotel brand">
              <BrandPicker
                label="Brand"
                icon="bed-outline"
                category="hotel"
                placeholder="Any brand"
                value={draft.hotelBrand}
                onChange={(v) => set("hotelBrand", v)}
              />
              {myHotelBrand && draft.hotelBrand !== myHotelBrand ? (
                <Pressable
                  style={styles.usePref}
                  onPress={() => set("hotelBrand", myHotelBrand)}
                >
                  <Ionicons name="star" size={13} color={colors.primary} />
                  <Text style={styles.usePrefText}>Use my preferred · {myHotelBrand}</Text>
                </Pressable>
              ) : null}
            </Section>

            <Section label="Price">
              <View style={styles.rowWrap}>
                {PRICE_TIERS.map((tier) => {
                  const on = draft.priceTiers.includes(tier);
                  return (
                    <Chip key={tier} label={"$".repeat(tier)} on={on} onPress={() => togglePrice(tier)} />
                  );
                })}
              </View>
            </Section>

            <Section label="Distance (near me)">
              <Segmented
                options={RADIUS_OPTIONS.map((r) => ({ value: r, label: `${r} mi` }))}
                value={draft.radiusMi}
                onChange={(v) => set("radiusMi", v)}
              />
            </Section>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="Clear all"
              variant="ghost"
              onPress={() => setDraft(defaultFilters())}
              style={{ flex: 1 }}
            />
            <Button
              label={count > 0 ? `Apply (${count})` : "Apply"}
              onPress={() => {
                onApply(draft);
                onClose();
              }}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MinScoreRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.minRow}>
      <Text style={styles.minLabel}>
        {icon} {label}
      </Text>
      <View style={styles.minOptions}>
        {MIN_SCORE_OPTIONS.map((opt) => {
          const on = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.minChip, on && styles.minChipOn]}
            >
              <Text style={[styles.minChipText, on && styles.minChipTextOn]}>
                {opt === 0 ? "Any" : `≥${opt}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "88%",
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
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  section: { marginTop: spacing.lg },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 3,
    flexWrap: "wrap",
  },
  segment: { flexGrow: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.sm, alignItems: "center" },
  segmentOn: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  segmentTextOn: { color: colors.onPrimary },
  minRow: { marginBottom: spacing.md },
  minLabel: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: spacing.sm },
  minOptions: { flexDirection: "row", gap: spacing.sm },
  minChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  minChipOn: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  minChipText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  minChipTextOn: { color: colors.text },
  usePref: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  usePrefText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  rowWrap: { flexDirection: "row", gap: spacing.sm },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
  chipTextOn: { color: colors.text },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
