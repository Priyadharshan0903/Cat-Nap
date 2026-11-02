import rawLevels from "./levels.json" with { type: "json" };
import expertLevels from "./expert-levels.json" with { type: "json" };
import varietyLevels from "./variety-levels.json" with { type: "json" };
import journeyIds from "./journey.json" with { type: "json" };
import { assessPuzzle } from "./difficulty.ts";
import type { Puzzle } from "./puzzle.ts";
export const CLASSIC_LEVELS = rawLevels as Puzzle[];
export const EXPERT_LEVELS = expertLevels as Puzzle[];
export const VARIETY_LEVELS = varietyLevels as Puzzle[];
// Permanent catalog order is separate from the player-facing journey.
export const LEVELS = [...CLASSIC_LEVELS, ...EXPERT_LEVELS, ...VARIETY_LEVELS];
const byId = new Map(LEVELS.map((p) => [p.id, p]));
export const JOURNEY = journeyIds.map((id) => {
  const puzzle = byId.get(id);
  if (!puzzle) throw new Error("Unknown journey puzzle: " + id);
  return puzzle;
});
const stages = new Map(JOURNEY.map((p, i) => [p.id, i + 1]));
const profiles = new Map(LEVELS.map((p) => [p.id, assessPuzzle(p)]));
export const profileFor = (puzzle: Puzzle) => profiles.get(puzzle.id) ?? assessPuzzle(puzzle);
export const stageNumber = (id: string) => stages.get(id) ?? 1;
export function nextJourneyPuzzle(id: string, completed: Record<string, unknown>) {
  const after = stages.get(id) ?? 0;
  return JOURNEY.slice(after).find((p) => !completed[p.id]) ?? JOURNEY.find((p) => !completed[p.id]);
}
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dailyPuzzle(day: string): Puzzle {
  const hash =
    [...day].reduce((v, c) => (Math.imul(v, 31) + c.charCodeAt(0)) | 0, 7) >>>
    0;
  const base = CLASSIC_LEVELS[36 + (hash % 60)];
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
  if (/^daily-\d{4}-\d{2}-\d{2}$/.test(id)) {
    const date = new Date(`${id.slice(6)}T12:00:00`);
    return Number.isFinite(date.getTime()) && dayKey(date) === id.slice(6) ? dailyPuzzle(id.slice(6)) : undefined;
  }
  return LEVELS.find((l) => l.id === id);
}
export const LEGACY_CHAPTERS = [
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
  {
    name: "The midnight conservatory",
    description: "Deeper deductions for curious minds.",
    start: 121,
    end: 132,
    color: "#a5c2b2",
  },
];

// Chapter gift slots stay stable; their original completion groups remain valid too.
const ends = [12, 38, 70, 108, 138, 156];
const descriptions = [
  "Familiar steps, with a little variety.",
  "Small boards, fresh ways to think.",
  "A thoughtful mix of shapes and sizes.",
  "A challenge, then a little breathing room.",
  "Let the deductions lead you further.",
  "Clever twists and quiet little victories.",
];
export const CHAPTERS = LEGACY_CHAPTERS.map((chapter, i) => ({
  ...chapter, start: i ? ends[i - 1] + 1 : 1, end: ends[i], description: descriptions[i],
}));
export const chapterFor = (id: string) =>
  CHAPTERS.find((chapter) => stageNumber(id) >= chapter.start && stageNumber(id) <= chapter.end) ?? CHAPTERS[0];
export const chapterLevels = (index: number) => JOURNEY.slice(CHAPTERS[index].start - 1, CHAPTERS[index].end);
