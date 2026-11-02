import { deduce, type Difficulty, type Puzzle } from "./puzzle.ts";

export function assessPuzzle(puzzle: Pick<Puzzle, "size" | "regions">) {
  const { metrics } = deduce(puzzle);
  const score = metrics.openingExclusionRounds * 3 + metrics.exclusionRounds * 2;
  let difficulty: Difficulty = metrics.openingExclusionRounds >= 2 && metrics.exclusionRounds >= 4 ? "Expert"
    : metrics.openingExclusionRounds >= 2 || metrics.exclusionRounds >= 3 ? "Hard"
    : metrics.exclusionRounds >= 2 || puzzle.size >= 8 ? "Medium" : "Easy";
  // A compact search field reduces the scanning burden, but does not hide deep deductions.
  if (puzzle.size === 5 && difficulty === "Hard") difficulty = "Medium";
  const rank = ["Easy", "Medium", "Hard", "Expert"].indexOf(difficulty);
  const focus = metrics.neighborExclusions > metrics.lineExclusions ? "No-touch logic"
    : metrics.lineExclusions > 0 ? "Color & line logic" : "Spot the singles";
  let ribbons = 0, fill = 0;
  for (let r = 0; r < puzzle.size; r++) {
    const cells = puzzle.regions.flatMap((v, c) => v === r ? [c] : []);
    const rows = cells.map((c) => Math.floor(c / puzzle.size)), cols = cells.map((c) => c % puzzle.size);
    const height = Math.max(...rows) - Math.min(...rows) + 1, width = Math.max(...cols) - Math.min(...cols) + 1;
    if (cells.length >= 4 && Math.max(height, width) >= 3 * Math.min(height, width)) ribbons++;
    fill += cells.length / (height * width);
  }
  const shape = ribbons >= 2 ? "Ribbon regions" : fill / puzzle.size < 0.73 ? "Winding regions" : "Open patches";
  return { difficulty, rank, score, focus, shape, ...metrics };
}
