import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  Flower2,
  Grid2X2,
  Map,
  Gift,
  Star,
  Lightbulb,
  LockKeyhole,
  Pause,
  PawPrint,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Sun,
  Timer,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import {
  autoMarks,
  conflicts,
  isSolved,
  type Board,
  type Puzzle,
} from "../lib/puzzle";
import { CHAPTERS, dayKey, getPuzzle, LEVELS } from "../lib/catalog";
import {
  mergeProgress,
  saveForLevel,
  type GameSave,
  type Settings,
} from "../lib/progress";
import { useProgress } from "../lib/use-progress";
import { Cat, CATS, WindowScene } from "./Cat";
import Modal from "./Modal";
import JourneyMap from "./JourneyMap";
import HintPanel from "./HintPanel";
import { REGION_COLORS } from "../lib/palette";
import { tapCell, markCell, catCell, markStroke, strokeCells, type Tap } from "../lib/gestures";
import {
  emptyAssists,
  earnedRewards,
  rewardBalance,
  spendAssist,
  refillAssist,
  starsFor,
  type AttemptAssists,
  type AssistKind,
  type Tokens,
} from "../lib/rewards";

import { coachingHint, type CoachingHint } from "../lib/coaching";
import { downloadBackup, parseBackup, readBackupFile } from "../lib/backup";

const COLORS = REGION_COLORS;
type Stroke = { pointer: number; first: number; last: number; cells: Set<number>; before: Board; active: boolean; preview: Board };
const THEMES = [
  { id: "garden", name: "Garden", detail: "Soft greens", swatches: ["#f8f9f4", "#45694e", "#bdd8cf"] },
  { id: "ocean", name: "Seaside", detail: "Cool blues", swatches: ["#f2f7fa", "#346278", "#bfd8e5"] },
  { id: "night", name: "Night", detail: "A quieter glow", swatches: ["#191b1a", "#afc8ac", "#424944"] },
  { id: "system", name: "Device", detail: "Follow light / dark", swatches: ["#f8f9f4", "#191b1a", "#afc8ac"] },
] as const;
const BLANK: Board = { cats: [], marks: [] };
const time = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, "0")}`;
type Dialog =
  | "levels"
  | "cats"
  | "settings"
  | "help"
  | "restart"
  | "win"
  | "rewards"
  | "refill"
  | null;

export default function Game() {
  const { progress, commit, progressRef, ready, device, canSave } =
    useProgress();
  const [levelId, setLevelId] = useState("level-001");
  const puzzle = useMemo(() => getPuzzle(levelId) ?? LEVELS[0], [levelId]);
  const [board, setBoard] = useState<Board>(BLANK),
    boardRef = useRef<Board>(BLANK);
  const [elapsed, setElapsed] = useState(0),
    elapsedRef = useRef(0);
  const tapRef = useRef<Tap | null>(null);
  const strokeRef = useRef<Stroke | null>(null);
  const suppressClick = useRef(false);
  const activeSave = useRef<{ levelId: string; id: string } | null>(null);
  const [backupStatus, setBackupStatus] = useState("");
  const [importing, setImporting] = useState(false);
  const importBusy = useRef(false);
  const assistsRef = useRef<AttemptAssists>(emptyAssists());
  const [refillKind, setRefillKind] = useState<AssistKind>("hints");
  const [winGift, setWinGift] = useState<Tokens>({ hints: 0, cats: 0 });
  const balance = rewardBalance(progress);
  const [dialog, setDialog] = useState<Dialog>(null),
    [hint, setHint] = useState<CoachingHint | null>(null);
  const [paused, setPaused] = useState(false),
    [toast, setToast] = useState("");
  const [offlineReady, setOfflineReady] = useState(false);
  const [history, setHistory] = useState<Board[]>([]);
  const [focusedCell, setFocusedCell] = useState(0);
  const [appliedHintCells, setAppliedHintCells] = useState<number[]>([]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]),
    imported = useRef<HTMLInputElement>(null);
  const initialized = useRef(false),
    playRef = useRef<HTMLDivElement>(null);
  const [today, setToday] = useState(() => dayKey());
  const daily = levelId.startsWith("daily-");
  const chapter =
    CHAPTERS.find((c) => puzzle.number >= c.start && puzzle.number <= c.end) ??
    CHAPTERS[0];
  const completedLevels = LEVELS.filter(
    (l) => !!progress.completed[l.id],
  ).length;
  const totalCompleted = Object.keys(progress.completed).length;
  const chapterDone = LEVELS.filter(
    (l) =>
      l.number >= chapter.start &&
      l.number <= chapter.end &&
      progress.completed[l.id],
  ).length;
  const cat = CATS.find((c) => c.id === progress.settings.cat) ?? CATS[0];
  const solved = isSolved(puzzle, board.cats);
  const badCells = conflicts(puzzle, board.cats);
  const automatic = progress.settings.autoMark
    ? autoMarks(puzzle, board.cats)
    : [];
  const settledRegions = new Set(board.cats.filter((c) => puzzle.solution.includes(c) && !badCells.includes(c)).map((c) => puzzle.regions[c]));
  const nextLevel =
    LEVELS.find((l) => l.number > puzzle.number && !progress.completed[l.id]) ??
    LEVELS.find((l) => !progress.completed[l.id]);

  const updateSettings = (value: Partial<Settings>) =>
    commit((old) => ({
      ...old,
      settings: { ...old.settings, ...value, updatedAt: Math.max(Date.now(), old.settings.updatedAt + 1) },
    }));
  const writeBoard = useCallback(
    (
      value: Board,
      target: Puzzle = puzzle,
      seconds = elapsedRef.current,
      options: { complete?: boolean; spend?: AssistKind } = {},
    ) => {
      if (!device) return;
      commit((original) => {
        const old = options.spend
          ? (spendAssist(original, device, options.spend) ?? original)
          : original;
        const id = activeSave.current?.levelId === target.id ? activeSave.current.id : `${target.id}:${device}`,
          previous = old.games[id];
        const game: GameSave = {
          ...value,
          id,
          levelId: target.id,
          device,
          revision: (previous?.revision ?? 0) + 1,
          updatedAt: Math.max(Date.now(), ...Object.values(old.games).filter((g) => g.levelId === target.id).map((g) => g.updatedAt + 1)),
          elapsed: seconds,
          assists: {
            ...assistsRef.current,
            hintKeys: [...assistsRef.current.hintKeys],
          },
        };
        const won = options.complete && isSolved(target, value.cats),
          completion = old.completed[target.id];
        return {
          ...old,
          games: { ...old.games, [id]: game },
          completed: won
            ? {
                ...old.completed,
                [target.id]: {
                  levelId: target.id,
                  completedAt: completion?.completedAt ?? Date.now(),
                  stars: Math.max(
                    completion?.stars ?? 1,
                    starsFor(assistsRef.current),
                  ) as 1 | 2 | 3,
                  bestTime: completion
                    ? Math.min(completion.bestTime, seconds)
                    : seconds,
                },
              }
            : old.completed,
        };
      });
    },
    [commit, device, puzzle],
  );

  function openPuzzle(target: Puzzle, scroll = true, chosenSave?: GameSave) {
    const saved =
      chosenSave ?? saveForLevel(progressRef.current, target.id, device);
    const safe =
      saved &&
      saved.cats.every((c) => c < target.size ** 2) &&
      saved.marks.every((c) => c < target.size ** 2);
    const value = safe
      ? { cats: saved.cats, marks: saved.marks }
      : { cats: [], marks: [] };
    tapRef.current = null;
    strokeRef.current = null;
    suppressClick.current = false;
    const localId = `${target.id}:${device}`;
    const reusable = safe && Object.values(progressRef.current.games).find((game) =>
      game.levelId === target.id && game.device === device && game.elapsed === saved.elapsed &&
      game.cats.join(",") === saved.cats.join(",") && game.marks.join(",") === saved.marks.join(",") &&
      JSON.stringify(game.assists ?? emptyAssists()) === JSON.stringify(saved.assists ?? emptyAssists()));
    activeSave.current = { levelId: target.id, id: safe && saved.device === device ? saved.id :
      reusable ? reusable.id : safe && progressRef.current.games[localId] ? `${localId}:${crypto.randomUUID()}` : localId };
    assistsRef.current =
      safe && saved.assists
        ? { ...saved.assists, hintKeys: [...saved.assists.hintKeys] }
        : emptyAssists();
    boardRef.current = value;
    setBoard(value);
    elapsedRef.current = safe ? saved.elapsed : 0;
    setElapsed(elapsedRef.current);
    setLevelId(target.id);
    setHistory([]);
    setHint(null);
    setPaused(false);
    setDialog(null);
    setFocusedCell(0);
    updateSettings({ lastLevel: target.id });
    if (chosenSave) writeBoard(value, target, elapsedRef.current);
    if (scroll && innerWidth < 1000)
      setTimeout(
        () =>
          playRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        0,
      );
  }
  useEffect(() => {
    if (ready && !initialized.current) {
      initialized.current = true;
      openPuzzle(getPuzzle(progress.settings.lastLevel) ?? LEVELS[0], false);
    }
  }, [ready]);
  useEffect(() => {
    if (dialog || paused) {
      tapRef.current = null;
      if (strokeRef.current) { strokeRef.current = null; setBoard(boardRef.current); }
    }
  }, [dialog, paused]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const selected = progress.settings.theme ?? "garden";
      const theme = selected === "system" ? media.matches ? "night" : "garden" : selected;
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "night" ? "#191b1a" : theme === "ocean" ? "#f2f7fa" : "#f8f9f4");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [progress.settings.theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const clock = setInterval(() => {
      const day = dayKey();
      setToday(day);
      if (
        !ready ||
        paused ||
        solved ||
        dialog ||
        document.visibilityState !== "visible"
      )
        return;
      elapsedRef.current++;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current % 15 === 0) writeBoard(boardRef.current);
    }, 1000);
    const save = () => {
      if (ready && initialized.current) writeBoard(boardRef.current);
    };
    addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", save);
    return () => {
      clearInterval(clock);
      removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", save);
    };
  }, [ready, paused, solved, dialog, writeBoard]);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(async () => {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: "CACHE_HOME" });
        setOfflineReady(true);
      })
      .catch(() => setOfflineReady(false));
  }, []);

  const change = (value: Board, record = true, spending?: AssistKind) => {
    if (spending && rewardBalance(progressRef.current)[spending] < 1) {
      setRefillKind(spending);
      setDialog("refill");
      return;
    }
    const previous = boardRef.current;
    const earnedBefore = earnedRewards(progressRef.current);
    if (spending)
      assistsRef.current = {
        ...assistsRef.current,
        [spending]: assistsRef.current[spending] + 1,
      };
    if (record) setHistory((old) => [...old.slice(-79), previous]);
    boardRef.current = value;
    setBoard(value);
    setHint(null);
    const won =
      isSolved(puzzle, value.cats) && !isSolved(puzzle, previous.cats);
    writeBoard(value, puzzle, elapsedRef.current, {
      complete: won,
      spend: spending,
    });
    if (won) {
      const earnedAfter = earnedRewards(progressRef.current);
      setWinGift({
        hints: earnedAfter.hints - earnedBefore.hints,
        cats: earnedAfter.cats - earnedBefore.cats,
      });
      setDialog("win");
    }
  };
  const cellAction = (cell: number, action: "cat" | "mark") => {
    if (!ready || paused || solved) return;
    tapRef.current = null;
    change(
      action === "cat"
        ? catCell(boardRef.current, cell)
        : markCell(boardRef.current, cell),
    );
  };
  const handleTap = (cell: number, pointer: boolean) => {
    if (!ready || paused || solved) return;
    const result = tapCell(
      boardRef.current,
      cell,
      tapRef.current,
      performance.now(),
      pointer,
    );
    tapRef.current = result.pending;
    change(result.board, !result.double);
  };
  function beginStroke(event: ReactPointerEvent<HTMLButtonElement>, cell: number) {
    if (event.isPrimary === false || event.button !== 0) return;
    suppressClick.current = false;
    if (!ready || paused || solved || dialog || progress.settings.dragMark === false) return;
    const before = boardRef.current;
    strokeRef.current = { pointer: event.pointerId, first: cell, last: cell, cells: new Set([cell]), before, preview: before, active: false };
  }
  function moveStroke(event: ReactPointerEvent<HTMLDivElement>) {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointer !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return;
    const cell = Math.floor(y / rect.height * puzzle.size) * puzzle.size + Math.floor(x / rect.width * puzzle.size);
    if (cell === stroke.last) return;
    if (!stroke.active) {
      stroke.active = true;
      tapRef.current = null;
      setHint(null);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    for (const c of strokeCells(stroke.last, cell, puzzle.size)) stroke.cells.add(c);
    stroke.last = cell;
    stroke.preview = markStroke(stroke.before, stroke.cells);
    setBoard(stroke.preview);
    event.preventDefault();
  }
  function finishStroke(event: ReactPointerEvent<HTMLDivElement>) {
    const stroke = strokeRef.current;
    if (!stroke || stroke.pointer !== event.pointerId) return;
    strokeRef.current = null;
    if (!stroke.active) return; // The native click retains single/double tap semantics.
    suppressClick.current = true;
    tapRef.current = null;
    if (stroke.preview.marks.length !== stroke.before.marks.length) change(stroke.preview);
    else setBoard(stroke.before);
  }
  function cancelStroke() {
    if (!strokeRef.current) return;
    strokeRef.current = null;
    tapRef.current = null;
    suppressClick.current = true;
    setBoard(boardRef.current);
  }
  useEffect(() => {
    const cancel = () => cancelStroke();
    addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => { removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", cancel); };
  }, []);
  const undo = () => {
    tapRef.current = null;
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((old) => old.slice(0, -1));
    change(previous, false);
  };
  const showHint = (freeCorrection = false) => {
    if (solved || paused || !ready) return;
    tapRef.current = null;
    const value = coachingHint(puzzle, boardRef.current, progressRef.current.settings.autoMark);
    if (!value) {
      setToast("Try “Find a cat” for a helping paw.");
      return;
    }
    const key = `coach:${puzzle.id}:${value.kind}:${value.cells.join(",")}:${[...boardRef.current.cats].sort((a, b) => a - b).join(",")}`;
    if (value.kind !== "observe" && !assistsRef.current.hintKeys.includes(key)) {
      if (!freeCorrection && rewardBalance(progressRef.current).hints < 1) {
        setRefillKind("hints");
        setDialog("refill");
        return;
      }
      assistsRef.current = {
        ...assistsRef.current,
        hints: assistsRef.current.hints + 1,
        hintKeys: [...assistsRef.current.hintKeys.slice(-499), key],
      };
      writeBoard(boardRef.current, puzzle, elapsedRef.current, {
        spend: freeCorrection ? undefined : "hints",
      });
    }
    setHint(value);
  };
  useEffect(() => {
    if (!appliedHintCells.length) return;
    const timer = setTimeout(() => setAppliedHintCells([]), 650);
    return () => clearTimeout(timer);
  }, [appliedHintCells]);
  const applyHint = () => {
    if (!hint || paused || solved || !ready) return;
    const current = boardRef.current;
    if (hint.kind === "remove")
      change({ ...current, cats: current.cats.filter((c) => !hint.cells.includes(c)) });
    else if (hint.kind === "unmark")
      change({ ...current, marks: current.marks.filter((c) => !hint.cells.includes(c)) });
    else if (hint.kind === "mark") {
      setAppliedHintCells(hint.cells);
      change(markStroke(current, hint.cells));
    }

  };
  const findCat = () => {
    if (!ready || paused || solved) return;
    const wrong = boardRef.current.cats.find(
      (c) => !puzzle.solution.includes(c),
    );
    if (wrong !== undefined) {
      showHint(true);
      return;
    }
    const cell = puzzle.solution.find(
      (c) => !boardRef.current.cats.includes(c),
    );
    if (cell === undefined) return;
    if (rewardBalance(progressRef.current).cats < 1) {
      setRefillKind("cats");
      setDialog("refill");
      return;
    }
    tapRef.current = null;
    change(
      {
        cats: [...boardRef.current.cats, cell],
        marks: boardRef.current.marks.filter((c) => c !== cell),
      },
      true,
      "cats",
    );
    setToast("A little helping paw. This cat has found its home.");
  };
  function gridKey(event: KeyboardEvent<HTMLButtonElement>, cell: number) {
    tapRef.current = null;
    const n = puzzle.size;
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -n,
      ArrowDown: n,
    };
    if (event.key in offsets) {
      event.preventDefault();
      const target = Math.max(
        0,
        Math.min(n ** 2 - 1, cell + offsets[event.key]),
      );
      setFocusedCell(target);
      buttons.current[target]?.focus();
    }
    if (event.key.toLowerCase() === "x") {
      event.preventDefault();
      cellAction(cell, "mark");
    }
    if (event.key.toLowerCase() === "c") {
      event.preventDefault();
      cellAction(cell, "cat");
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      if (!paused && !solved)
        change({
          cats: boardRef.current.cats.filter((c) => c !== cell),
          marks: boardRef.current.marks.filter((c) => c !== cell),
        });
    }
  }
  function exportSave() {
    if (!ready || importBusy.current) return;
    try {
      writeBoard(boardRef.current);
      downloadBackup(progressRef.current, `catnap-save-${dayKey()}.json`);
      const message = "Backup download started. On iPhone, look in Downloads or save the file to Files.";
      setBackupStatus(message);
      setToast(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create a backup. Try again.";
      setBackupStatus(message); setToast(message);
    }
  }
  async function importSave(file?: File) {
    if (!file || importBusy.current || !ready) return;
    importBusy.current = true;
    setImporting(true);
    setBackupStatus("Reading your backup…");
    try {
      const value = parseBackup(await readBackupFile(file));
      writeBoard(boardRef.current);
      const before = Object.keys(progressRef.current.completed).length;
      const merged = mergeProgress(progressRef.current, value);
      commit(merged);
      const target = getPuzzle(value.settings.lastLevel)!;
      const incoming = saveForLevel(value, target.id, device);
      // Open the transferred branch even when local settings have a newer timestamp.
      // The merge still protects a newer version of that same branch.
      openPuzzle(target, false, incoming ? merged.games[incoming.id] : undefined);
      const saved = await commit(progressRef.current);
      const count = Object.keys(merged.completed).length - before;
      const message = `Backup imported. ${count} new completed ${count === 1 ? "puzzle" : "puzzles"}; ${Object.keys(merged.completed).length} total. ${saved ? "Boards and rewards are saved." : "Browser storage is blocked; export a backup before leaving."}`;
      setBackupStatus(message);
      setToast(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read that save.";
      setBackupStatus(message); setToast(message);
    } finally {
      importBusy.current = false; setImporting(false);
      if (imported.current) imported.current.value = "";
    }
  }
  const alternateSaves = Object.values(progress.games)
    .filter((g) => g.levelId === levelId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const unlockedCat = CATS.find(
    (c) => c.unlock > 0 && c.unlock === totalCompleted,
  );

  return (
    <MotionConfig
      reducedMotion={progress.settings.reducedMotion ? "always" : "user"}
    >
      <div
        className="app"
        data-ui
        data-quiet-motion={progress.settings.reducedMotion}
      >
        <header className="site-header">
          <a
            href="#"
            className="brand"
            aria-label="Catnap home"
            onClick={(e) => {
              e.preventDefault();
              openPuzzle(
                LEVELS.find((l) => !progress.completed[l.id]) ?? LEVELS[0],
              );
            }}
          >
            <Cat faceOnly className="brand-cat" />
            <span>
              catnap<span className="brand-dot">.</span>
            </span>
          </a>
          <nav className="main-nav" aria-label="Game navigation">
            <button
              className={!daily ? "active" : ""}
              onClick={() => {
                if (daily)
                  openPuzzle(
                    LEVELS.find((l) => !progress.completed[l.id]) ?? LEVELS[0],
                  );
              }}
            >
              <Grid2X2 size={17} />
              <span>Play</span>
            </button>
            <button onClick={() => setDialog("levels")}>
              <Map size={17} />
              <span>Journey</span>
            </button>
            <button
              className={daily ? "active" : ""}
              onClick={() => openPuzzle(getPuzzle(`daily-${today}`)!)}
            >
              <CalendarDays size={17} />
              <span>Daily puzzle</span>
              {progress.completed[`daily-${today}`] && <Check size={13} />}
            </button>
            <button onClick={() => setDialog("cats")}>
              <PawPrint size={17} />
              <span>Your cats</span>
            </button>
          </nav>
          <div className="header-tools">
            <button
              className="icon-button wallet-button"
              title="Gifts and helping paws"
              aria-label="Gifts and helping paws"
              onClick={() => setDialog("rewards")}
            >
              <Gift size={20} />
            </button>
            <span className="saved-status">
              <CheckCheck size={15} />
              {ready
                ? canSave
                  ? "Progress saved"
                  : "Save unavailable"
                : "Opening your save"}
            </span>
            <button
              className="icon-button"
              title="How to play"
              aria-label="How to play"
              onClick={() => setDialog("help")}
            >
              <CircleHelp size={20} />
            </button>
            <button
              className="icon-button"
              title="Settings and backups"
              aria-label="Settings and backups"
              onClick={() => setDialog("settings")}
            >
              <Settings2 size={20} />
            </button>
          </div>
        </header>

        {!canSave && (
          <div className="storage-warning" role="alert">
            Your browser is blocking saves. Export a backup before you leave.
            <button onClick={exportSave}>Export save</button>
          </div>
        )}

        <main className="game-layout">
          <aside className="journey">
            <div className="chapter-symbol">
              <Sun size={30} strokeWidth={1.3} />
            </div>
            <p className="chapter-label">
              {daily
                ? "A moment, just for today"
                : `Chapter ${String(CHAPTERS.indexOf(chapter) + 1).padStart(2, "0")}`}
            </p>
            <h2>{daily ? "Your daily little pause." : chapter.name}</h2>
            <p className="chapter-description">
              {daily
                ? "A fresh arrangement. A familiar kind of calm."
                : chapter.description}
            </p>
            <div className="chapter-progress">
              <span>
                {daily
                  ? `${Object.keys(progress.completed).filter((id) => id.startsWith("daily-")).length} daily puzzles completed`
                  : `${chapterDone} of ${chapter.end - chapter.start + 1} levels completed`}
              </span>
              {!daily && (
                <div className="progress-track">
                  <div
                    style={{
                      width: `${(chapterDone / (chapter.end - chapter.start + 1)) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
            {!daily && (
              <div className="level-trail" aria-label="Levels in this chapter">
                {LEVELS.filter(
                  (l) => l.number >= chapter.start && l.number <= chapter.end,
                )
                  .slice(0, 12)
                  .map((l) => (
                    <button
                      key={l.id}
                      className={`${l.id === levelId ? "current" : ""} ${progress.completed[l.id] ? "complete" : ""}`}
                      aria-label={`Level ${l.number}${progress.completed[l.id] ? ", completed" : ""}`}
                      aria-current={l.id === levelId ? "step" : undefined}
                      onClick={() => openPuzzle(l)}
                    >
                      {progress.completed[l.id] ? (
                        <Check size={17} />
                      ) : (
                        String(l.number).padStart(2, "0")
                      )}
                    </button>
                  ))}
              </div>
            )}
            <button
              className="text-button browse-button"
              onClick={() => setDialog("levels")}
            >
              All 120 levels <ArrowRight size={16} />
            </button>
            <div className="journey-note">
              <Flower2 size={23} strokeWidth={1.2} />
              <p>
                No rush.
                <br />A little progress is still progress.
              </p>
            </div>
          </aside>

          <section
            className="play-area"
            ref={playRef}
            aria-labelledby="game-title"
          >
            <div className="level-heading">
              <div>
                <div className="level-meta">
                  {daily
                    ? new Date(
                        `${levelId.slice(6)}T12:00:00`,
                      ).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                      })
                    : puzzle.name}
                </div>
                <h1 id="game-title">
                  {daily
                    ? "Daily puzzle"
                    : `Level ${String(puzzle.number).padStart(2, "0")}`}
                  <span className="difficulty">{puzzle.difficulty}</span>
                </h1>
              </div>
              <div className="timer">
                <Timer size={16} />
                <span>{time(elapsed)}</span>
                <button
                  className="icon-button"
                  onClick={() => setPaused(!paused)}
                  aria-label={paused ? "Resume puzzle" : "Pause puzzle"}
                  disabled={solved}
                >
                  {paused ? <Play size={16} /> : <Pause size={16} />}
                </button>
              </div>
            </div>
            <AnimatePresence>
              {hint && !paused && !dialog && (
                <HintPanel
                  key="hint"
                  hint={hint}
                  quiet={progress.settings.reducedMotion}
                  onApply={applyHint}
                  onDismiss={() => setHint(null)}
                />
              )}
            </AnimatePresence>
            <motion.div className="board-card" layout="position" transition={{ layout: { type: "spring", stiffness: 360, damping: 34 } }}>
              <div className="board-status">
                <span>Find a home for every cat</span>
                <span className="cat-count">
                  <PawPrint size={15} />
                  <b>{board.cats.length}</b>
                  <span>/ {puzzle.size}</span>
                </span>
              </div>
              <div className="board-wrap">
                <div
                  className={`puzzle-board ${paused ? "is-paused" : ""} ${progress.settings.dragMark !== false ? "can-drag" : ""}`}
                  onPointerMove={moveStroke}
                  onPointerUp={finishStroke}
                  onPointerCancel={cancelStroke}
                  onLostPointerCapture={() => { if (strokeRef.current) cancelStroke(); }}
                  role="group"
                  aria-label={`${puzzle.size} by ${puzzle.size} cat puzzle`}
                  style={{ "--size": puzzle.size } as CSSProperties}
                >
                  {Array.from({ length: puzzle.size ** 2 }, (_, cell) => {
                    const region = puzzle.regions[cell],
                      n = puzzle.size,
                      row = Math.floor(cell / n),
                      col = cell % n;
                    const hasCat = board.cats.includes(cell),
                      marked = board.marks.includes(cell),
                      auto = automatic.includes(cell) && !hasCat && !marked;
                    const topBorder = row === 0 ? 0 : puzzle.regions[cell - n] !== region ? 2 : 1;
                    const leftBorder = col === 0 ? 0 : puzzle.regions[cell - 1] !== region ? 2 : 1;
                    return (
                      <button
                        key={`${levelId}:${cell}`}
                        ref={(el) => {
                          buttons.current[cell] = el;
                        }}
                        className={`cell ${hasCat ? "has-cat" : ""} ${badCells.includes(cell) ? "conflict" : ""} ${hint?.cells.includes(cell) ? "hinted" : ""} ${hint && !hint.focus.includes(cell) ? "hint-dimmed" : ""} ${hint?.focus.includes(cell) ? "hint-focus" : ""} ${settledRegions.has(region) ? "region-settled" : ""}`}
                        style={{
                          backgroundColor: COLORS[region],
                          "--cell-border-top": `${topBorder}px`,
                          "--cell-border-left": `${leftBorder}px`,
                          borderTopWidth: topBorder,
                          borderLeftWidth: leftBorder,
                          borderTopColor:
                            row > 0 && puzzle.regions[cell - n] !== region
                              ? "#61746b"
                              : "#61746b25",
                          borderLeftColor:
                            col > 0 && puzzle.regions[cell - 1] !== region
                              ? "#61746b"
                              : "#61746b25",
                        } as CSSProperties}
                        aria-label={`Row ${row + 1}, column ${col + 1}, region ${region + 1}${hasCat ? ", cat" : marked ? ", marked X" : auto ? ", automatically ruled out" : ", empty"}${badCells.includes(cell) ? ", conflict" : ""}${hint?.cells.includes(cell) ? ", hint action" : hint?.focus.includes(cell) ? ", hint focus" : ""}`}
                        aria-pressed={hasCat || marked}
                        tabIndex={cell === focusedCell ? 0 : -1}
                        onFocus={() => setFocusedCell(cell)}
                        disabled={!ready || paused}
                        onPointerDown={(event) => beginStroke(event, cell)}
                        onClick={(event) => {
                          if (event.detail !== 0 && suppressClick.current) return;
                          handleTap(cell, event.detail !== 0);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          cellAction(cell, "mark");
                        }}
                        onKeyDown={(event) => gridKey(event, cell)}
                      >
                        {hasCat && settledRegions.has(region) && <span className="cat-settled-check" aria-label="Correct cat; region complete"><Check size={11} /></span>}
                        {progress.settings.patterns && (
                          <span className="region-number">{region + 1}</span>
                        )}
                        <AnimatePresence initial={false}>
                          {hasCat ? (
                            <motion.span
                              className="cell-cat"
                              key="cat"
                              initial={{ scale: 0.4, rotate: -12 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0.4, opacity: 0 }}
                              transition={{
                                type: "spring",
                                stiffness: 460,
                                damping: 19,
                              }}
                            >
                              <Cat
                                kind={cat.id}
                                region={region}
                                faceOnly
                                happy={settledRegions.has(region)}
                              />
                            </motion.span>
                          ) : marked ? (
                            <motion.span
                              className="cell-mark"
                              key="mark"
                              initial={{ scale: 0.3, opacity: 0, rotate: appliedHintCells.includes(cell) ? -10 : 0 }}
                              animate={{ scale: 1, opacity: 1, rotate: 0 }}
                              exit={{ opacity: 0, transition: { duration: 0.12, delay: 0 } }}
                              transition={{ type: "spring", stiffness: 420, damping: 25, delay: appliedHintCells.includes(cell) ? Math.min(appliedHintCells.indexOf(cell) * 0.025, 0.18) : 0 }}
                            >
                              <X strokeWidth={1.8} />
                            </motion.span>
                          ) : auto ? (
                            <span className="auto-mark">·</span>
                          ) : null}
                        </AnimatePresence>
                      </button>
                    );
                  })}
                </div>
                {paused && (
                  <div className="pause-cover">
                    <Cat kind={cat.id} sleeping />
                    <h2>A little catnap.</h2>
                    <button
                      className="primary-button"
                      onClick={() => setPaused(false)}
                    >
                      <Play size={16} />
                      Ready when you are
                    </button>
                  </div>
                )}
                {!ready && (
                  <div className="pause-cover">
                    <Cat kind="mochi" sleeping />
                    <p>Finding your place…</p>
                  </div>
                )}
              </div>
              <div className="tap-guide">
                <span>
                  <span className="tap-dot" />
                  Single tap <X size={14} /> mark
                </span>
                <span>
                  <span className="tap-dot double-dot" />
                  Double tap <PawPrint size={14} /> cat
                </span>
                {progress.settings.dragMark !== false && <span className="drag-guide">Drag to mark Xs</span>}
              </div>
            </motion.div>
            <div className="game-actions">
              <button
                onClick={undo}
                disabled={!ready || !history.length || paused}
                title="Undo last move"
              >
                <Undo2 size={20} />
                <span>Undo</span>
              </button>
              <button onClick={() => setDialog("restart")} disabled={paused}>
                <RotateCcw size={19} />
                <span>Restart</span>
              </button>
              <button
                onClick={() => showHint()}
                disabled={!ready || solved || paused}
              >
                <Lightbulb size={20} />
                <span>
                  Hint <b className="token-count">{balance.hints}</b>
                </span>
              </button>
              <button
                className="find-cat"
                onClick={findCat}
                disabled={!ready || solved || paused}
              >
                <PawPrint size={20} />
                <span>
                  Find a cat <b className="token-count">{balance.cats}</b>
                </span>
                <Sparkles size={12} className="assist-sparkle" />
              </button>
            </div>
            <div className="board-message" role="status">
              {badCells.length ? (
                <span className="conflict-message">
                  These cats need a little more space. Check the outlined
                  squares.
                </span>
              ) : solved ? (
                <span className="solved-message">
                  <Check size={15} />
                  Everyone has a little place of their own.
                </span>
              ) : (
                <span>
                  One cat per row, column, and color. No touching, even at
                  corners.
                </span>
              )}
            </div>
            {solved && dialog !== "win" && (
              <button
                className="primary-button continue-button"
                onClick={() => openPuzzle(nextLevel ?? LEVELS[0])}
              >
                {" "}
                {nextLevel ? "Next little puzzle" : "Play again"}
                <ArrowRight size={17} />
              </button>
            )}
            <div className="level-bottom-nav">
              <button
                className="text-button"
                disabled={daily || puzzle.number === 1}
                onClick={() => openPuzzle(LEVELS[puzzle.number - 2])}
              >
                <ChevronLeft size={15} />
                Previous
              </button>
              <button
                className="text-button"
                onClick={() => setDialog("levels")}
              >
                Choose a level <ChevronDown size={14} />
              </button>
              <button
                className="text-button"
                disabled={daily || puzzle.number === LEVELS.length}
                onClick={() => openPuzzle(LEVELS[puzzle.number])}
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </section>

          <aside className="companion">
            <WindowScene kind={cat.id} happy={solved} />
            <div className="companion-copy">
              <span className="small-kicker">A little company</span>
              <h2>{cat.name} is here.</h2>
              <p>
                {solved
                  ? "A good puzzle. An even better nap."
                  : "You do the thinking.\nI’ll keep this spot warm."}
              </p>
              <button className="text-button" onClick={() => setDialog("cats")}>
                Meet your cats <ArrowRight size={15} />
              </button>
            </div>
            <div className="quiet-promise">
              <span className="quiet-dot" />
              Just you and the puzzle.
              <br />
              No ads. Little gifts for your progress.
            </div>
          </aside>
        </main>
        <footer className="site-footer">
          <span>A little room for logic.</span>
          <span>
            {completedLevels} / 120 levels completed
            <span className="footer-divider">·</span>
            {offlineReady ? "Ready for offline play" : "Made for quiet moments"}
          </span>
        </footer>
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {(dialog === "rewards" || dialog === "refill") && (
          <Modal
            title={
              dialog === "refill"
                ? "A little helping-paw refill."
                : "Your pocket of helping paws"
            }
            onClose={() => setDialog(null)}
          >
            <p className="modal-intro">
              Useful little gifts for every step of your journey. Everything
              stays free, with no ads or waiting.
            </p>
            <div className="reward-wallet">
              <div>
                <Lightbulb size={25} />
                <strong>{balance.hints}</strong>
                <span>Hint tokens</span>
                {balance.hints === 0 && (
                  <button
                    className="text-button"
                    onClick={() => {
                      commit((old) => refillAssist(old, device, "hints"));
                      setDialog(null);
                      setToast("3 free hints, tucked into your pocket.");
                    }}
                  >
                    Get 3 free hints <Gift size={14} />
                  </button>
                )}
              </div>
              <div>
                <PawPrint size={25} />
                <strong>{balance.cats}</strong>
                <span>Find a cat tokens</span>
                {balance.cats === 0 && (
                  <button
                    className="text-button"
                    onClick={() => {
                      commit((old) => refillAssist(old, device, "cats"));
                      setDialog(null);
                      setToast("A free Find a cat token, just for you.");
                    }}
                  >
                    Get a free cat assist <Gift size={14} />
                  </button>
                )}
              </div>
            </div>
            {dialog === "refill" && (
              <p className="refill-note">
                Your {refillKind === "hints" ? "hint" : "Find a cat"} pocket is
                empty. Take a free refill above, then try your assist again.
              </p>
            )}
            <div className="reward-rules">
              <div>
                <Gift size={18} />
                <span>A welcome gift</span>
                <strong>10 hints + 5 cat assists</strong>
              </div>
              <div>
                <Check size={18} />
                <span>Each new puzzle completed</span>
                <strong>+1 hint</strong>
              </div>
              <div>
                <Sparkles size={18} />
                <span>Every 5 new puzzles</span>
                <strong>+2 cat assists</strong>
              </div>
              <div>
                <Flower2 size={18} />
                <span>Every finished chapter</span>
                <strong>+3 hints + 1 cat assist</strong>
              </div>
            </div>
            <p className="reward-footnote">
              Opening a new hint uses one token; reopening that hint on the same
              board is free. Replays can improve your stars. First-clear gifts
              are awarded once and survive backup transfers.
            </p>
            <button
              className="primary-button full-width"
              onClick={() => setDialog("levels")}
            >
              Explore your journey <Map size={16} />
            </button>
          </Modal>
        )}
        {dialog === "levels" && (
          <Modal
            title="A little world to explore"
            wide
            onClose={() => setDialog(null)}
          >
            <JourneyMap
              progress={progress}
              currentId={levelId}
              cat={cat.id}
              onChoose={openPuzzle}
            />
          </Modal>
        )}
        {dialog === "cats" && (
          <Modal
            title="Good company, small paws."
            wide
            onClose={() => setDialog(null)}
          >
            <p className="modal-intro">
              Pick a puzzle companion. Meet more cats as you complete levels.
            </p>
            <div className="cat-collection">
              {CATS.map((friend) => {
                const unlocked = totalCompleted >= friend.unlock;
                return (
                  <button
                    className={`cat-option ${cat.id === friend.id ? "chosen" : ""} ${unlocked ? "" : "locked"}`}
                    key={friend.id}
                    disabled={!unlocked}
                    onClick={() => {
                      updateSettings({ cat: friend.id });
                      setToast(`${friend.name} is keeping you company.`);
                    }}
                    aria-label={`${friend.name}${unlocked ? (cat.id === friend.id ? ", selected" : ", choose companion") : `, unlock after ${friend.unlock} puzzles`}`}
                  >
                    <Cat kind={friend.id} sleeping={!unlocked} />
                    <h3>
                      {friend.name}
                      {cat.id === friend.id && <Check size={15} />}
                    </h3>
                    <p>
                      {unlocked ? (
                        friend.description
                      ) : (
                        <>
                          <LockKeyhole size={12} />
                          Complete {friend.unlock} puzzles
                        </>
                      )}
                    </p>
                    {unlocked && (
                      <span className="cat-choice">
                        {cat.id === friend.id
                          ? "Your companion"
                          : "Choose companion"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Modal>
        )}
        {dialog === "settings" && (
          <Modal title="Make yourself at home" onClose={() => setDialog(null)}>
            <div className="setting-group">
              <h3>Choose your atmosphere</h3>
              <div className="theme-options" role="group" aria-label="Theme">
                {THEMES.map((theme) => <button key={theme.id} className="theme-option" aria-pressed={(progress.settings.theme ?? "garden") === theme.id} onClick={() => updateSettings({ theme: theme.id })}>
                  <span className="theme-swatches" aria-hidden="true">{theme.swatches.map((color) => <i key={color} style={{ background: color }} />)}</span>
                  <strong>{theme.name}</strong><span>{theme.detail}</span>
                  {(progress.settings.theme ?? "garden") === theme.id && <Check size={15} />}
                </button>)}
              </div>
              <p className="setting-copy">Board colors stay familiar in every theme.</p>
            </div>
            <div className="setting-group">
              <h3>Little preferences</h3>
              {(
                [
                  {
                    key: "autoMark",
                    title: "Auto-mark impossible squares",
                    description:
                      "A quiet dot marks squares blocked by your cats.",
                  },
                  {
                    key: "dragMark",
                    title: "Drag to mark Xs",
                    description: "Paint Xs across squares in one stroke. Turn off to scroll over the board.",
                  },
                  {
                    key: "patterns",
                    title: "Show region numbers",
                    description: "Identify colored regions by number, too.",
                  },
                  {
                    key: "reducedMotion",
                    title: "Gentler motion",
                    description: "Keep things still, with simple transitions.",
                  },
                ] as const
              ).map((setting) => (
                <div className="setting-row" key={setting.key}>
                  <div>
                    <label htmlFor={setting.key}>{setting.title}</label>
                    <p>{setting.description}</p>
                  </div>
                  <button
                    id={setting.key}
                    className="toggle"
                    role="switch"
                    aria-checked={progress.settings[setting.key] ?? (setting.key === "dragMark")}
                    aria-label={setting.title}
                    onClick={() =>
                      updateSettings({
                        [setting.key]: !(progress.settings[setting.key] ?? (setting.key === "dragMark")),
                      })
                    }
                  >
                    <span />
                  </button>
                </div>
              ))}
            </div>
            <div className="setting-group">
              <h3>Your progress, safely tucked away</h3>
              <p className="setting-copy">
                Moves and completed levels save automatically in this browser,
                even after closing it or restarting your device.
              </p>
              <div className="save-info">
                <CheckCheck size={19} />
                <span>{completedLevels} levels completed on this device</span>
              </div>
              <p className="setting-copy">
                To continue on your iPhone or Mac, export your save and import
                it there. Importing combines completed levels and keeps separate
                board saves. Clearing website data removes local progress, so
                keep a backup.
              </p>
              <div className="backup-actions">
                <button className="secondary-button" onClick={exportSave} disabled={!ready || importing}>
                  <Download size={17} />
                  Export save
                </button>
                <button
                  className="secondary-button"
                  disabled={!ready || importing}
                  onClick={() => imported.current?.click()}
                >
                  <Upload size={17} />
                  {importing ? "Importing…" : "Import save"}
                </button>
              </div>
              {backupStatus && <p className="backup-status" role="status">{backupStatus}</p>}
              <input
                type="file"
                ref={imported}
                accept=".json,application/json"
                className="visually-hidden"
                aria-label="Choose a Catnap save file"
                onChange={(e) => void importSave(e.target.files?.[0])}
              />
            </div>
            {alternateSaves.length > 1 && (
              <div className="setting-group">
                <h3>Saved boards for this puzzle</h3>
                <p className="setting-copy">
                  More than one board came with your backups. Choose the one you
                  want to continue.
                </p>
                <div className="alternate-saves">
                  {alternateSaves.map((save, index) => (
                    <button
                      className="secondary-button"
                      key={save.id}
                      onClick={() => openPuzzle(puzzle, false, save)}
                    >
                      <span>
                        {save.cats.length} cats · {time(save.elapsed)}
                      </span>
                      <span>
                        {new Date(save.updatedAt).toLocaleDateString()}
                        {index === 0 ? " · Latest" : ""}
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="setting-group install-copy">
              <h3>Keep Catnap close</h3>
              <p>
                On iPhone, open this site in Safari, tap Share, then Add to Home
                Screen. On your Mac, use your browser’s install option. Open
                online once after an update to prepare offline play.
              </p>
            </div>
            <p className="settings-footnote">
              Always quiet. No ads, sound, vibration, or music.
            </p>
          </Modal>
        )}
        {dialog === "help" && (
          <Modal
            title="Every cat needs a little space."
            onClose={() => setDialog(null)}
          >
            <p className="modal-intro">
              Find the one arrangement where everyone feels at home.
            </p>
            <ol className="rules">
              <li>
                <div className="rule-art">
                  <span />
                  <Cat faceOnly />
                  <span />
                </div>
                <div>
                  <h3>One in each row and column</h3>
                  <p>A cat likes having its whole row and column to itself.</p>
                </div>
              </li>
              <li>
                <div className="rule-art region-art">
                  <span />
                  <Cat faceOnly />
                  <span />
                </div>
                <div>
                  <h3>One in each colored region</h3>
                  <p>Every patch of color is a home for exactly one cat.</p>
                </div>
              </li>
              <li>
                <div className="rule-art no-touch-art">
                  <X size={20} />
                  <Cat faceOnly />
                  <X size={20} />
                </div>
                <div>
                  <h3>A little personal space</h3>
                  <p>Cats cannot touch, including diagonally at the corners.</p>
                </div>
              </li>
            </ol>
            <div className="help-controls">
              <h3>A helping paw is always here.</h3>
              <p>
                <strong>Single tap</strong> to mark an X; tap the X again to
                clear it. <strong>Drag</strong> to paint Xs across cells; one Undo clears the stroke. <strong>Double tap</strong> to place a cat, or double
                tap a cat to remove it. Cats match their colored regions.{" "}
                <strong>Hint</strong> focuses a deduction and can mark impossible squares;{" "}
                <strong>Find a cat</strong> places one for you. Your helping-paw
                counts grow as you finish puzzles, with free refills whenever
                you run out.
              </p>
              <p className="keyboard-note">
                On Mac: arrow keys move, C places a cat, X marks a square, and
                Delete clears it. Right-click also marks an X.
              </p>
            </div>
            <button
              className="primary-button full-width"
              onClick={() => setDialog(null)}
            >
              Let’s find their homes
              <ArrowRight size={16} />
            </button>
          </Modal>
        )}
        {dialog === "restart" && (
          <Modal title="A fresh start?" onClose={() => setDialog(null)}>
            <p className="modal-intro">
              This clears the current board and timer. Your completed levels and
              cats stay with you.
            </p>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setDialog(null)}
              >
                Keep playing
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  tapRef.current = null;
                  assistsRef.current = emptyAssists();
                  elapsedRef.current = 0;
                  setElapsed(0);
                  change({ cats: [], marks: [] });
                  setHistory([]);
                  setDialog(null);
                }}
              >
                Restart this puzzle
              </button>
            </div>
          </Modal>
        )}
        {dialog === "win" && (
          <Modal
            title="Everyone’s found a home."
            onClose={() => setDialog(null)}
          >
            <div className="win-art">
              <motion.div
                initial={{ scale: 0.7, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 180, damping: 13 }}
              >
                <Cat kind={cat.id} happy />
              </motion.div>
              {Array.from({ length: 12 }, (_, i) => (
                <motion.span
                  key={i}
                  className="confetti"
                  style={{
                    background: COLORS[i % COLORS.length],
                    left: `${8 + i * 7}%`,
                    top: `${10 + (i % 3) * 13}%`,
                  }}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{
                    y: [-10, 10, 40],
                    opacity: [0, 1, 0],
                    rotate: i * 30,
                  }}
                  transition={{ duration: 1.8, delay: i * 0.04 }}
                />
              ))}
            </div>
            <p className="win-copy">
              A little patience. A little logic. Nicely done.
            </p>
            <div
              className="win-stars"
              role="img"
              aria-label={`${starsFor(assistsRef.current)} of 3 stars this attempt`}
            >
              {[1, 2, 3].map((n) => (
                <Star
                  key={n}
                  size={27}
                  className={n <= starsFor(assistsRef.current) ? "earned" : ""}
                />
              ))}
            </div>
            <div className="win-stats">
              <span>
                <Timer size={17} />
                {time(elapsed)}
              </span>
              <span>
                <PawPrint size={17} />
                {puzzle.size} happy cats
              </span>
            </div>
            {winGift.hints > 0 || winGift.cats > 0 ? (
              <div className="win-gift">
                <Gift size={25} />
                <div>
                  <strong>A little gift, well earned.</strong>
                  <span>
                    {winGift.hints > 0 &&
                      `+${winGift.hints} hint${winGift.hints === 1 ? "" : "s"}`}
                    {winGift.hints > 0 && winGift.cats > 0 && " · "}
                    {winGift.cats > 0 && `+${winGift.cats} Find a cat`}
                  </span>
                </div>
              </div>
            ) : (
              <p className="replay-note">
                Your first-clear gift is already tucked away. Replay for stars,
                just for the joy of it.
              </p>
            )}
            {unlockedCat && (
              <p className="new-cat">
                <Sparkles size={16} />
                You’ve met {unlockedCat.name}! Find them in Your cats.
              </p>
            )}
            <button
              className="primary-button full-width"
              onClick={() => openPuzzle(nextLevel ?? LEVELS[0])}
            >
              {nextLevel ? "Next little puzzle" : "Explore again"}
              <ArrowRight size={17} />
            </button>
            <button
              className="text-button win-back"
              onClick={() => setDialog("levels")}
            >
              Take a look around
            </button>
          </Modal>
        )}
      </div>
    </MotionConfig>
  );
}
