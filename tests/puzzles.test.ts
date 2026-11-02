import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS, dailyPuzzle } from "../lib/catalog.ts";
import {
  conflicts,
  deduce,
  incompatible,
  isSolved,
  nextHint,
  solutions,
  touch,
} from "../lib/puzzle.ts";

test("the pack has 120 distinct levels and a gradual range of board sizes", () => {
  assert.equal(LEVELS.length, 120);
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, 120);
  assert.deepEqual([...new Set(LEVELS.map((l) => l.size))], [5, 6, 7, 8, 9]);
  assert.equal(new Set(LEVELS.map((l) => l.regions.join())).size, 120);
});
for (const puzzle of LEVELS)
  test(`${puzzle.id}: connected regions, exactly one solution, logical hints`, () => {
    const n = puzzle.size;
    assert.equal(puzzle.regions.length, n * n);
    assert.equal(new Set(puzzle.regions).size, n);
    for (let region = 0; region < n; region++) {
      const cells = puzzle.regions
        .map((r, c) => (r === region ? c : -1))
        .filter((c) => c >= 0);
      const visited = new Set([cells[0]]),
        queue = [cells[0]];
      while (queue.length) {
        const c = queue.shift()!;
        for (const near of cells)
          if (
            !visited.has(near) &&
            ((Math.floor(c / n) === Math.floor(near / n) &&
              Math.abs(c - near) === 1) ||
              Math.abs(c - near) === n)
          ) {
            visited.add(near);
            queue.push(near);
          }
      }
      assert.equal(
        visited.size,
        cells.length,
        `Region ${region} is contiguous`,
      );
    }
    assert.ok(isSolved(puzzle, puzzle.solution));
    const found = solutions(puzzle);
    assert.equal(found.length, 1);
    assert.deepEqual(found[0], puzzle.solution);
    const logical = deduce(puzzle);
    assert.ok(logical.solved);
    const placed: number[] = [];
    for (const step of logical.steps) {
      assert.ok(puzzle.solution.includes(step.cell));
      const hint = nextHint(puzzle, { cats: placed, marks: [] });
      assert.equal(hint?.kind, "cat");
      assert.ok(puzzle.solution.includes(hint!.cell));
      placed.push(step.cell);
    }
  });
test("the rules distinguish rows, columns, region membership, and diagonal touching", () => {
  const p = LEVELS[0],
    n = p.size;
  assert.ok(incompatible(0, 1, p));
  assert.ok(incompatible(0, n, p));
  assert.ok(touch(0, n + 1, n));
  assert.equal(
    touch(n - 1, n, n),
    false,
    "row wrapping does not count as adjacency",
  );
  assert.equal(isSolved(p, [0, 0, 0, 0, 0]), false);
  assert.equal(isSolved(p, p.solution.slice(1)), false);
  assert.deepEqual(conflicts(p, p.solution), []);
});
test("hints repair an incorrect cat and an accidental X before offering a placement", () => {
  const p = LEVELS[0];
  const wrong = p.regions.findIndex((_, cell) => !p.solution.includes(cell));
  assert.equal(nextHint(p, { cats: [wrong], marks: [] })?.kind, "remove");
  const first = nextHint(p, { cats: [], marks: [] })!;
  assert.equal(nextHint(p, { cats: [], marks: [first.cell] })?.kind, "unmark");
  assert.equal(nextHint(p, { cats: p.solution, marks: [] }), null);
});
test("a daily puzzle is deterministic and all transformations preserve its rules", () => {
  for (const day of ["2026-11-02", "2026-11-03", "2026-11-04", "2027-01-01"]) {
    const p = dailyPuzzle(day);
    assert.deepEqual(p, dailyPuzzle(day));
    assert.ok(isSolved(p, p.solution));
    assert.equal(solutions(p).length, 1);
    assert.ok(deduce(p).solved);
  }
});
