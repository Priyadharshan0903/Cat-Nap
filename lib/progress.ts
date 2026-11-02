import type { Board } from "./puzzle.ts";
import {
  emptyLedger,
  mergeLedgers,
  type RewardLedger,
  type AttemptAssists,
} from "./rewards.ts";

export type GameSave = Board & {
  id: string;
  levelId: string;
  device: string;
  revision: number;
  updatedAt: number;
  elapsed: number;
  assists?: AttemptAssists;
};
export type Completion = {
  levelId: string;
  completedAt: number;
  bestTime: number;
  stars?: 1 | 2 | 3;
};
export type Settings = {
  theme?: "garden" | "ocean" | "night" | "system";
  dragMark?: boolean;
  cat: string;
  autoMark: boolean;
  reducedMotion: boolean;
  patterns: boolean;
  lastLevel: string;
  updatedAt: number;
};
export type Progress = {
  version: 1;
  games: Record<string, GameSave>;
  completed: Record<string, Completion>;
  settings: Settings;
  rewards?: RewardLedger;
};
export const CAT_IDS = ["mochi", "ginger", "luna", "olive", "peaches", "cloud"];
export function emptyProgress(): Progress {
  return {
    version: 1,
    games: {},
    completed: {},
    rewards: emptyLedger(),
    settings: {
      cat: "mochi",
      theme: "garden",
      dragMark: true,
      autoMark: false,
      reducedMotion: false,
      patterns: false,
      lastLevel: "level-001",
      updatedAt: 0,
    },
  };
}
export function mergeProgress(a: Progress, b: Progress): Progress {
  const games = { ...a.games },
    completed = { ...a.completed };
  for (const [id, game] of Object.entries(b.games)) {
    const old = games[id];
    if (
      !old ||
      game.revision > old.revision ||
      (game.revision === old.revision && game.updatedAt > old.updatedAt)
    )
      games[id] = game;
  }
  for (const [id, win] of Object.entries(b.completed)) {
    const old = completed[id];
    completed[id] = old
      ? {
          levelId: id,
          completedAt: Math.min(old.completedAt, win.completedAt),
          bestTime: Math.min(old.bestTime, win.bestTime),
          ...(old.stars || win.stars
            ? { stars: Math.max(old.stars ?? 1, win.stars ?? 1) as 1 | 2 | 3 }
            : {}),
        }
      : win;
  }
  return {
    version: 1,
    games,
    completed,
    rewards: mergeLedgers(a.rewards, b.rewards),
    settings:
      b.settings.updatedAt > a.settings.updatedAt ? b.settings : a.settings,
  };
}

/** Validate every imported or persisted payload before it can replace a local save. */
export function validProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object") return false;
  const p = value as Progress;
  const object = (v: unknown) =>
    !!v && typeof v === "object" && !Array.isArray(v);
  const finite = (n: unknown) =>
    typeof n === "number" &&
    Number.isFinite(n) &&
    n >= 0 &&
    n <= Number.MAX_SAFE_INTEGER;
  const id = (s: unknown) =>
    typeof s === "string" &&
    /^[a-zA-Z0-9:_-]{1,140}$/.test(s) &&
    !["__proto__", "constructor", "prototype"].includes(s);
  const cells = (v: unknown) =>
    Array.isArray(v) &&
    v.length <= 100 &&
    new Set(v).size === v.length &&
    v.every((n) => Number.isInteger(n) && n >= 0 && n < 100);
  const counter = (v: unknown) =>
    typeof v === "number" &&
    Number.isSafeInteger(v) &&
    v >= 0 &&
    v <= 1_000_000;
  const tokens = (v: unknown) =>
    object(v) &&
    counter((v as { hints: unknown }).hints) &&
    counter((v as { cats: unknown }).cats);
  if (
    p.rewards !== undefined &&
    (!object(p.rewards) ||
      !object(p.rewards.spent) ||
      !object(p.rewards.refilled) ||
      [p.rewards.spent, p.rewards.refilled].some(
        (entries) =>
          Object.keys(entries).length > 1000 ||
          !Object.entries(entries).every(
            ([key, value]) => id(key) && tokens(value),
          ),
      ))
  )
    return false;
  if (
    p.version !== 1 ||
    !object(p.games) ||
    !object(p.completed) ||
    !object(p.settings) ||
    Object.keys(p.games).length > 2000 ||
    Object.keys(p.completed).length > 1000
  )
    return false;
  if (
    !CAT_IDS.includes(p.settings.cat) ||
    !id(p.settings.lastLevel) ||
    !finite(p.settings.updatedAt) ||
    typeof p.settings.autoMark !== "boolean" ||
    typeof p.settings.reducedMotion !== "boolean" ||
    typeof p.settings.patterns !== "boolean"
    || (p.settings.theme !== undefined && !["garden", "ocean", "night", "system"].includes(p.settings.theme))
    || (p.settings.dragMark !== undefined && typeof p.settings.dragMark !== "boolean")
  )
    return false;
  if (
    !Object.entries(p.games).every(
      ([key, g]) =>
        id(key) &&
        object(g) &&
        g.id === key &&
        id(g.levelId) &&
        id(g.device) &&
        Number.isInteger(g.revision) &&
        finite(g.revision) &&
        finite(g.updatedAt) &&
        finite(g.elapsed) &&
        (g.assists === undefined ||
          (tokens(g.assists) &&
            Array.isArray(g.assists.hintKeys) &&
            g.assists.hintKeys.length <= 500 &&
            g.assists.hintKeys.every(
              (k) => typeof k === "string" && k.length <= 800,
            ))) &&
        cells(g.cats) &&
        cells(g.marks) &&
        !g.cats.some((c) => g.marks.includes(c)),
    )
  )
    return false;
  return Object.entries(p.completed).every(
    ([key, c]) =>
      id(key) &&
      object(c) &&
      c.levelId === key &&
      finite(c.completedAt) &&
      finite(c.bestTime) &&
      (c.stars === undefined || [1, 2, 3].includes(c.stars)),
  );
}

export function saveForLevel(
  progress: Progress,
  levelId: string,
  device: string,
): GameSave | undefined {
  return Object.values(progress.games)
    .filter((g) => g.levelId === levelId)
    .sort(
      (a, b) =>
        b.updatedAt - a.updatedAt ||
        Number(b.device === device) - Number(a.device === device),
    )[0];
}
