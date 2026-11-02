import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS, dailyPuzzle } from "../lib/catalog.ts";
import { coachingHint } from "../lib/coaching.ts";
import type { Board } from "../lib/puzzle.ts";

test("teaching hints never place cats or cross out a solution across the full pack", () => {
  let pairs = 0, exclusions = 0;
  for (const puzzle of [...LEVELS, dailyPuzzle("2026-11-02")]) {
    for (const automatic of [false, true]) {
      const board: Board = { cats: [], marks: [] };
      for (let step = 0; step < puzzle.size ** 2 * 2; step++) {
        const hint = coachingHint(puzzle, board, automatic);
        if (!hint) break;
        assert.notEqual(hint.kind, "cat");
        assert.doesNotMatch(hint.explanation, /color \d+/i, "Colors have readable names without numbered cell labels");
        assert.ok(hint.focus.length > 0);
        assert.ok(hint.cells.every((c) => hint.focus.includes(c)));
        if (hint.kind === "mark") {
          assert.ok(hint.cells.length > 0);
          assert.ok(hint.cells.every((c) => !puzzle.solution.includes(c)), `${puzzle.id}: unsafe X: ${hint.explanation}`);
          assert.ok(hint.cells.every((c) => !board.marks.includes(c)));
          board.marks.push(...hint.cells);
          exclusions++;
          if (/need two cats/.test(hint.explanation)) pairs++;
        } else if (hint.kind === "observe") {
          const next = puzzle.solution.find((c) => !board.cats.includes(c));
          if (next === undefined) break;
          board.cats.push(next);
        } else assert.fail(`Clean solve should not need ${hint.kind}`);
      }
      assert.equal(board.cats.length, puzzle.size, `${puzzle.id}: did not finish the teaching flow`);
      assert.equal(coachingHint(puzzle, board), null);
    }
  }
  assert.ok(exclusions > 500);
  assert.ok(pairs > 0, "Paired colors/lines produce useful teaching steps");
});

test("accidental Xs are not used as proof for new exclusions", () => {
  for (const puzzle of LEVELS) {
    const marks = Array.from({ length: puzzle.size ** 2 }, (_, c) => c).filter((c) => c % 2 === 0);
    for (let placed = 0; placed < puzzle.size; placed++) {
      const cats = puzzle.solution.slice(0, placed);
      const hint = coachingHint(puzzle, { cats, marks: marks.filter((c) => !cats.includes(c)) });
      if (hint?.kind === "mark") assert.ok(hint.cells.every((c) => !puzzle.solution.includes(c)));
    }
  }
});

test("crossing out all possible homes requests a review of the whole unit", () => {
  const puzzle = LEVELS[0];
  const marks = Array.from({ length: puzzle.size ** 2 }, (_, c) => c);
  const hint = coachingHint(puzzle, { cats: [], marks });
  assert.equal(hint?.kind, "unmark");
  assert.ok(hint!.focus.length >= hint!.cells.length);
  assert.match(hint!.explanation, /crossed out/);
});

test("an incorrect cat gets a correction, never a replacement solution cell", () => {
  const puzzle = LEVELS[0], wrong = puzzle.regions.findIndex((_, c) => !puzzle.solution.includes(c));
  const hint = coachingHint(puzzle, { cats: [wrong], marks: [] });
  assert.equal(hint?.kind, "remove");
  assert.deepEqual(hint!.cells, [wrong]);
});
