import test from "node:test";
import assert from "node:assert/strict";
import { suggestBrands, brandList, AIRLINES, HOTEL_BRANDS } from "../lib/brands.ts";

test("empty query returns the head of the list, respecting the limit", () => {
  const out = suggestBrands(HOTEL_BRANDS, "", 5);
  assert.equal(out.length, 5);
  assert.deepEqual(out, HOTEL_BRANDS.slice(0, 5));
});

test("full-string prefix matches rank before word-prefix matches", () => {
  const out = suggestBrands(HOTEL_BRANDS, "mar", 10);
  assert.equal(out[0], "Marriott"); // starts with "mar"
  assert.ok(out.includes("JW Marriott")); // word starts with "mar"
  assert.ok(out.indexOf("Marriott") < out.indexOf("JW Marriott"));
});

test("case-insensitive and matches mid-word as last resort", () => {
  const out = suggestBrands(AIRLINES, "LUFT", 5);
  assert.equal(out[0], "Lufthansa");
});

test("no matches yields empty array", () => {
  assert.deepEqual(suggestBrands(AIRLINES, "zzzzzz", 5), []);
});

test("brandList returns the right catalog per category", () => {
  assert.ok(brandList("airline").includes("Delta Air Lines"));
  assert.ok(brandList("hotel").includes("Marriott"));
  assert.ok(brandList("cruise").includes("Royal Caribbean International"));
});
