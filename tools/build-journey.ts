import { existsSync, writeFileSync } from "node:fs";
import classics from "../lib/levels.json" with { type: "json" };
import experts from "../lib/expert-levels.json" with { type: "json" };
import variety from "../lib/variety-levels.json" with { type: "json" };
import { assessPuzzle } from "../lib/difficulty.ts";
import type { Puzzle } from "../lib/puzzle.ts";

const output = new URL(process.argv[2] ?? "../lib/journey.json", import.meta.url);
if (existsSync(output)) throw new Error("Journey already published; changing it requires a reviewed migration.");
const all = [...classics, ...experts, ...variety] as Puzzle[];
const profiles = new Map(all.map((p) => [p.id, assessPuzzle(p)]));
const profile = (p: Puzzle) => profiles.get(p.id)!;
const sizes = [12, 26, 32, 38, 30, 18];
const pool = all.slice(6), journey = all.slice(0, 6);
const newIds = new Set(variety.map((p) => p.id));
const hardCount = pool.filter((p) => profile(p).rank >= 2).length;
const weights = [0, .06, .12, .22, .27, .33];
const quotas = weights.map((w, i) => Math.min(Math.floor(hardCount * w), Math.floor(sizes[i] / 2)));
let remainder = hardCount - quotas.reduce((a, b) => a + b, 0);
for (let i = 5; remainder; i = i === 1 ? 5 : i - 1) {
  if (quotas[i] < Math.floor(sizes[i] / 2)) { quotas[i]++; remainder--; }
}
const expertCount = pool.filter((p) => profile(p).rank === 3).length;
const expertQuotas = [0, 0, 0, Math.min(quotas[3], Math.floor(expertCount * .25)), Math.min(quotas[4], Math.floor(expertCount * .33)), 0];
expertQuotas[5] = expertCount - expertQuotas[3] - expertQuotas[4];
if (expertQuotas[5] > quotas[5]) throw new Error("Expert pacing quota cannot fit.");
const patterns = [[5,6,5,6,5,6], [6,5,7,6,7,6,5,7], [7,6,8,7,8,6,7,5], [8,7,9,8,6,9,7,8], [9,8,7,9,6,8,9,5], [9,7,8,9,6,9]];
const varietyQuotas = [2,4,4,5,5,4];
let start = 0;
for (let chapter = 0; chapter < sizes.length; chapter++) {
  const count = sizes[chapter], hardSlots = new Set(Array.from({ length: quotas[chapter] }, (_, k) => Math.floor(k * count / quotas[chapter])));
  let hardUsed = 0, varietyUsed = 0;
  for (let local = 0; local < count; local++) {
    if (chapter === 0 && local < 6) continue;
    const hard = hardSlots.has(local), previous = journey[journey.length - 1];
    const wantExpert = hard && Math.floor((hardUsed + 1) * expertQuotas[chapter] / quotas[chapter]) > Math.floor(hardUsed * expertQuotas[chapter] / quotas[chapter]);
    const targetSize = patterns[chapter][local % patterns[chapter].length];
    const needsCompact = profile(previous).rank === 3;
    let candidates = pool.filter((p) => hard ? profile(p).rank >= 2 && (profile(p).rank === 3) === wantExpert : profile(p).rank < 2);
    if (!hard) {
      const upperSize = chapter === 0 ? 6 : chapter === 1 ? 7 : chapter === 2 ? 8 : 9;
      const bounded = candidates.filter((p) => p.size <= upperSize && (!needsCompact || p.size <= 7));
      if (bounded.length) candidates = bounded;
      const compactLeft = pool.filter((p) => profile(p).rank < 2 && p.size <= 7).length;
      const expertsLeft = pool.filter((p) => profile(p).rank === 3).length;
      if (!needsCompact && chapter >= 2 && compactLeft <= expertsLeft + 4) {
        const large = candidates.filter((p) => p.size >= 8);
        if (large.length) candidates = large;
      }
    }
    if (!candidates.length) throw new Error("No puzzle fits mixed stage " + (start + local + 1));
    const desiredNew = Math.floor((local + 1) * varietyQuotas[chapter] / count);
    const cost = (p: Puzzle) => {
      const a = profile(p), recent = journey.slice(-2);
      return Math.abs(p.size - targetSize) * 4 +
        (recent.every((v) => v.size === p.size) ? 40 : 0) +
        (previous.size === p.size ? 3 : 0) +
        (profile(previous).focus === a.focus ? 2 : 0) +
        (newIds.has(p.id) ? varietyUsed < desiredNew ? -12 : 5 : 0) +
        (hard ? Math.abs(a.score - (8 + (start + local) / 156 * 14)) : a.score / 10);
    };
    candidates.sort((a, b) => cost(a) - cost(b) || a.number - b.number);
    const chosen = candidates[0];
    journey.push(chosen); pool.splice(pool.indexOf(chosen), 1);
    if (hard) hardUsed++;
    if (newIds.has(chosen.id)) varietyUsed++;
  }
  console.log("Chapter " + (chapter + 1) + ": " + quotas[chapter] + " challenges / " + count + ", " + expertQuotas[chapter] + " Expert");
  start += count;
}
if (pool.length || journey.length !== 156 || new Set(journey.map((p) => p.id)).size !== 156) throw new Error("Incomplete journey");
const chapterAt = (index: number) => { let end = 0; return sizes.findIndex((size) => (end += size) > index); };
const fits = (index: number, p: Puzzle) => {
  const chapter = chapterAt(index), cap = chapter === 0 ? 6 : chapter === 1 ? 7 : chapter === 2 ? 8 : 9;
  return p.size <= cap && (index === 0 || profile(journey[index - 1]).rank !== 3 || (p.size <= 7 && profile(p).rank < 2));
};
const cleanAround = (index: number) => {
  for (let end = Math.max(6, index); end <= Math.min(journey.length - 1, index + 3); end++) {
    if (end >= 6 && journey.slice(end - 3, end + 1).every((p) => p.size === journey[end].size)) return false;
  }
  return true;
};
for (let i = 6; i < journey.length; i++) {
  if (journey.slice(i - 3, i + 1).some((p) => p.size !== journey[i].size)) continue;
  const swapCandidates = [
    ...Array.from({ length: journey.length - i - 1 }, (_, k) => i + 1 + k),
    ...Array.from({ length: i - 6 }, (_, k) => i - 1 - k),
  ];
  let repaired = false;
  for (let slot = i; slot >= Math.max(6, i - 3) && !repaired; slot--) {
    for (const j of swapCandidates) {
      if (j >= i - 3 && j <= i) continue;
      const a = journey[slot], b = journey[j];
      if (a.size === b.size || profile(a).rank !== profile(b).rank || profile(a).rank === 3 || !fits(slot, b) || !fits(j, a)) continue;
      [journey[slot], journey[j]] = [b, a];
      if (cleanAround(slot) && cleanAround(j)) { repaired = true; break; }
      [journey[slot], journey[j]] = [a, b];
    }
  }
}
if (journey.some((p, i) => i >= 6 && journey.slice(i - 3, i + 1).every((other) => other.size === p.size)))
  throw new Error("A repetitive board-size run remains; no journey published.");
writeFileSync(output, JSON.stringify(journey.map((p) => p.id)));
console.log("Published one mixed path with every puzzle exactly once.");
