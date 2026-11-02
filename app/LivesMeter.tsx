import { Heart } from "lucide-react";
import { MAX_LIVES, lifeCountdown, type LifeStatus } from "../lib/lives";

export default function LivesMeter({ status, onOpen }: { status: LifeStatus; onOpen?: () => void }) {
  const Label = onOpen ? "button" : "div";
  return (
    <div className="lives-bar">
      <Label role={onOpen ? undefined : "group"} className="lives-meter" onClick={onOpen} aria-label={"Lives: " + status.count + " of " + MAX_LIVES + (onOpen ? ". View refill timer." : ".")}>
        <span className="life-hearts" aria-hidden="true">
          {Array.from({ length: MAX_LIVES }, (_, i) => <Heart key={i} size={18} className={i < status.count ? "life-full" : "life-empty"} />)}
        </span>
        <strong>{status.count} / {MAX_LIVES}</strong>
      </Label>
      {status.count < MAX_LIVES ? (
        <div className="life-refill-copy">
          <span>Next life <b className="life-next-timer" role="timer" aria-live="off">{lifeCountdown(status.nextIn)}</b></span>
          <small>Full in {lifeCountdown(status.fullIn)}</small>
        </div>
      ) : <span className="life-ready">Three little chances</span>}
    </div>
  );
}
