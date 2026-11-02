import { existsSync, writeFileSync } from "node:fs";
import classics from "../lib/levels.json" with { type: "json" };
import { deduce, solutions, type Puzzle } from "../lib/puzzle.ts";

// This generator publishes NEW IDs only. Never rewrite the classic pack.
const output = new URL(process.argv[2] ?? "../lib/expert-levels.json", import.meta.url);
if (existsSync(output)) throw new Error("Expert IDs are already published; do not replace their boards.");
let seed = 993317;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
const n = 9;
const neighbors = (c: number) => [c % n ? c - 1 : -1, c % n < n - 1 ? c + 1 : -1, c >= n ? c - n : -1, c + n < n * n ? c + n : -1].filter((c) => c >= 0);
function connected(regions: number[], region: number) {
  const cells = regions.flatMap((r, c) => r === region ? [c] : []);
  if (cells.length < 2) return false;
  const seen = new Set([cells[0]]), queue = [cells[0]];
  while (queue.length) for (const c of neighbors(queue.pop()!)) {
    if (regions[c] === region && !seen.has(c)) { seen.add(c); queue.push(c); }
  }
  return seen.size === cells.length;
}
function transform(puzzle: Pick<Puzzle, "regions" | "solution" | "size">, rotation: number, mirror: boolean) {
  const cell = (c: number) => {
    let y = Math.floor(c / n), x = c % n;
    if (mirror) x = n - 1 - x;
    for (let i = 0; i < rotation; i++) [y, x] = [x, n - 1 - y];
    return y * n + x;
  };
  const regions = Array(n * n).fill(0);
  puzzle.regions.forEach((r, c) => { regions[cell(c)] = r; });
  return { size: n, regions, solution: puzzle.solution.map(cell).sort((a, b) => a - b) };
}
// Normalize labels too: rotations, mirrors, and color relabelings are not new puzzles.
function canonical(p: Pick<Puzzle, "regions" | "solution" | "size">) {
  const variants: string[] = [];
  for (let turn = 0; turn < 4; turn++) for (const mirror of [false, true]) {
    const labels = new Map<number, number>();
    variants.push(transform(p, turn, mirror).regions.map((r) => {
      if (!labels.has(r)) labels.set(r, labels.size);
      return labels.get(r);
    }).join(","));
  }
  return variants.sort()[0];
}
const seeds = classics.filter((p) => p.size === n && Array.from({ length: n }, (_, r) => p.regions.filter((v) => v === r).length).every((count) => count >= 2));
const seen = new Set(classics.filter((p) => p.size === n).map(canonical));
const selected: Puzzle[] = [];
const answerPatterns = new Set<string>();
const names = ["Moonlit paths", "A quieter challenge", "Through the ivy", "Glasshouse corners", "A twist in the trail", "After the rain", "Hidden in the leaves", "Midnight visitors", "The long way home", "One careful thought", "Beyond the lantern", "The last little mystery"];
let current = transform(seeds[0], 0, false), accepted = 0, sinceSelection = 0;
for (let attempt = 0; attempt < 2_000_000 && selected.length < 12; attempt++) {
  if (attempt % 10000 === 0) {
    current = transform(seeds[Math.floor(attempt / 10000) % seeds.length], Math.floor(random() * 4), random() < 0.5);
    sinceSelection = 0;
  }
  const boundary = current.regions.flatMap((r, c) => neighbors(c).some((near) => current.regions[near] !== r) ? [c] : []);
  const cell = pick(boundary), old = current.regions[cell];
  const replacement = pick(neighbors(cell).map((c) => current.regions[c]).filter((r) => r !== old));
  const regions = [...current.regions]; regions[cell] = replacement;
  if (!connected(regions, old)) continue; // The new region grows from a neighboring cell.
  const candidate = { size: n, regions };
  const found = solutions(candidate);
  if (found.length !== 1) continue;
  const logical = deduce(candidate);
  if (!logical.solved) continue;
  current = { ...candidate, solution: found[0] };
  accepted++; sinceSelection++;
  if (sinceSelection < 35 || logical.metrics.openingExclusionRounds < 2 || logical.metrics.exclusionRounds < 4) continue;
  const fingerprint = canonical(current);
  if (seen.has(fingerprint)) continue;
  const variants = Array.from({ length: 8 }, (_, i) => transform(current, i % 4, i >= 4));
  const offset = Math.floor(random() * variants.length);
  const chosen = [...variants.slice(offset), ...variants.slice(0, offset)].find((p) => {
    const metrics = deduce(p).metrics;
    return !answerPatterns.has(p.solution.join(",")) && metrics.openingExclusionRounds >= 2 && metrics.exclusionRounds >= 4;
  });
  if (!chosen) continue;
  // Avoid near-identical regional layouts within the new chapter as well.
  if (selected.some((p) => p.regions.filter((r, c) => r !== chosen.regions[c]).length < 18)) continue;
  const number = 121 + selected.length;
  selected.push({ ...chosen, id: `level-${number}`, number, name: names[selected.length], difficulty: "Expert", deductions: logical.steps.length });
  answerPatterns.add(chosen.solution.join(","));
  seen.add(fingerprint); sinceSelection = 0;
  console.log(`Expert ${selected.length}/12: ${logical.metrics.openingExclusionRounds} opening exclusion rounds; ${logical.metrics.exclusionRounds} total; attempt ${attempt}`);
}
if (selected.length !== 12) throw new Error(`Only found ${selected.length} suitable puzzles; nothing was published.`);
selected.sort((a, b) => {
  const aMetrics = deduce(a).metrics, bMetrics = deduce(b).metrics;
  return aMetrics.openingExclusionRounds - bMetrics.openingExclusionRounds || aMetrics.exclusionRounds - bMetrics.exclusionRounds;
});
selected.forEach((p, i) => { p.id = `level-${121 + i}`; p.number = 121 + i; p.name = names[i]; });
writeFileSync(output, JSON.stringify(selected));
console.log(`Published 12 distinct, unique, connected, deduction-solvable Expert boards after ${accepted} accepted mutations.`);
