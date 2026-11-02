import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProgress,
  mergeProgress,
  validProgress,
  type Progress,
} from "../lib/progress.ts";
import { LEVELS } from "../lib/catalog.ts";
import {
  rewardBalance,
  spendAssist,
  refillAssist,
  starsFor,
} from "../lib/rewards.ts";
function complete(p: Progress, count: number) {
  for (const level of LEVELS.slice(0, count))
    p.completed[level.id] = {
      levelId: level.id,
      completedAt: 100,
      bestTime: 20,
      stars: 3,
    };
  return p;
}
test("every save starts with one shared welcome gift of 10 hints and 5 cats", () => {
  assert.deepEqual(rewardBalance(emptyProgress()), { hints: 10, cats: 5 });
  assert.deepEqual(
    rewardBalance(mergeProgress(emptyProgress(), emptyProgress())),
    { hints: 10, cats: 5 },
  );
});
test("new completions earn useful rewards and a chapter earns its extra bundle", () => {
  assert.deepEqual(rewardBalance(complete(emptyProgress(), 1)), {
    hints: 11,
    cats: 5,
  });
  assert.deepEqual(rewardBalance(complete(emptyProgress(), 5)), {
    hints: 15,
    cats: 7,
  });
  assert.deepEqual(rewardBalance(complete(emptyProgress(), 12)), {
    hints: 25,
    cats: 10,
  });
});
test("replays and repeated imports cannot mint completion gifts again", () => {
  const p = complete(emptyProgress(), 5);
  const before = rewardBalance(p);
  p.completed["level-001"].bestTime = 2;
  assert.deepEqual(rewardBalance(p), before);
  assert.deepEqual(
    rewardBalance(mergeProgress(mergeProgress(p, p), p)),
    before,
  );
});
test("spending is persistent, and importing an older backup cannot refund tokens", () => {
  const old = emptyProgress();
  let current = spendAssist(old, "mac", "hints")!;
  current = spendAssist(current, "mac", "cats")!;
  assert.deepEqual(rewardBalance(current), { hints: 9, cats: 4 });
  assert.deepEqual(rewardBalance(mergeProgress(current, old)), {
    hints: 9,
    cats: 4,
  });
  assert.ok(validProgress(current));
});
test("free refills work only when empty, and duplicate imports cannot repeat a refill", () => {
  let p = emptyProgress();
  for (let i = 0; i < 10; i++) p = spendAssist(p, "mac", "hints")!;
  assert.equal(spendAssist(p, "mac", "hints"), null);
  const refilled = refillAssist(p, "mac", "hints");
  assert.equal(rewardBalance(refilled).hints, 3);
  assert.deepEqual(refillAssist(refilled, "mac", "hints"), refilled);
  assert.equal(rewardBalance(mergeProgress(refilled, refilled)).hints, 3);
});
test("manual transfers merge spending from both devices without duplicating the starter gift", () => {
  let mac = emptyProgress(),
    phone = emptyProgress();
  for (let i = 0; i < 10; i++) {
    mac = spendAssist(mac, "mac", "hints")!;
    phone = spendAssist(phone, "phone", "hints")!;
  }
  const merged = mergeProgress(mac, phone);
  assert.equal(rewardBalance(merged).hints, 0);
  const refilled = refillAssist(merged, "mac", "hints");
  assert.equal(rewardBalance(refilled).hints, 3);
  assert.equal(rewardBalance(mergeProgress(refilled, phone)).hints, 3);
});
test("legacy v1 saves and their existing achievements keep working", () => {
  const legacy = complete(emptyProgress(), 2);
  delete legacy.rewards;
  delete legacy.completed["level-001"].stars;
  assert.ok(validProgress(legacy));
  const upgraded = mergeProgress(emptyProgress(), legacy);
  assert.deepEqual(rewardBalance(upgraded), { hints: 12, cats: 5 });
  assert.equal(Object.keys(upgraded.completed).length, 2);
});
test("star records reward independent solving and never downgrade an existing best", () => {
  assert.equal(starsFor({ hints: 0, cats: 0 }), 3);
  assert.equal(starsFor({ hints: 1, cats: 0 }), 2);
  assert.equal(starsFor({ hints: 0, cats: 1 }), 1);
  const a = complete(emptyProgress(), 1),
    b = complete(emptyProgress(), 1);
  b.completed["level-001"].stars = 1;
  assert.equal(mergeProgress(a, b).completed["level-001"].stars, 3);
});
test("malformed token balances and impossible star counts are rejected", () => {
  const p = emptyProgress();
  p.rewards!.spent.mac = { hints: -1, cats: 0 };
  assert.equal(validProgress(p), false);
  p.rewards!.spent.mac = { hints: 0.5, cats: 0 };
  assert.equal(validProgress(p), false);
  p.rewards!.spent.mac = { hints: 0, cats: 0 };
  assert.ok(validProgress(p));
  const bad = JSON.parse(JSON.stringify(complete(emptyProgress(), 1)));
  bad.completed["level-001"].stars = 4;
  assert.equal(validProgress(bad), false);
});
