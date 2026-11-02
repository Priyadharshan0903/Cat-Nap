import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowRight, Lightbulb, X } from "lucide-react";
import type { CoachingHint } from "../lib/coaching";
import { REGION_COLORS, REGION_NAMES } from "../lib/palette";

const colorWords = new RegExp(`\\b(${REGION_NAMES.join("|")})\\b`, "gi");

export default function HintPanel({
  hint,
  quiet,
  onApply,
  onDismiss,
}: {
  hint: CoachingHint;
  quiet: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = panel.current;
    // Scroll the natural position, not the sticky panel's current position.
    // A hint requested below the board brings its reason and the board back into view.
    anchor.current?.scrollIntoView({
      block: "start",
      behavior: quiet || matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    element?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss.current();
    };
    addEventListener("keydown", escape);
    return () => {
      removeEventListener("keydown", escape);
      if (previous?.isConnected && (element?.contains(document.activeElement) || document.activeElement === document.body))
        previous.focus({ preventScroll: true });
    };
  }, [hint]);

  const action = hint.kind === "remove"
    ? "Remove this cat"
    : hint.kind === "unmark"
      ? "Clear highlighted Xs"
      : `Mark ${hint.cells.length} ${hint.cells.length === 1 ? "square" : "squares"} X`;

  return (
    <>
      <div className="hint-anchor" ref={anchor} />
      <motion.div
        ref={panel}
        className="hint-card"
        role="region"
        aria-label="Hint explanation"
        aria-describedby="hint-reason"
        tabIndex={-1}
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.16 } }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
      >
        <div className="hint-title">
          <Lightbulb size={18} />
          <strong>Here’s why</strong>
          <button className="icon-button" aria-label="Dismiss hint" onClick={onDismiss}>
            <X size={18} />
          </button>
        </div>
        <p id="hint-reason">
          {hint.explanation.split(colorWords).map((part, index) => {
            const region = REGION_NAMES.findIndex((name) => name.toLowerCase() === part.toLowerCase());
            return region < 0 ? part : (
              <span className="hint-color-name" key={index}>
                <span className="hint-color-dot" aria-hidden="true" style={{ backgroundColor: REGION_COLORS[region] }} />
                {part}
              </span>
            );
          })}
        </p>
        {hint.kind !== "observe" && (
          <button className="text-button hint-apply" onClick={onApply}>
            Apply · {action}
            <ArrowRight size={16} />
          </button>
        )}
      </motion.div>
    </>
  );
}
