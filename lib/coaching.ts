import { autoMarks, incompatible, isSolved, type Board, type Puzzle } from "./puzzle.ts";
import { REGION_NAMES } from "./palette.ts";

export type CoachingHint = {
  kind: "mark" | "remove" | "unmark" | "observe";
  cells: number[];
  focus: number[];
  explanation: string;
};
type Unit = { type: "row" | "column" | "color"; index: number; cells: number[]; scope: number[]; name: string };
const unique = (cells: number[]) => [...new Set(cells)];
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Teach one exclusion from visible rules. Player X marks are never trusted as premises. */
export function coachingHint(puzzle: Puzzle, board: Board, automatic = false): CoachingHint | null {
  if (isSolved(puzzle, board.cats)) return null;
  const n = puzzle.size, all = Array.from({ length: n * n }, (_, c) => c);
  const wrong = board.cats.find((c) => !puzzle.solution.includes(c));
  if (wrong !== undefined) return {
    kind: "remove", cells: [wrong],
    focus: all.filter((c) => Math.floor(c / n) === Math.floor(wrong / n) || puzzle.regions[c] === puzzle.regions[wrong]),
    explanation: "This placed cat leaves no complete arrangement. Reconsider the outlined cat before using its row or color to rule out more squares.",
  };
  const blocked = autoMarks(puzzle, board.cats);
  const unseen = (cells: number[]) => cells.filter((c) => !board.marks.includes(c) && !(automatic && blocked.includes(c)));
  for (const cat of board.cats) {
    const excluded = all.filter((c) => c !== cat && incompatible(cat, c, puzzle));
    const cells = unseen(excluded);
    if (cells.length) return { kind: "mark", cells, focus: unique([cat, ...excluded]), explanation:
      `The cat in row ${Math.floor(cat / n) + 1} already owns its row, column, and color. It also needs space at the corners. The outlined squares cannot hold another cat; mark them X.` };
  }
  let candidates = all.filter((c) => !board.cats.includes(c) && !blocked.includes(c));
  for (let round = 0; round < n ** 3; round++) {
    const groups: Unit[] = [];
    for (const type of ["color", "row", "column"] as const) {
      const unit = (c: number) => type === "row" ? Math.floor(c / n) : type === "column" ? c % n : puzzle.regions[c];
      for (let i = 0; i < n; i++) if (!board.cats.some((c) => unit(c) === i)) {
        const scope = all.filter((c) => unit(c) === i);
        groups.push({ type, index: i, scope, cells: candidates.filter((c) => unit(c) === i), name: type === "color" ? `the ${REGION_NAMES[i].toLowerCase()} region` : `${type} ${i + 1}` });
      }
    }
    // A contradiction caused by X marks is a review request, never a claimed cat location.
    const covered = groups.find((g) => g.cells.length > 0 && g.cells.every((c) => board.marks.includes(c)));
    if (covered) return { kind: "unmark", cells: covered.scope.filter((c) => board.marks.includes(c)), focus: covered.scope,
      explanation: sentence(`${covered.name} still needs a cat, but its possible squares have all been crossed out. Clear the highlighted X marks and reconsider this whole ${covered.type === "color" ? "color" : covered.type}.`) };
    let changed = false;
    const attempt = (excluded: number[], focus: number[], explanation: string): CoachingHint | undefined => {
      if (!excluded.length) return;
      const cells = unseen(excluded);
      if (cells.length) return { kind: "mark", cells, focus: unique([...focus, ...excluded]), explanation };
      candidates = candidates.filter((c) => !excluded.includes(c));
      changed = true;
    };
    // Locked colors / rows / columns, including two colors sharing exactly two lines.
    for (const type of ["color", "row", "column"] as const) {
      const units = groups.filter((g) => g.type === type && g.cells.length);
      const sets = units.map((g) => [g]);
      for (let a = 0; a < units.length; a++) for (let b = a + 1; b < units.length; b++) sets.push([units[a], units[b]]);
      for (const set of sets) for (const target of ["row", "column", "color"] as const) {
        if (target === type) continue;
        const unit = (c: number) => target === "row" ? Math.floor(c / n) : target === "column" ? c % n : puzzle.regions[c];
        const lines = unique(set.flatMap((g) => g.cells.map(unit)));
        if (lines.length !== set.length) continue;
        const source = set.flatMap((g) => g.cells);
        const excluded = candidates.filter((c) => lines.includes(unit(c)) && !source.includes(c));
        const label = target === "color" ? "color" : target;
        const destinations = target === "color"
          ? lines.map((i) => `the ${REGION_NAMES[i].toLowerCase()} region`).join(" and ")
          : `${label}${lines.length > 1 ? "s" : ""} ${lines.map((i) => i + 1).join(" and ")}`;
        const reason = sentence(`${set.map((g) => g.name).join(" and ")} ${set.length > 1 ? "need two cats" : "needs one cat"}, and ${set.length > 1 ? "their" : "its"} possible squares lie only in ${destinations}. ${set.length > 1 ? "Those two homes reserve both" : "That reserves this"} ${label}${lines.length > 1 ? "s" : ""}, so the outlined squares outside ${set.length > 1 ? "these" : "this"} ${type === "color" ? "color" : type}${set.length > 1 ? "s" : ""} can be marked X.`);
        const result = attempt(excluded, all.filter((c) => lines.includes(unit(c)) || set.some((g) => g.scope.includes(c))), reason);
        if (result) return result;
        if (changed) break;
      }
      if (changed) break;
    }
    if (changed) continue;
    // All possible homes in a unit forbid these squares, regardless of which home is chosen.
    for (const group of groups.filter((g) => g.cells.length)) {
      const excluded = candidates.filter((c) => !group.cells.includes(c) && group.cells.every((a) => incompatible(a, c, puzzle)));
      const result = attempt(excluded, group.scope,
        sentence(`${group.name} needs one cat. Every remaining possibility blocks the outlined squares through the row, column, color, or no-touch rule. Those squares can safely be marked X, whichever home you choose.`));
      if (result) return result;
      if (changed) break;
    }
    if (changed) continue;
    const group = groups.find((g) => g.cells.length);
    return group ? { kind: "observe", cells: [], focus: group.scope,
      explanation: `The useful exclusions are already marked. Compare the remaining unmarked squares in ${group.name.toLowerCase()}: it needs exactly one cat. Try the row, column, and corner rules before choosing a home. “Find a cat” is available if you want a placement.` } : null;
  }
  return null;
}
