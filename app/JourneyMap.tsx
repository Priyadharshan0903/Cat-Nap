import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flower2,
  Gift,
  Lightbulb,
  PawPrint,
  Star,
  Sun,
} from "lucide-react";
import { CHAPTERS, LEVELS, JOURNEY, chapterFor, chapterLevels, stageNumber, profileFor } from "../lib/catalog";
import { CHAPTER_GIFT, chapterFinished, chapterGiftEarned, rewardBalance } from "../lib/rewards";
import type { Progress } from "../lib/progress";
import type { Puzzle } from "../lib/puzzle";
import { Cat } from "./Cat";
import { REGION_COLORS } from "../lib/palette";

export default function JourneyMap({
  progress,
  currentId,
  cat,
  onChoose,
}: {
  progress: Progress;
  currentId: string;
  cat: string;
  onChoose: (puzzle: Puzzle) => void;
}) {
  const current =
    LEVELS.find((l) => l.id === currentId) ??
    JOURNEY.find((l) => !progress.completed[l.id]) ??
    LEVELS[0];
  const activeId = current.id;
  const [chapterIndex, setChapter] = useState(() => CHAPTERS.indexOf(chapterFor(current.id)));
  const chapter = CHAPTERS[chapterIndex], canvas = useRef<HTMLDivElement>(null);
  const levels = chapterLevels(chapterIndex);
  const minimumSize = Math.min(...levels.map((p) => p.size)), maximumSize = Math.max(...levels.map((p) => p.size));
  const giftEarned = chapterGiftEarned(progress, chapterIndex);
  const done = LEVELS.filter((l) => progress.completed[l.id]).length;
  const stars = LEVELS.reduce(
    (sum, l) =>
      sum +
      (progress.completed[l.id] ? (progress.completed[l.id].stars ?? 1) : 0),
    0,
  );
  const total = Object.keys(progress.completed).length,
    balance = rewardBalance(progress);
  const [showOverview, setOverview] = useState(false);
  const xPattern = [190, 325, 315, 205, 90, 110, 255, 342, 266, 135, 100, 220];
  const nodes = levels.map((level, i) => ({
    level,
    x: xPattern[i % xPattern.length],
    y: 90 + i * 140,
  }));
  const height = nodes.length * 140 + 170;
  const path = nodes
    .map((node, i) =>
      i === 0
        ? `M${node.x} ${node.y}`
        : `C${nodes[i - 1].x} ${nodes[i - 1].y + 65},${node.x} ${node.y - 65},${node.x} ${node.y}`,
    )
    .join(" ");
  const currentNode = nodes.find((n) => n.level.id === activeId);
  useEffect(() => {
    const node = canvas.current?.querySelector<HTMLElement>(
      '[aria-current="step"]',
    );
    const timer = setTimeout(() => {
      if (nodes.findIndex((n) => n.level.id === activeId) > 2)
        node?.scrollIntoView({ block: "center", behavior: "auto" });
    }, 40);
    return () => clearTimeout(timer);
  }, [chapterIndex]);
  return (
    <div className="journey-map">
      <div className="map-intro">
        <Cat kind={cat} happy />
        <div>
          <p>A home for every little explorer.</p>
          <div className="map-totals">
            <span>
              <Star size={16} />
              {stars} / {LEVELS.length * 3} stars
            </span>
            <span>
              <Check size={16} />
              {done} / {LEVELS.length} puzzles
            </span>
          </div>
        </div>
      </div>
      <div className="map-gift-progress">
        <Gift size={23} />
        <div>
          <strong>A little gift every 5 new puzzles</strong>
          <span>{5 - (total % 5)} more to earn 2 Find a cat tokens</span>
        </div>
        <span
          className="gift-progress-dots"
          aria-label={`${total % 5} of 5 puzzles toward the next gift`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} className={i < total % 5 ? "filled" : ""} />
          ))}
        </span>
      </div>
      <div className="map-chapter-nav">
        <button
          className="icon-button"
          aria-label="Previous chapter"
          disabled={chapterIndex === 0}
          onClick={() => setChapter(chapterIndex - 1)}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p>
            Chapter {chapterIndex + 1} · {minimumSize} × {minimumSize}{maximumSize !== minimumSize && <> – {maximumSize} × {maximumSize}</>}
          </p>
          <h3>{chapter.name}</h3>
          <p className="journey-description">{chapter.description}</p>
        </div>
        <button
          className="icon-button"
          aria-label="Next chapter"
          disabled={chapterIndex === CHAPTERS.length - 1}
          onClick={() => setChapter(chapterIndex + 1)}
        >
          <ArrowRight size={18} />
        </button>
      </div>
      <div
        className="map-canvas"
        ref={canvas}
        style={{ height }}
        aria-label={`Chapter ${chapterIndex + 1} level map`}
      >
        <svg
          className="map-path"
          viewBox={`0 0 440 ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke="#b5bea9"
            strokeWidth="4"
            strokeDasharray="1 13"
            strokeLinecap="round"
          />
          {nodes
            .filter((_, i) => i % 4 === 2)
            .map((n, i) => (
              <g
                key={i}
                transform={`translate(${n.x < 220 ? 346 : 80} ${n.y + 12})`}
                opacity=".7"
              >
                <path
                  d="M0 32Q-9 6 2-16M0 18Q-23 12-20-2Q-1-1 0 18M1 3Q22-1 21-14Q3-14 1 3"
                  fill="#c4d4b7"
                  stroke="#8ca37d"
                  strokeWidth="2"
                />
                <path d="M-16 31H16L11 52H-11Z" fill="#d7c7a9" />
              </g>
            ))}
        </svg>
        {nodes.map(({ level, x, y }, index) => {
          const completion = progress.completed[level.id],
            earned = completion ? (completion.stars ?? 1) : 0,
            current = level.id === activeId;
          return (
            <div
              className={`map-stop ${current ? "is-current" : ""} ${completion ? "is-complete" : ""}`}
              key={level.id}
              style={{ left: `${(x / 440) * 100}%`, top: y }}
            >
              {current && <Cat kind={cat} className="map-traveler" />}
              <button
                style={
                  {
                    "--node-color":
                      REGION_COLORS[
                        (index + chapterIndex) % REGION_COLORS.length
                      ],
                  } as CSSProperties
                }
                data-puzzle-id={level.id}
                title={level.size + " × " + level.size + " · " + profileFor(level).difficulty + " · " + profileFor(level).focus}
                className="map-node"
                aria-label={`Play level ${stageNumber(level.id)}${completion ? `, ${earned} of 3 stars` : ""}`}
                aria-current={current ? "step" : undefined}
                onClick={() => onChoose(level)}
              >
                {stageNumber(level.id)}
              </button>
              <span className="map-puzzle-info">{level.size} × {level.size} · {profileFor(level).difficulty}</span>
              <div
                className="map-stars"
                role="img"
                aria-label={`${earned} of 3 stars`}
              >
                {[1, 2, 3].map((n) => (
                  <Star
                    key={n}
                    size={17}
                    className={earned >= n ? "earned" : ""}
                  />
                ))}
              </div>
              {current && (
                <span className="map-you-are-here">Your little spot</span>
              )}
            </div>
          );
        })}
        {!currentNode && <Sun size={24} className="map-sun" />}
        <div
          className={`map-chapter-gift ${giftEarned ? "earned" : ""}`}
          style={{ top: height - 106 }}
        >
          <Gift size={30} />
          <div>
            <strong>
              {giftEarned
                ? chapterFinished(progress, chapterIndex) ? "Chapter gift earned!" : "This gift is already yours"
                : "A gift at the end of the chapter"}
            </strong>
            <span>
              +{CHAPTER_GIFT.hints} hints · +{CHAPTER_GIFT.cats} Find a cat
            </span>
          </div>
          {giftEarned && <Check size={18} />}
        </div>
      </div>
      <div className="map-legend">
        <Star size={15} />
        <p>
          1 star for finishing · 2 without Find a cat · 3 without either assist.
          Replay to improve your stars.
        </p>
      </div>
      <div className="map-chapter-buttons">
        {CHAPTERS.map((group, i) => (
          <button
            className={i === chapterIndex ? "selected" : ""}
            key={group.name}
            onClick={() => setChapter(i)}
            aria-label={`Open chapter ${i + 1}: ${group.name}`}
            aria-pressed={i === chapterIndex}
          >
            {chapterFinished(progress, i) ? (
              <Check size={14} />
            ) : (
              <Flower2 size={14} />
            )}
            {i + 1}
          </button>
        ))}
      </div>
      <button
        className="text-button map-overview-toggle"
        onClick={() => setOverview(!showOverview)}
        aria-expanded={showOverview}
      >
        {showOverview ? "Close quick level list" : "Quick level list"}
      </button>
      {showOverview && (
        <div className="level-picker map-quick-list">
          {JOURNEY.map((level) => (
            <button
              key={level.id}
              onClick={() => onChoose(level)}
              aria-label={`Jump to level ${stageNumber(level.id)}`}
            >
              {stageNumber(level.id)}
            </button>
          ))}
        </div>
      )}
      <p className="map-wallet">
        <Lightbulb size={14} />
        {balance.hints} hints <PawPrint size={14} />
        {balance.cats} cat assists · Gifts save automatically.
      </p>
    </div>
  );
}
