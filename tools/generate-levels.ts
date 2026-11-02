import { writeFileSync } from "node:fs";
import { deduce, solutions, type Puzzle } from "../lib/puzzle.ts";

let seed = 741039;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function permutation(n: number): number[] | null {
  const cols: number[] = [];
  function walk() {
    if (cols.length === n) return true;
    for (const col of shuffle(Array.from({ length: n }, (_, i) => i))) {
      if (
        cols.includes(col) ||
        (cols.length && Math.abs(col - cols[cols.length - 1]) <= 1)
      )
        continue;
      cols.push(col);
      if (walk()) return true;
      cols.pop();
    }
    return false;
  }
  return walk() ? cols.map((c, r) => r * n + c) : null;
}
function make(n: number) {
  const cats = permutation(n)!;
  const regions = Array(n * n).fill(-1),
    counts = Array(n).fill(1);
  cats.forEach((c, r) => {
    regions[c] = r;
  });
  const weights = Array.from({ length: n }, () => 0.4 + random() * 2.6);
  const neighbors = (c: number) =>
    [
      c % n > 0 ? c - 1 : -1,
      c % n < n - 1 ? c + 1 : -1,
      c >= n ? c - n : -1,
      c + n < n * n ? c + n : -1,
    ].filter((x) => x >= 0);
  while (regions.includes(-1)) {
    const edges: [number, number][] = [];
    for (let c = 0; c < n * n; c++)
      if (regions[c] === -1)
        for (const near of neighbors(c))
          if (regions[near] >= 0) edges.push([c, regions[near]]);
    const total = edges.reduce(
      (sum, [, r]) => sum + weights[r] / Math.sqrt(counts[r]),
      0,
    );
    let selected = edges[edges.length - 1];
    let cursor = random() * total;
    for (const edge of edges) {
      cursor -= weights[edge[1]] / Math.sqrt(counts[edge[1]]);
      if (cursor <= 0) {
        selected = edge;
        break;
      }
    }
    regions[selected[0]] = selected[1];
    counts[selected[1]]++;
  }
  return { size: n, regions, solution: cats };
}
const names = [
  "A little sunshine",
  "Window watching",
  "The quiet corner",
  "Soft paws",
  "Afternoon stretch",
  "Garden visitors",
  "One more nap",
  "A patch of warmth",
  "Behind the curtains",
  "The good cushion",
  "Little explorers",
  "Room for everyone",
];
const levels: Puzzle[] = [];
for (let number = 1; number <= 120; number++) {
  const size =
    number <= 12
      ? 5
      : number <= 36
        ? 6
        : number <= 64
          ? 7
          : number <= 96
            ? 8
            : 9;
  for (let attempt = 0; attempt < 200000; attempt++) {
    const candidate = make(size);
    if (solutions(candidate).length !== 1) continue;
    const logical = deduce(candidate);
    if (!logical.solved) continue;
    const duplicate = levels.some(
      (l) => l.size === size && l.regions.join() === candidate.regions.join(),
    );
    if (duplicate) continue;
    levels.push({
      ...candidate,
      id: `level-${String(number).padStart(3, "0")}`,
      number,
      name: names[(number - 1) % names.length],
      difficulty: size <= 6 ? "Easy" : size <= 8 ? "Medium" : "Hard",
      deductions: logical.steps.length,
    });
    break;
  }
  if (levels.length !== number)
    throw new Error(`Could not generate level ${number}`);
  if (number % 12 === 0) console.log(`${number}/120 levels validated`);
}
writeFileSync(
  new URL("../lib/levels.json", import.meta.url),
  JSON.stringify(levels),
);
