import test from "node:test";
import assert from "node:assert/strict";
import {
  computeTier,
  computeBadges,
  earnedCount,
  EMPTY_STATS,
  type UserStats,
} from "../lib/badges.ts";

function stats(patch: Partial<UserStats>): UserStats {
  return { ...EMPTY_STATS, ...patch };
}

test("tier boundaries: highest qualifying tier wins", () => {
  assert.equal(computeTier(stats({ reviewCount: 0 })).current.key, "newcomer");
  assert.equal(computeTier(stats({ reviewCount: 1 })).current.key, "bronze");
  assert.equal(computeTier(stats({ reviewCount: 4 })).current.key, "bronze");
  assert.equal(computeTier(stats({ reviewCount: 5 })).current.key, "silver");
  assert.equal(computeTier(stats({ reviewCount: 15 })).current.key, "gold");
  assert.equal(computeTier(stats({ reviewCount: 30 })).current.key, "platinum");
  assert.equal(computeTier(stats({ reviewCount: 50 })).current.key, "road_warrior");
  assert.equal(computeTier(stats({ reviewCount: 999 })).current.key, "road_warrior");
});

test("toNext counts remaining reviews; top tier has no next", () => {
  const gold = computeTier(stats({ reviewCount: 23 }));
  assert.equal(gold.current.key, "gold");
  assert.equal(gold.next?.key, "platinum");
  assert.equal(gold.toNext, 7);

  const top = computeTier(stats({ reviewCount: 50 }));
  assert.equal(top.next, null);
  assert.equal(top.toNext, 0);
});

test("badges report progress and cap at target", () => {
  const s = stats({ reviewCount: 1, photoCount: 25, gymFives: 3 });
  const byKey = Object.fromEntries(computeBadges(s).map((b) => [b.key, b]));

  assert.equal(byKey.first_rep.earned, true);
  assert.equal(byKey.shutterbug.earned, true);
  assert.equal(byKey.shutterbug.progress, 1);
  assert.equal(byKey.gym_rat.earned, false);
  assert.equal(byKey.gym_rat.value, 3);
  assert.ok(Math.abs(byKey.gym_rat.progress - 0.3) < 1e-9);
});

test("earnedCount tallies earned badges only", () => {
  assert.equal(earnedCount(EMPTY_STATS), 0);
  assert.equal(earnedCount(stats({ reviewCount: 1 })), 1); // first_rep only
});
