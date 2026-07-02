import test from "node:test";
import assert from "node:assert/strict";
import {
  applyFilters,
  defaultFilters,
  activeFilterCount,
  DEFAULT_RADIUS_MI,
} from "../lib/filters.ts";
import type { SearchFilters } from "../lib/filters.ts";
import type { HotelCard } from "../lib/hotels.ts";

function mk(overrides: Partial<HotelCard> & { name: string }): HotelCard {
  return {
    google_place_id: `gp-${overrides.name}`,
    address: null,
    city: null,
    country: null,
    lat: 0,
    lng: 0,
    price_tier: 2,
    image_url: null,
    id: `id-${overrides.name}`,
    aggregate: null,
    ...overrides,
  };
}

function agg(gym: number, bar: number, overall: number, count = 10) {
  return {
    hotel_id: "h",
    avg_gym: gym,
    avg_bar: bar,
    avg_overall: overall,
    review_count: count,
    updated_at: "",
  };
}

function withFilters(patch: Partial<SearchFilters>): SearchFilters {
  return { ...defaultFilters(), ...patch };
}

test("min-score filters exclude unrated hotels and below-threshold hotels", () => {
  const cards = [
    mk({ name: "great-gym", aggregate: agg(4.5, 3, 4) }),
    mk({ name: "weak-gym", aggregate: agg(3.2, 5, 4) }),
    mk({ name: "unrated", aggregate: null }),
  ];
  const out = applyFilters(cards, withFilters({ minGym: 4 }));
  assert.deepEqual(out.map((c) => c.name), ["great-gym"]);
});

test("zero-review aggregates count as unrated", () => {
  const cards = [mk({ name: "empty-agg", aggregate: agg(5, 5, 5, 0) })];
  assert.equal(applyFilters(cards, withFilters({ minBar: 4 })).length, 0);
});

test("hotel brand matches by name substring, case-insensitively", () => {
  const cards = [
    mk({ name: "JW Marriott Austin", aggregate: agg(4, 4, 4) }),
    mk({ name: "Hilton Downtown", aggregate: agg(4, 4, 4) }),
  ];
  const out = applyFilters(cards, withFilters({ hotelBrand: "marriott" }));
  assert.deepEqual(out.map((c) => c.name), ["JW Marriott Austin"]);
});

test("tag filter requires ALL selected tags", () => {
  const cards = [
    mk({ name: "both", aggregate: agg(4, 4, 4), tagKeys: ["squat_rack", "open_late"] }),
    mk({ name: "one", aggregate: agg(4, 4, 4), tagKeys: ["squat_rack"] }),
  ];
  const out = applyFilters(cards, withFilters({ tags: ["squat_rack", "open_late"] }));
  assert.deepEqual(out.map((c) => c.name), ["both"]);
});

test("price tiers filter; hotels without a tier are excluded when set", () => {
  const cards = [
    mk({ name: "cheap", price_tier: 1, aggregate: agg(4, 4, 4) }),
    mk({ name: "lux", price_tier: 4, aggregate: agg(4, 4, 4) }),
    mk({ name: "unknown", price_tier: null, aggregate: agg(4, 4, 4) }),
  ];
  const out = applyFilters(cards, withFilters({ priceTiers: [1, 2] }));
  assert.deepEqual(out.map((c) => c.name), ["cheap"]);
});

test("sort: best_gym ranks by avg_gym, rated above unrated", () => {
  const cards = [
    mk({ name: "b", aggregate: agg(3.5, 4, 4) }),
    mk({ name: "a", aggregate: agg(4.9, 4, 4) }),
    mk({ name: "unrated", aggregate: null }),
  ];
  const out = applyFilters(cards, withFilters({ sort: "best_gym" }));
  assert.deepEqual(out.map((c) => c.name), ["a", "b", "unrated"]);
});

test("sort: nearest orders by distance, missing distance last", () => {
  const cards = [
    mk({ name: "far", distanceM: 5000 }),
    mk({ name: "close", distanceM: 100 }),
    mk({ name: "nowhere", distanceM: null }),
  ];
  const out = applyFilters(cards, withFilters({ sort: "nearest" }));
  assert.deepEqual(out.map((c) => c.name), ["close", "far", "nowhere"]);
});

test("sort: most_reviewed orders by review_count", () => {
  const cards = [
    mk({ name: "few", aggregate: agg(5, 5, 5, 2) }),
    mk({ name: "many", aggregate: agg(4, 4, 4, 120) }),
  ];
  const out = applyFilters(cards, withFilters({ sort: "most_reviewed" }));
  assert.deepEqual(out.map((c) => c.name), ["many", "few"]);
});

test("activeFilterCount: sort and default radius are not filters", () => {
  assert.equal(activeFilterCount(defaultFilters()), 0);
  assert.equal(activeFilterCount(withFilters({ sort: "best_bar" })), 0);
  assert.equal(activeFilterCount(withFilters({ radiusMi: DEFAULT_RADIUS_MI })), 0);
  const busy = withFilters({
    minGym: 4,
    minBar: 3,
    tags: ["squat_rack", "open_late"],
    priceTiers: [2],
    radiusMi: 25,
    hotelBrand: "Marriott",
  });
  // 2 score mins + 2 tags + price + radius + brand = 7
  assert.equal(activeFilterCount(busy), 7);
});
