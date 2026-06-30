import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "./Button";
import { Calendar } from "./Calendar";
import {
  getBestPrice,
  formatMoney,
  nightsBetween,
  type PriceableHotel,
} from "../lib/pricing";
import {
  affiliateConfigured,
  affiliateProviderName,
  buildBookingUrl,
} from "../lib/affiliate";
import { addDaysISO, formatShort, todayISO } from "../lib/dates";
import { colors, radius, spacing } from "../lib/theme";

export function CheckPricesSheet({
  visible,
  hotel,
  onClose,
}: {
  visible: boolean;
  hotel: PriceableHotel | null;
  onClose: () => void;
}) {
  const [checkIn, setCheckIn] = useState<string | null>(addDaysISO(todayISO(), 14));
  const [checkOut, setCheckOut] = useState<string | null>(addDaysISO(todayISO(), 16));
  const [guests, setGuests] = useState(2);

  const ready = Boolean(hotel && checkIn && checkOut);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  const price = useQuery({
    queryKey: ["price", hotel?.google_place_id, checkIn, checkOut, guests],
    enabled: visible && ready,
    queryFn: () => getBestPrice(hotel!, checkIn!, checkOut!, guests),
  });

  const book = async () => {
    if (!hotel || !checkIn || !checkOut) return;
    const url = buildBookingUrl(hotel, { checkIn, checkOut, guests });
    await WebBrowser.openBrowserAsync(url);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Check prices</Text>
              <Text style={styles.title} numberOfLines={1}>
                {hotel?.name ?? "Hotel"}
              </Text>
            </View>
            <Pressable hitSlop={10} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.dateRow}>
              <DateCell label="Check-in" value={checkIn} />
              <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
              <DateCell label="Check-out" value={checkOut} />
              <View style={styles.nights}>
                <Text style={styles.nightsText}>
                  {nights > 0 ? `${nights} night${nights > 1 ? "s" : ""}` : "Pick dates"}
                </Text>
              </View>
            </View>

            <View style={styles.calendarWrap}>
              <Calendar
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={(ci, co) => {
                  setCheckIn(ci);
                  setCheckOut(co);
                }}
              />
            </View>

            <View style={styles.guestRow}>
              <Text style={styles.guestLabel}>Guests</Text>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => setGuests((g) => Math.max(1, g - 1))}
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </Pressable>
                <Text style={styles.guestCount}>{guests}</Text>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => setGuests((g) => Math.min(8, g + 1))}
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.priceBox}>
              {!ready ? (
                <Text style={styles.priceHint}>Select your check-out date to see the best price.</Text>
              ) : price.isLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : price.data ? (
                <>
                  <View style={styles.priceMain}>
                    <Text style={styles.priceFrom}>from </Text>
                    <Text style={styles.priceValue}>
                      {formatMoney(price.data.nightlyFrom, price.data.currency)}
                    </Text>
                    <Text style={styles.pricePer}> / night</Text>
                  </View>
                  <Text style={styles.priceTotal}>
                    {formatMoney(price.data.total, price.data.currency)} total · {price.data.nights}{" "}
                    night{price.data.nights > 1 ? "s" : ""}
                  </Text>
                  {price.data.isEstimate && (
                    <View style={styles.estimateBadge}>
                      <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.estimateText}>Demo estimate — connect a price feed for live rates</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.priceHint}>Couldn’t fetch a price. Try other dates.</Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label={`Book on ${affiliateProviderName()}`}
              disabled={!ready}
              onPress={book}
            />
            {!affiliateConfigured && (
              <Text style={styles.affNote}>
                Set EXPO_PUBLIC_AFFILIATE_ID to earn commission on bookings.
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DateCell({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.dateCell}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={[styles.dateValue, !value && styles.datePlaceholder]}>
        {value ? formatShort(value) : "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "92%",
    paddingTop: spacing.sm,
  },
  handleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  dateRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  dateCell: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 84,
  },
  dateLabel: { color: colors.textMuted, fontSize: 11 },
  dateValue: { color: colors.text, fontSize: 16, fontWeight: "700" },
  datePlaceholder: { color: colors.textMuted },
  nights: { marginLeft: "auto" },
  nightsText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  calendarWrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  guestLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  guestCount: { color: colors.text, fontSize: 17, fontWeight: "700", minWidth: 20, textAlign: "center" },
  priceBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 70,
    justifyContent: "center",
  },
  priceHint: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  priceMain: { flexDirection: "row", alignItems: "baseline" },
  priceFrom: { color: colors.textMuted, fontSize: 14 },
  priceValue: { color: colors.text, fontSize: 28, fontWeight: "800" },
  pricePer: { color: colors.textMuted, fontSize: 14 },
  priceTotal: { color: colors.text, fontSize: 14, fontWeight: "600" },
  estimateBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  estimateText: { color: colors.textMuted, fontSize: 11 },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  affNote: { color: colors.textMuted, fontSize: 11, textAlign: "center" },
});
