import rawLevels from "./levels.json" with { type: "json" };
import type { Puzzle } from "./puzzle.ts";
export const LEVELS = rawLevels as Puzzle[];
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dailyPuzzle(day: string): Puzzle {
  const hash =
    [...day].reduce((v, c) => (Math.imul(v, 31) + c.charCodeAt(0)) | 0, 7) >>>
    0;
  const base = LEVELS[36 + (hash % 60)];
  const n = base.size,
    rotate = hash % 4,
    mirror = hash % 2 === 0;
  const transform = (cell: number) => {
    let r = Math.floor(cell / n),
      c = cell % n;
    if (mirror) c = n - 1 - c;
    for (let turn = 0; turn < rotate; turn++) [r, c] = [c, n - 1 - r];
    return r * n + c;
  };
  const regions = Array(n * n).fill(0);
  base.regions.forEach((region, cell) => {
    regions[transform(cell)] = region;
  });
  return {
    ...base,
    id: `daily-${day}`,
    name: "A little ritual",
    regions,
    solution: base.solution.map(transform).sort((a, b) => a - b),
  };
}
export function getPuzzle(id: string): Puzzle | undefined {
  if (/^daily-\d{4}-\d{2}-\d{2}$/.test(id)) return dailyPuzzle(id.slice(6));
  return LEVELS.find((l) => l.id === id);
}
export const CHAPTERS = [
  {
    name: "The sunny windowsill",
    description: "Small steps, soft paws.",
    start: 1,
    end: 12,
    color: "#e9d58c",
  },
  {
    name: "The little garden",
    description: "Let your curiosity wander.",
    start: 13,
    end: 36,
    color: "#b8cfa8",
  },
  {
    name: "The reading room",
    description: "A little room to think.",
    start: 37,
    end: 64,
    color: "#b6d5df",
  },
  {
    name: "The afternoon hideaway",
    description: "Find the unexpected.",
    start: 65,
    end: 96,
    color: "#e6b8a8",
  },
  {
    name: "Under the moon",
    description: "For the quietly determined.",
    start: 97,
    end: 120,
    color: "#bbc6c7",
  },
];
