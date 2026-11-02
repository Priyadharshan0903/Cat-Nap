import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { LEVELS, JOURNEY, VARIETY_LEVELS, EXPERT_LEVELS, CHAPTERS, chapterLevels, stageNumber, nextJourneyPuzzle, profileFor } from "../lib/catalog.ts";
import { emptyProgress, mergeProgress } from "../lib/progress.ts";
import { earnedRewards, chapterFinished, chapterGiftEarned } from "../lib/rewards.ts";

test("the mixed path contains every permanent puzzle exactly once and navigation follows that order", () => {
  assert.equal(JOURNEY.length, 156);
  assert.equal(new Set(JOURNEY.map((p) => p.id)).size, 156);
  assert.deepEqual([...JOURNEY.map((p) => p.id)].sort(), [...LEVELS.map((p) => p.id)].sort());
  for (let i = 0; i < JOURNEY.length; i++) assert.equal(stageNumber(JOURNEY[i].id), i + 1);
  const completed = { [JOURNEY[1].id]: {} };
  assert.equal(nextJourneyPuzzle(JOURNEY[0].id, completed)?.id, JOURNEY[2].id);
  assert.equal(nextJourneyPuzzle(JOURNEY[JOURNEY.length - 1].id, {})?.id, JOURNEY[0].id);
});
test("challenge frequency increases chapter by chapter and board sizes vary throughout", () => {
  let previous = -1;
  const expertChapters = new Set<number>();
  CHAPTERS.forEach((_, i) => {
    const puzzles = chapterLevels(i);
    const ratio = puzzles.filter((p) => profileFor(p).rank >= 2).length / puzzles.length;
    assert.ok(ratio > previous, "Challenge frequency should rise, not jump randomly");
    previous = ratio;
    assert.ok(new Set(puzzles.map((p) => p.size)).size >= (i ? 3 : 2));
    if (puzzles.some((p) => EXPERT_LEVELS.some((e) => e.id === p.id))) expertChapters.add(i);
  });
  assert.ok(expertChapters.size >= 3, "Published Expert boards are spread through the journey");
});
test("Expert puzzles arrive after the introductory path and are followed by compact breathers", () => {
  JOURNEY.forEach((p, i) => {
    if (profileFor(p).rank === 3) {
      assert.ok(i >= 70);
      assert.ok(i + 1 < JOURNEY.length);
      assert.ok(JOURNEY[i + 1].size <= 7);
      assert.ok(profileFor(JOURNEY[i + 1]).rank < 2);
    }
    if (i >= 6) assert.equal(JOURNEY.slice(i - 3, i + 1).every((other) => other.size === p.size), false);
  });
});
test("the new variety pack changes sizes, shapes and deduction styles", () => {
  assert.equal(VARIETY_LEVELS.length, 24);
  for (const size of [5, 6, 7, 8]) assert.equal(VARIETY_LEVELS.filter((p) => p.size === size).length, 6);
  assert.equal(new Set(VARIETY_LEVELS.map((p) => profileFor(p).focus)).size, 3);
  assert.ok(new Set(VARIETY_LEVELS.map((p) => profileFor(p).shape)).size >= 2);
  assert.ok(VARIETY_LEVELS.some((p) => p.size === 6 && profileFor(p).rank >= 2));
  assert.ok(LEVELS.some((p) => p.size === 9 && profileFor(p).rank === 1));
});
test("both previously published packs stay byte-for-byte unchanged", () => {
  const hash = (name: string) => createHash("sha256").update(readFileSync(new URL("../lib/" + name, import.meta.url))).digest("hex");
  assert.equal(hash("levels.json"), "4d4b7c6566dec0edd7b6c1c1824f7ecd59f56b79332e141d79f6fc3b9d370b25");
  assert.equal(hash("expert-levels.json"), "789b23759d4f84519ab735b528f3935974bc4592e30d23eba0f97550321130fb");
});
test("old and new chapter completion groups share one gift credit per chapter slot", () => {
  const old = emptyProgress(), current = emptyProgress();
  for (const p of LEVELS.slice(0, 12)) old.completed[p.id] = { levelId: p.id, completedAt: 1, bestTime: 1 };
  for (const p of chapterLevels(0)) current.completed[p.id] = { levelId: p.id, completedAt: 2, bestTime: 2 };
  assert.equal(chapterFinished(old, 0), false);
  assert.equal(chapterGiftEarned(old, 0), true);
  assert.equal(chapterFinished(current, 0), true);
  const merged = mergeProgress(old, current), gifts = earnedRewards(merged), count = Object.keys(merged.completed).length;
  assert.equal(gifts.hints - count, 3, "The same chapter gift is never awarded twice");
  assert.equal(gifts.cats - Math.floor(count / 5) * 2, 1);
});
