import test from "node:test";
import assert from "node:assert/strict";
import { getBestPrice, nightsBetween, formatMoney } from "../lib/pricing.ts";
import { addDaysISO, formatShort, parseISO, toISO } from "../lib/dates.ts";
import { haversineMeters, formatDistance } from "../lib/distance.ts";

const HOTEL = {
  google_place_id: "gp-test",
  name: "Test Hotel",
  city: "Austin",
  lat: 30.27,
  lng: -97.74,
  price_tier: 3,
};

test("nightsBetween counts nights, minimum 1", () => {
  assert.equal(nightsBetween("2026-03-08", "2026-03-10"), 2);
  assert.equal(nightsBetween("2026-03-08", "2026-03-09"), 1);
  assert.equal(nightsBetween("2026-03-08", "2026-03-08"), 1);
});

test("demo price is deterministic, marked as estimate, total = nightly * nights", async () => {
  const a = await getBestPrice(HOTEL, "2026-03-08", "2026-03-10", 2);
  const b = await getBestPrice(HOTEL, "2026-03-08", "2026-03-10", 2);
  assert.equal(a.isEstimate, true);
  assert.equal(a.nights, 2);
  assert.equal(a.nightlyFrom, b.nightlyFrom);
  assert.equal(a.total, a.nightlyFrom * 2);
  assert.ok(a.nightlyFrom >= 70);
});

test("formatMoney renders whole-dollar USD", () => {
  assert.equal(formatMoney(536), "$536");
  assert.equal(formatMoney(1234.4), "$1,234");
});

test("date helpers: roundtrip, addDays across month end, short format", () => {
  assert.equal(toISO(parseISO("2026-03-08")), "2026-03-08");
  assert.equal(addDaysISO("2026-03-30", 3), "2026-04-02");
  assert.equal(formatShort("2026-03-08"), "Mar 8");
});

test("haversine: one degree of longitude at the equator ≈ 111.2 km", () => {
  const m = haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
  assert.ok(Math.abs(m - 111195) < 500, `got ${m}`);
});

test("formatDistance buckets", () => {
  assert.equal(formatDistance(null), "");
  assert.equal(formatDistance(50), "nearby"); // < 0.1 mi
  assert.equal(formatDistance(1609.34), "1.0 mi");
  assert.equal(formatDistance(32_186.8), "20 mi"); // >= 10 mi rounds
});
