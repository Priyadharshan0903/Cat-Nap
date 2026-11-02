import type { Board } from "./puzzle.ts";
export type Tap = { cell: number; at: number; before: Board };
export const DOUBLE_TAP_MS = 330;
/** Paint, never toggle: crossing a square twice cannot erase an X or a cat. */
export function markStroke(board: Board, cells: Iterable<number>): Board {
  return { cats: board.cats, marks: [...new Set([...board.marks, ...[...cells].filter((c) => !board.cats.includes(c))])] };
}
/** Pick a stroke's intent from its starting tile; revisiting tiles cannot toggle them again. */
export function paintStroke(board: Board, cells: Iterable<number>, erase: boolean): Board {
  if (!erase) return markStroke(board, cells);
  const crossed = new Set(cells);
  return { cats: board.cats, marks: board.marks.filter((cell) => !crossed.has(cell)) };
}
/** Fill gaps between sampled pointer positions, including quick diagonal strokes. */
export function strokeCells(from: number, to: number, size: number): number[] {
  let x = from % size, y = Math.floor(from / size);
  const endX = to % size, endY = Math.floor(to / size);
  const dx = Math.abs(endX - x), dy = Math.abs(endY - y);
  const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
  let error = dx - dy;
  const cells: number[] = [];
  while (true) {
    cells.push(y * size + x);
    if (x === endX && y === endY) return cells;
    const twice = error * 2;
    if (twice > -dy) { error -= dy; x += sx; }
    if (twice < dx) { error += dx; y += sy; }
  }
}
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
