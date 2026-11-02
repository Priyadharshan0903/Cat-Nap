import test from "node:test";
import assert from "node:assert/strict";
import { tapCell, DOUBLE_TAP_MS, markStroke, strokeCells } from "../lib/gestures.ts";
const blank = () => ({ cats: [], marks: [] });
test("a stroke fills sampled gaps, preserves cats, and never toggles existing Xs", () => {
  const before = { cats: [2], marks: [1] };
  assert.deepEqual(strokeCells(0, 4, 5), [0, 1, 2, 3, 4]);
  assert.deepEqual(strokeCells(0, 24, 5), [0, 6, 12, 18, 24]);
  assert.deepEqual(strokeCells(4, 0, 5), [4, 3, 2, 1, 0]);
  const painted = markStroke(before, [...strokeCells(0, 4, 5), ...strokeCells(4, 0, 5)]);
  assert.deepEqual(painted, { cats: [2], marks: [1, 0, 3, 4] });
  assert.deepEqual(before, { cats: [2], marks: [1] });
});
test("a single tap immediately marks X, and tapping the X later clears it", () => {
  const first = tapCell(blank(), 3, null, 100);
  assert.deepEqual(first.board, { cats: [], marks: [3] });
  assert.equal(first.double, false);
  assert.deepEqual(
    tapCell(first.board, 3, first.pending, 100 + DOUBLE_TAP_MS + 1).board,
    blank(),
  );
});
test("a fast pair becomes one cat without leaving the first tap’s X", () => {
  const first = tapCell(blank(), 4, null, 100),
    second = tapCell(first.board, 4, first.pending, 280);
  assert.deepEqual(second.board, { cats: [4], marks: [] });
  assert.equal(second.double, true);
  assert.equal(second.pending, null);
  assert.deepEqual(
    first.pending?.before,
    blank(),
    "undo can restore the state before the whole gesture",
  );
});
test("a double tap can promote an existing X or clear an existing cat", () => {
  for (const [before, expected] of [
    [
      { cats: [], marks: [5] },
      { cats: [5], marks: [] },
    ],
    [{ cats: [5], marks: [] }, blank()],
  ] as const) {
    const original = { cats: [...before.cats], marks: [...before.marks] };
    const a = tapCell(original, 5, null, 100),
      b = tapCell(a.board, 5, a.pending, 200);
    assert.deepEqual(b.board, expected);
    assert.deepEqual(original, before, "snapshots are immutable");
  }
});
test("fast taps on different squares remain separate X marks", () => {
  const a = tapCell(blank(), 2, null, 100),
    b = tapCell(a.board, 7, a.pending, 180);
  assert.deepEqual(b.board, { cats: [], marks: [2, 7] });
  assert.equal(b.double, false);
});
test("keyboard activation cannot accidentally become a double tap", () => {
  const a = tapCell(blank(), 2, null, 100, false),
    b = tapCell(a.board, 2, a.pending, 110, false);
  assert.equal(a.pending, null);
  assert.equal(b.double, false);
  assert.deepEqual(b.board, blank());
});
