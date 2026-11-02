import type { Progress } from "./progress.ts";
import { CHAPTERS, LEVELS, LEGACY_CHAPTERS, chapterLevels } from "./catalog.ts";
export type AssistKind = "hints" | "cats";
export type Tokens = { hints: number; cats: number };
export type RewardLedger = {
  spent: Record<string, Tokens>;
  refilled: Record<string, Tokens>;
};
export type AttemptAssists = Tokens & { hintKeys: string[] };
export const STARTER: Tokens = { hints: 10, cats: 5 };
export const CHAPTER_GIFT: Tokens = { hints: 3, cats: 1 };
export const emptyLedger = (): RewardLedger => ({ spent: {}, refilled: {} });
export const emptyAssists = (): AttemptAssists => ({
  hints: 0,
  cats: 0,
  hintKeys: [],
});
export function chapterFinished(progress: Progress, index: number) {
  return chapterLevels(index).every((puzzle) => !!progress.completed[puzzle.id]);
}
export function chapterGiftEarned(progress: Progress, index: number) {
  if (chapterFinished(progress, index)) return true;
  const previous = LEGACY_CHAPTERS[index];
  return LEVELS.filter((p) => p.number >= previous.start && p.number <= previous.end)
    .every((p) => !!progress.completed[p.id]);
}
export function earnedRewards(progress: Progress): Tokens {
  const count = Object.keys(progress.completed).length;
  const chapters = CHAPTERS.filter((_, i) =>
    chapterGiftEarned(progress, i),
  ).length;
  return {
    hints: count + chapters * CHAPTER_GIFT.hints,
    cats: Math.floor(count / 5) * 2 + chapters * CHAPTER_GIFT.cats,
  };
}
const total = (entries: Record<string, Tokens>, kind: AssistKind) =>
  Object.values(entries).reduce((n, entry) => n + entry[kind], 0);
export function rawBalance(progress: Progress): Tokens {
  const earned = earnedRewards(progress),
    ledger = progress.rewards ?? emptyLedger();
  return {
    hints:
      STARTER.hints +
      earned.hints +
      total(ledger.refilled, "hints") -
      total(ledger.spent, "hints"),
    cats:
      STARTER.cats +
      earned.cats +
      total(ledger.refilled, "cats") -
      total(ledger.spent, "cats"),
  };
}
export function rewardBalance(progress: Progress): Tokens {
  const raw = rawBalance(progress);
  return { hints: Math.max(0, raw.hints), cats: Math.max(0, raw.cats) };
}
export function spendAssist(
  progress: Progress,
  device: string,
  kind: AssistKind,
): Progress | null {
  if (rewardBalance(progress)[kind] < 1) return null;
  const ledger = progress.rewards ?? emptyLedger(),
    old = ledger.spent[device] ?? { hints: 0, cats: 0 };
  return {
    ...progress,
    rewards: {
      ...ledger,
      spent: { ...ledger.spent, [device]: { ...old, [kind]: old[kind] + 1 } },
    },
  };
}
/** Refills remain free. Reconcile any concurrent offline spending before adding the advertised amount. */
export function refillAssist(
  progress: Progress,
  device: string,
  kind: AssistKind,
): Progress {
  if (rewardBalance(progress)[kind] > 0) return progress;
  const amount = kind === "hints" ? 3 : 1;
  const ledger = progress.rewards ?? emptyLedger(),
    old = ledger.refilled[device] ?? { hints: 0, cats: 0 };
  const credit = amount - rawBalance(progress)[kind];
  return {
    ...progress,
    rewards: {
      ...ledger,
      refilled: {
        ...ledger.refilled,
        [device]: { ...old, [kind]: old[kind] + credit },
      },
    },
  };
}
export function mergeLedgers(
  a = emptyLedger(),
  b = emptyLedger(),
): RewardLedger {
  const merge = (x: Record<string, Tokens>, y: Record<string, Tokens>) => {
    const result = { ...x };
    for (const [key, value] of Object.entries(y))
      result[key] = {
        hints: Math.max(x[key]?.hints ?? 0, value.hints),
        cats: Math.max(x[key]?.cats ?? 0, value.cats),
      };
    return result;
  };
  return {
    spent: merge(a.spent, b.spent),
    refilled: merge(a.refilled, b.refilled),
  };
}
export function starsFor(assists: Tokens): 1 | 2 | 3 {
  return assists.cats > 0 ? 1 : assists.hints > 0 ? 2 : 3;
}
