import test from "node:test";
import assert from "node:assert/strict";
import { emptyLives, lifeStatus, recordLifeLoss, mergeLifeLedgers, lifeCountdown, LIFE_REFILL_MS as HALF_HOUR } from "../lib/lives.ts";
import { emptyProgress, mergeProgress, validProgress } from "../lib/progress.ts";

const start = 1_800_000_000_000;
test("three lives remain full indefinitely until a wrong cat is placed", () => {
  assert.deepEqual(lifeStatus(undefined, start), { count: 3, nextIn: 0, fullIn: 0 });
  assert.equal(lifeStatus(emptyLives(), start + 100 * HALF_HOUR).count, 3);
});
test("two losses refill at 30 and 60 minutes without restarting the first timer", () => {
  const one = recordLifeLoss(undefined, start, "one")!;
  const two = recordLifeLoss(one, start + 10 * 60_000, "two")!;
  assert.deepEqual(lifeStatus(two, start + 10 * 60_000), { count: 1, nextIn: 20 * 60_000, fullIn: 50 * 60_000 });
  assert.equal(lifeStatus(two, start + HALF_HOUR - 1).count, 1);
  assert.equal(lifeStatus(two, start + HALF_HOUR).count, 2);
  assert.equal(lifeStatus(two, start + 2 * HALF_HOUR).count, 3);
});
test("zero lives rejects another loss and all three return after 90 minutes offline", () => {
  let state = emptyLives();
  for (let i = 0; i < 3; i++) state = recordLifeLoss(state, start, "loss-" + i)!;
  assert.equal(lifeStatus(state, start).count, 0);
  assert.equal(recordLifeLoss(state, start + 1000, "fourth"), null);
  assert.equal(lifeStatus(state, start + HALF_HOUR).count, 1);
  assert.equal(lifeStatus(state, start + 3 * HALF_HOUR).count, 3);
  const next = recordLifeLoss(state, start + 4 * HALF_HOUR, "later")!;
  assert.deepEqual(lifeStatus(next, start + 4 * HALF_HOUR), { count: 2, nextIn: HALF_HOUR, fullIn: HALF_HOUR });
});
test("JSON reload and older or duplicate imports preserve losses and deadlines", () => {
  const current = emptyProgress(), phone = emptyProgress();
  current.lives = recordLifeLoss(current.lives, start, "mac")!;
  phone.lives = recordLifeLoss(phone.lives, start + 1000, "phone")!;
  const merged = mergeProgress(current, phone);
  assert.equal(lifeStatus(merged.lives, start + 1000).count, 1);
  assert.deepEqual(mergeProgress(merged, current).lives, merged.lives);
  assert.deepEqual(mergeProgress(merged, emptyProgress()).lives, merged.lives);
  assert.deepEqual(lifeStatus(JSON.parse(JSON.stringify(merged)).lives, start), lifeStatus(merged.lives, start));
  assert.deepEqual(mergeLifeLedgers(current.lives, phone.lives), mergeLifeLedgers(phone.lives, current.lives));
});
test("a retried receipt costs one life and parallel offline losses never exceed three missing slots", () => {
  const once = recordLifeLoss(undefined, start, "one")!;
  assert.deepEqual(recordLifeLoss(once, start, "one"), once);
  const merged = mergeLifeLedgers({ losses: { a: start, b: start + 1, c: start + 2 } }, { losses: { d: start + 3, e: start + 4, f: start + 5 } });
  assert.equal(lifeStatus(merged, start + 10).count, 0);
  assert.equal(lifeStatus(merged, start + 3 * HALF_HOUR).count, 3);
});
test("legacy saves remain valid, malformed life records are rejected, and countdowns round up", () => {
  const legacy = emptyProgress(); delete legacy.lives;
  assert.ok(validProgress(legacy));
  for (const lives of [{ losses: [] }, { losses: { bad: -1 } }, { losses: { bad: NaN } }, { losses: { bad: "now" } }])
    assert.equal(validProgress({ ...legacy, lives }), false);
  assert.equal(lifeCountdown(HALF_HOUR), "30:00");
  assert.equal(lifeCountdown(2 * HALF_HOUR), "1:00:00");
  assert.equal(lifeCountdown(1), "00:01");
  assert.equal(lifeCountdown(0), "00:00");
});
