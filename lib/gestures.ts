import type { Board } from "./puzzle.ts";
export type Tap = { cell: number; at: number; before: Board };
export const DOUBLE_TAP_MS = 330;
export function markCell(board: Board, cell: number): Board {
  return {
    cats: board.cats.filter((c) => c !== cell),
    marks: board.cats.includes(cell)
      ? board.marks.filter((c) => c !== cell)
      : board.marks.includes(cell)
        ? board.marks.filter((c) => c !== cell)
        : [...board.marks, cell],
  };
}
export function catCell(board: Board, cell: number): Board {
  return {
    cats: board.cats.includes(cell)
      ? board.cats.filter((c) => c !== cell)
      : [...board.cats, cell],
    marks: board.marks.filter((c) => c !== cell),
  };
}
/** The first tap saves immediately; the second promotes the original board to a cat in one undo step. */
export function tapCell(
  board: Board,
  cell: number,
  previous: Tap | null,
  at: number,
  pointer = true,
) {
  const double =
    pointer &&
    previous?.cell === cell &&
    at >= previous.at &&
    at - previous.at <= DOUBLE_TAP_MS;
  return double
    ? { board: catCell(previous.before, cell), pending: null, double: true }
    : {
        board: markCell(board, cell),
        pending: pointer ? { cell, at, before: board } : null,
        double: false,
      };
}
