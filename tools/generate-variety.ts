import { existsSync, writeFileSync } from "node:fs";
import classics from "../lib/levels.json" with { type: "json" };
import experts from "../lib/expert-levels.json" with { type: "json" };
import { deduce, solutions, type Puzzle } from "../lib/puzzle.ts";
import { assessPuzzle } from "../lib/difficulty.ts";

const output = new URL("../lib/variety-levels.json", import.meta.url);
if (existsSync(output)) throw new Error("Variety IDs already exist; never replace published boards.");
let seed = 582903;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
const adjacent = (c: number, n: number) => [c % n ? c - 1 : -1, c % n < n - 1 ? c + 1 : -1, c >= n ? c - n : -1, c + n < n * n ? c + n : -1].filter((v) => v >= 0);
function connected(regions: number[], region: number, n: number) {
  const cells = regions.flatMap((r, c) => r === region ? [c] : []);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]), queue = [cells[0]];
  while (queue.length) for (const c of adjacent(queue.pop()!, n)) if (regions[c] === region && !seen.has(c)) { seen.add(c); queue.push(c); }
  return seen.size === cells.length;
}
function transform(p: Pick<Puzzle, "regions" | "solution" | "size">, rotation: number, mirror: boolean) {
  const n = p.size, move = (cell: number) => {
    let r = Math.floor(cell / n), c = cell % n;
    if (mirror) c = n - 1 - c;
    for (let i = 0; i < rotation; i++) [r, c] = [c, n - 1 - r];
    return r * n + c;
  };
  const regions = Array(n * n).fill(0);
  p.regions.forEach((region, c) => { regions[move(c)] = region; });
  return { size: n, regions, solution: p.solution.map(move).sort((a, b) => a - b) };
}
function canonical(p: Pick<Puzzle, "regions" | "solution" | "size">) {
  const variants: string[] = [];
  for (let turn = 0; turn < 4; turn++) for (const mirror of [false, true]) {
    const labels = new Map<number, number>();
    variants.push(transform(p, turn, mirror).regions.map((r) => {
      if (!labels.has(r)) labels.set(r, labels.size);
      return labels.get(r);
    }).join(","));
  }
  return p.size + ":" + variants.sort()[0];
}
const seen = new Set([...classics, ...experts].map(canonical));
const selected: Puzzle[] = [], names = ["Pocket paths", "Around the corner", "A winding thought", "Room to breathe", "Between the leaves", "The clever little turn"];
for (const n of [5, 6, 7, 8]) {
  const seeds = classics.filter((p) => p.size === n);
  let current = transform(pick(seeds), 0, false), accepted = 0, count = 0;
  const answers = new Set<string>();
  for (let attempt = 0; attempt < 400_000 && count < 6; attempt++) {
    if (attempt % 6000 === 0) { current = transform(pick(seeds), Math.floor(random() * 4), random() < 0.5); accepted = 0; }
    const boundary = current.regions.flatMap((r, c) => adjacent(c, n).some((v) => current.regions[v] !== r) ? [c] : []);
    const cell = pick(boundary), old = current.regions[cell];
    const replacement = pick(adjacent(cell, n).map((v) => current.regions[v]).filter((r) => r !== old));
    const regions = [...current.regions]; regions[cell] = replacement;
    if (!connected(regions, old, n)) continue;
    const candidate = { size: n, regions }, found = solutions(candidate);
    if (found.length !== 1) continue;
    const logical = deduce(candidate);
    if (!logical.solved) continue;
    current = { ...candidate, solution: found[0] }; accepted++;
    if (accepted < 18) continue;
    const profile = assessPuzzle(current), kind = count % 3;
    const eligible = kind === 0 ? profile.openingExclusionRounds === 0 && profile.exclusionRounds <= 1
      : kind === 1 ? profile.openingExclusionRounds <= 1 && profile.exclusionRounds >= 1 && profile.exclusionRounds <= 2
      : profile.openingExclusionRounds >= 2 || profile.exclusionRounds >= 3;
    if (!eligible || seen.has(canonical(current))) continue;
    const variants = Array.from({ length: 8 }, (_, i) => transform(current, i % 4, i >= 4));
    const chosen = variants.find((p) => {
      const a = assessPuzzle(p);
      return !answers.has(p.solution.join(",")) && (kind !== 2 || a.openingExclusionRounds >= 2 || a.exclusionRounds >= 3);
    });
    if (!chosen) continue;
    const actual = assessPuzzle(chosen), number = 133 + selected.length;
    selected.push({ ...chosen, id: "level-" + number, number, name: names[count], difficulty: actual.difficulty, deductions: n });
    seen.add(canonical(chosen)); answers.add(chosen.solution.join(",")); count++; accepted = 0;
    console.log(n + "x" + n + " " + count + "/6: " + actual.difficulty + ", " + actual.focus + ", " + actual.shape);
  }
  if (count !== 6) throw new Error("Could not build the " + n + "x" + n + " variety set; nothing published.");
}
writeFileSync(output, JSON.stringify(selected));
console.log("Published 24 new boards without touching the previous 132.");
