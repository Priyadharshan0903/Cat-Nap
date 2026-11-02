export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";
export type Puzzle = {
  id: string;
  number: number;
  name: string;
  size: number;
  regions: number[];
  solution: number[];
  difficulty: Difficulty;
  deductions: number;
};
export type Board = { cats: number[]; marks: number[] };
export type Hint = {
  cell: number;
  kind: "cat" | "remove" | "unmark";
  explanation: string;
};

export function touch(a: number, b: number, size: number) {
  return (
    Math.abs(Math.floor(a / size) - Math.floor(b / size)) <= 1 &&
    Math.abs((a % size) - (b % size)) <= 1
  );
}
export function incompatible(
  a: number,
  b: number,
  puzzle: Pick<Puzzle, "size" | "regions">,
) {
  return (
    Math.floor(a / puzzle.size) === Math.floor(b / puzzle.size) ||
    a % puzzle.size === b % puzzle.size ||
    puzzle.regions[a] === puzzle.regions[b] ||
    touch(a, b, puzzle.size)
  );
}
export function conflicts(puzzle: Puzzle, cats: number[]) {
  return cats.filter((a) =>
    cats.some((b) => a !== b && incompatible(a, b, puzzle)),
  );
}
export function isSolved(puzzle: Puzzle, cats: number[]) {
  return (
    cats.length === puzzle.size &&
    new Set(cats).size === puzzle.size &&
    cats.every((c) => Number.isInteger(c) && c >= 0 && c < puzzle.size ** 2) &&
    conflicts(puzzle, cats).length === 0
  );
}

/** Bounded exact solver; used to validate each published level, never to invent a hint. */
export function solutions(
  puzzle: Pick<Puzzle, "size" | "regions">,
  limit = 2,
  fixed: number[] = [],
) {
  const { size, regions } = puzzle;
  const result: number[][] = [];
  const chosen: number[] = [];
  const columns = new Set<number>(),
    colors = new Set<number>();
  const fixedRows = new Map(fixed.map((c) => [Math.floor(c / size), c]));
  if (
    fixedRows.size !== fixed.length ||
    fixed.some((a) => fixed.some((b) => a !== b && incompatible(a, b, puzzle)))
  )
    return [];
  function walk(row: number) {
    if (result.length >= limit) return;
    if (row === size) {
      result.push([...chosen]);
      return;
    }
    const fixedCell = fixedRows.get(row);
    for (let col = 0; col < size; col++) {
      const cell = row * size + col;
      if (fixedCell !== undefined && cell !== fixedCell) continue;
      if (
        columns.has(col) ||
        colors.has(regions[cell]) ||
        (row > 0 && Math.abs(col - (chosen[row - 1] % size)) <= 1)
      )
        continue;
      chosen.push(cell);
      columns.add(col);
      colors.add(regions[cell]);
      walk(row + 1);
      chosen.pop();
      columns.delete(col);
      colors.delete(regions[cell]);
    }
  }
  walk(0);
  return result;
}

/** Pure deductions: singles, region/line intersections, and shared no-touch exclusions. */
export function deduce(
  puzzle: Pick<Puzzle, "size" | "regions">,
  placed: number[] = [],
) {
  const { size, regions } = puzzle;
  const cats = [...placed],
    steps: { cell: number; explanation: string }[] = [];
  const metrics = { initialSingles: 0, exclusionRounds: 0, openingExclusionRounds: 0, lineExclusions: 0, neighborExclusions: 0 };
  let candidates = Array.from({ length: size * size }, (_, i) => i).filter(
    (c) => !cats.some((a) => incompatible(a, c, puzzle)),
  );
  const regionName = (r: number) => `region ${r + 1}`;
  for (let round = 0; round < size ** 3 && cats.length < size; round++) {
    let changed = false;
    const groups: { cells: number[]; explanation: string }[] = [];
    for (let i = 0; i < size; i++) {
      if (!cats.some((c) => regions[c] === i))
        groups.push({
          cells: candidates.filter((c) => regions[c] === i),
          explanation: `The outlined ${regionName(i)} has only one possible home left after applying the row, column, region, and no-touch rules.`,
        });
      if (!cats.some((c) => Math.floor(c / size) === i))
        groups.push({
          cells: candidates.filter((c) => Math.floor(c / size) === i),
          explanation: `Row ${i + 1} has only one square left that can hold a cat.`,
        });
      if (!cats.some((c) => c % size === i))
        groups.push({
          cells: candidates.filter((c) => c % size === i),
          explanation: `Column ${i + 1} has only one square left that can hold a cat.`,
        });
    }
    if (round === 0) metrics.initialSingles = groups.filter((g) => g.cells.length === 1).length;
    if (groups.some((g) => g.cells.length === 0))
      return { cats, steps, solved: false, metrics };
    const single = groups.find((g) => g.cells.length === 1);
    if (single) {
      const cell = single.cells[0];
      cats.push(cell);
      steps.push({ cell, explanation: single.explanation });
      candidates = candidates.filter((c) => !incompatible(c, cell, puzzle));
      continue;
    }
    for (const group of groups) {
      if (!group.cells.length) continue;
      // A cat must occupy one of these cells. Any square conflicting with ALL of them is impossible.
      const next = candidates.filter(
        (c) =>
          group.cells.includes(c) ||
          !group.cells.every((a) => incompatible(a, c, puzzle)),
      );
      if (next.length < candidates.length) {
        for (const c of candidates.filter((v) => !next.includes(v))) {
          const lineOnly = group.cells.every((a) =>
            Math.floor(a / size) === Math.floor(c / size) || a % size === c % size || regions[a] === regions[c]);
          if (lineOnly) metrics.lineExclusions++; else metrics.neighborExclusions++;
        }
        candidates = next;
        changed = true;
      }
    }
    if (!changed) break;
    metrics.exclusionRounds++;
    if (cats.length === placed.length) metrics.openingExclusionRounds++;
  }
  return { cats, steps, solved: cats.length === size, metrics };
}

export function nextHint(puzzle: Puzzle, board: Board): Hint | null {
  const wrong = board.cats.find((c) => !puzzle.solution.includes(c));
  if (wrong !== undefined)
    return {
      cell: wrong,
      kind: "remove",
      explanation: `The cat at row ${Math.floor(wrong / puzzle.size) + 1}, column ${(wrong % puzzle.size) + 1} leaves no complete solution. Remove it to make room for the other cats.`,
    };
  const result = deduce(puzzle, board.cats);
  const step = result.steps[0];
  if (!step) return null;
  if (board.marks.includes(step.cell))
    return {
      cell: step.cell,
      kind: "unmark",
      explanation: `One of your X marks covers a possible cat. ${step.explanation}`,
    };
  return { ...step, kind: "cat" };
}

export function autoMarks(puzzle: Puzzle, cats: number[]) {
  return Array.from({ length: puzzle.size ** 2 }, (_, c) => c).filter(
    (c) => !cats.includes(c) && cats.some((a) => incompatible(a, c, puzzle)),
  );
}
