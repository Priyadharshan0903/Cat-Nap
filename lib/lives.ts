export const MAX_LIVES = 3;
export const LIFE_REFILL_MS = 30 * 60 * 1000;
export type LifeLedger = { losses: Record<string, number> };
export type LifeStatus = { count: number; nextIn: number; fullIn: number };
export const emptyLives = (): LifeLedger => ({ losses: {} });

/** Loss receipts merge without refunding lives on repeat or older imports. */
export function mergeLifeLedgers(a = emptyLives(), b = emptyLives()): LifeLedger {
  const losses = { ...a.losses };
  for (const [id, at] of Object.entries(b.losses))
    losses[id] = losses[id] === undefined ? at : Math.min(losses[id], at);
  return { losses };
}
/** Restore one slot at a time, stopping at three. No foreground timer writes are needed. */
export function recoverySchedule(ledger?: LifeLedger): number[] {
  const events = Object.entries(ledger?.losses ?? {})
    .sort(([a, at], [b, bt]) => at - bt || a.localeCompare(b));
  let queue: number[] = [];
  for (const [, at] of events) {
    queue = queue.filter((readyAt) => readyAt > at);
    // Parallel offline devices may report extra losses. Merge deterministically, at most three slots.
    if (queue.length < MAX_LIVES)
      queue.push(Math.max(at, queue[queue.length - 1] ?? at) + LIFE_REFILL_MS);
  }
  return queue;
}
export function statusFromSchedule(queue: number[], now: number): LifeStatus {
  const pending = queue.filter((readyAt) => readyAt > now);
  return { count: MAX_LIVES - pending.length,
    nextIn: pending.length ? pending[0] - now : 0,
    fullIn: pending.length ? pending[pending.length - 1] - now : 0 };
}
export function lifeStatus(ledger: LifeLedger | undefined, now: number) {
  return statusFromSchedule(recoverySchedule(ledger), now);
}
export function recordLifeLoss(ledger: LifeLedger | undefined, at: number, id: string): LifeLedger | null {
  if (ledger?.losses[id] !== undefined) return ledger;
  if (lifeStatus(ledger, at).count === 0) return null;
  return { losses: { ...ledger?.losses, [id]: at } };
}
export function lifeCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60), tail = String(seconds % 60).padStart(2, "0");
  return minutes < 60 ? String(minutes).padStart(2, "0") + ":" + tail
    : Math.floor(minutes / 60) + ":" + String(minutes % 60).padStart(2, "0") + ":" + tail;
}
