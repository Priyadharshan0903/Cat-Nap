const { launch, click, sleep, errors } = require("./harness.cjs");
const assert = require("node:assert/strict"), fs = require("node:fs");
const level = JSON.parse(fs.readFileSync("lib/levels.json", "utf8"))[0];
const key = "catnap.save.v1";
const progress = (w) => JSON.parse(w.localStorage.getItem(key));
const snapshot = (w) => Object.fromEntries(Array.from({ length: w.localStorage.length }, (_, i) => {
  const name = w.localStorage.key(i); return [name, w.localStorage.getItem(name)];
}));
function pointer(w, target, type, x, y, id = 1) {
  const event = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperties(event, { pointerId: { value: id }, isPrimary: { value: true } });
  target.dispatchEvent(event);
}
function tap(w, cell, detail = 1) {
  const button = w.document.querySelectorAll(".cell")[cell];
  pointer(w, button, "pointerdown", 10, 10);
  pointer(w, button, "pointerup", 10, 10);
  button.dispatchEvent(new w.MouseEvent("click", { bubbles: true, detail }));
}
const board = (w) => {
  const grid = w.document.querySelector(".puzzle-board");
  grid.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 500 });
  grid.setPointerCapture = () => {};
  return grid;
};
const active = (w) => Object.values(progress(w).games).sort((a, b) => b.updatedAt - a.updatedAt)[0];
function readBlob(w, blob) { return new Promise((resolve, reject) => {
  const reader = new w.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(blob);
}); }
async function importText(w, text) {
  w.document.querySelector('[aria-label="Settings and backups"]').click();
  await sleep(30);
  const input = w.document.querySelector("input[type=file]");
  // Exercise the actual FileReader fallback (not an object with a mocked text method).
  Object.defineProperty(input, "files", { value: [new w.File([text], "catnap.json", { type: "application/json" })], configurable: true });
  input.dispatchEvent(new w.Event("change", { bubbles: true }));
  await sleep(120);
}
(async () => {
  let dom = await launch({}, true), w = dom.window;
  tap(w, level.solution[0]); await sleep(20); tap(w, level.solution[0], 2); await sleep(30);
  assert.deepEqual(active(w).cats, [level.solution[0]], "Pointer events preserve native double taps");
  await click(w, "Undo");
  assert.deepEqual(active(w).cats, []);
  const wrong = level.regions.findIndex((_, c) => !level.solution.includes(c));
  w.document.querySelectorAll(".cell")[wrong].dispatchEvent(new w.KeyboardEvent("keydown", { key: "c", bubbles: true }));
  await sleep(20);
  assert.equal(w.document.querySelector(".cat-settled-check"), null, "An incorrect but conflict-free cat is not shown as completed");
  await click(w, "Undo");
  w.document.querySelectorAll(".cell")[level.solution[0]].dispatchEvent(new w.KeyboardEvent("keydown", { key: "c", bubbles: true }));
  await sleep(30);
  assert.ok(w.document.querySelector(".has-cat.region-settled .cat-settled-check"));
  const before = active(w);
  let grid = board(w);
  pointer(w, w.document.querySelectorAll(".cell")[0], "pointerdown", 50, 50);
  pointer(w, grid, "pointermove", 450, 50);
  await sleep(30);
  assert.deepEqual(active(w).marks, before.marks, "Unfinished strokes are previews");
  pointer(w, grid, "pointerup", 450, 50);
  w.document.querySelectorAll(".cell")[0].dispatchEvent(new w.MouseEvent("click", { bubbles: true, detail: 1 }));
  await sleep(30);
  const painted = active(w);
  assert.deepEqual(painted.cats, before.cats, "Dragging never erases cats");
  assert.deepEqual([...painted.marks].sort(), [0, 1, 2, 3, 4].filter((c) => !before.cats.includes(c)), "Fast strokes fill every crossed cell");
  pointer(w, w.document.querySelectorAll(".cell")[0], "pointerdown", 50, 50);
  pointer(w, grid, "pointermove", 450, 50);
  pointer(w, grid, "pointermove", 50, 50);
  pointer(w, grid, "pointerup", 50, 50);
  await sleep(20);
  assert.deepEqual(active(w).marks, [], "A desktop stroke starting on X erases instead of painting");
  assert.deepEqual(active(w).cats, before.cats);
  await click(w, "Undo");
  assert.deepEqual(active(w).marks, painted.marks, "Undo restores erased marks as one gesture");
  await click(w, "Undo");
  assert.deepEqual(active(w).marks, before.marks, "One Undo restores the whole stroke");
  grid = board(w);
  pointer(w, w.document.querySelectorAll(".cell")[5], "pointerdown", 50, 150);
  pointer(w, grid, "pointermove", 450, 150);
  pointer(w, grid, "pointercancel", 450, 150);
  await sleep(30);
  assert.deepEqual(active(w).marks, before.marks, "Cancelled strokes leave no partial saves");
  tap(w, 10); await sleep(30);
  assert.ok(active(w).marks.includes(10), "A fresh tap works immediately after cancellation");
  const stableMarks = active(w).marks;
  w.document.querySelector('[aria-label="Pause puzzle"]').click(); await sleep(30);
  pointer(w, w.document.querySelectorAll(".cell")[5], "pointerdown", 50, 150);
  pointer(w, grid, "pointermove", 450, 150);
  pointer(w, grid, "pointerup", 450, 150);
  assert.deepEqual(active(w).marks, stableMarks, "A paused puzzle cannot be painted");
  await click(w, "Ready when you are");
  w.document.querySelector('[aria-label="Settings and backups"]').click(); await sleep(30);
  for (const [name, id] of [["Night", "night"], ["Seaside", "ocean"], ["Garden", "garden"], ["Device", "garden"]]) {
    [...w.document.querySelectorAll(".theme-option")].find((b) => b.querySelector("strong").textContent === name).click();
    await sleep(30);
    assert.equal(w.document.documentElement.dataset.theme, id);
  }
  w.__setSystemDark(true); await sleep(20);
  assert.equal(w.document.documentElement.dataset.theme, "night", "Device theme follows live system changes");
  w.document.querySelector('[aria-label="Drag to mark Xs"]').click(); await sleep(20);
  assert.equal(w.document.querySelector(".can-drag"), null);
  w.document.querySelector('[aria-label="Gentler motion"]').click(); await sleep(20);
  assert.equal(w.document.querySelector(".app").dataset.quietMotion, "true");
  await click(w, "Export save");
  assert.equal(w.__downloadAttached, true);
  const exportedText = await readBlob(w, w.__backupBlob);
  const exported = JSON.parse(exportedText);
  assert.deepEqual(exported, progress(w), "Exported bytes contain the entire current save");
  assert.equal(exported.settings.dragMark, false);
  assert.equal(exported.settings.theme, "system");
  const saved = snapshot(w);
  dom.window.close();
  dom = await launch(saved, true); w = dom.window;
  assert.equal(w.document.querySelector(".can-drag"), null, "Drag preference survives reload");
  assert.equal(progress(w).settings.theme, "system");
  assert.deepEqual(active(w).marks, stableMarks);
  const beforeDisabled = active(w).marks;
  grid = board(w);
  pointer(w, w.document.querySelectorAll(".cell")[15], "pointerdown", 50, 350);
  pointer(w, grid, "pointermove", 450, 350);
  pointer(w, grid, "pointerup", 450, 350);
  await sleep(20);
  assert.deepEqual(active(w).marks, beforeDisabled, "Drag-off leaves board scrolling gestures alone");
  dom.window.close();

  // The receiver has a newer settings timestamp, an existing branch of this board,
  // and another current level. Import must still visibly open the transferred board.
  const localId = "level-001:receiving-mac";
  const local = { version: 1, games: {
    [localId]: { id: localId, device: "receiving-mac", levelId: "level-001", revision: 4, cats: [], marks: [24], elapsed: 30, updatedAt: Date.now() + 20000 },
  }, completed: {}, settings: { ...exported.settings, lastLevel: "level-002", updatedAt: Date.now() + 50000 }, rewards: { spent: {}, refilled: {} } };
  dom = await launch({ [key]: JSON.stringify(local), "catnap.device.v1": "receiving-mac" }, true); w = dom.window;
  await importText(w, exportedText);
  assert.match(w.document.querySelector("h1").textContent, /Level 01/);
  assert.match(w.document.querySelector(".toast").textContent, /Backup imported/);
  assert.deepEqual(progress(w).games[localId], local.games[localId], "Import preserves the existing local board branch");
  const foreignId = Object.keys(exported.games)[0];
  assert.deepEqual(progress(w).games[foreignId], exported.games[foreignId], "The transferred source branch remains intact");
  assert.deepEqual(active(w).cats, exported.games[foreignId].cats);
  assert.deepEqual(active(w).marks, exported.games[foreignId].marks);
  w.dispatchEvent(new w.Event("pagehide")); await sleep(30);
  assert.deepEqual(progress(w).games[localId], local.games[localId], "A pagehide save cannot replace the preserved local alternative");
  const ledger = progress(w).rewards;
  const branchesBeforeRepeat = Object.keys(progress(w).games).length;
  await importText(w, exportedText);
  assert.deepEqual(progress(w).rewards, ledger, "Importing twice does not refund spending or mint rewards");
  assert.equal(Object.keys(progress(w).games).length, branchesBeforeRepeat, "Repeat imports reuse an unchanged local copy of the transferred board");
  const beforeInvalid = progress(w);
  await importText(w, "{bad JSON");
  assert.match(w.document.querySelector(".backup-status").textContent, /not readable JSON/);
  assert.deepEqual(progress(w), beforeInvalid, "Invalid files do not mutate the save");
  w.document.querySelector('[aria-label="Close dialog"]').click(); await sleep(30);
  const mixedIds = JSON.parse(fs.readFileSync("lib/journey.json", "utf8"));
  const expertStage = mixedIds.indexOf("level-121") + 1;
  assert.equal([...w.document.querySelectorAll("button")].some((b) => b.textContent.includes("Try Expert")), false);
  await click(w, "All 156 levels");
  await click(w, "Quick level list");
  await click(w, String(expertStage));
  assert.ok(w.document.querySelector("h1").textContent.includes("Level " + expertStage + "Expert"));
  assert.equal(w.document.querySelector(".puzzle-board").dataset.puzzleId, "level-121");
  assert.equal(w.document.querySelectorAll(".cell").length, 81);
  await click(w, "Hint");
  assert.ok(w.document.querySelector(".hint-card"), "Mixed challenges keep teaching hints");
  w.document.querySelector(".hint-apply").click(); await sleep(40);
  const expertSave = Object.values(progress(w).games).find((g) => g.levelId === "level-121");
  const expert = JSON.parse(fs.readFileSync("lib/expert-levels.json", "utf8"))[0];
  assert.ok(expertSave.marks.length > 0);
  assert.ok(expertSave.marks.every((c) => !expert.solution.includes(c)));
  w.document.querySelector(".level-bottom-nav button:last-child").click(); await sleep(40);
  assert.equal(w.document.querySelector(".puzzle-board").dataset.puzzleId, mixedIds[expertStage], "Next follows the mixed path");
  await click(w, "All 156 levels");
  assert.match(w.document.querySelector(".map-totals").textContent, /468 stars/);
  await click(w, "Quick level list");
  await click(w, "156");
  assert.match(w.document.querySelector("h1").textContent, /Level 156/);
  await click(w, "Find a cat");
  assert.match(w.document.querySelector(".toast-position .toast").textContent, /helping paw/);
  w.document.querySelector('[aria-label="Settings and backups"]').click(); await sleep(30);
  await click(w, "Export save");
  const mixedBackup = JSON.parse(await readBlob(w, w.__backupBlob));
  assert.equal(mixedBackup.settings.lastLevel, mixedIds[155]);
  assert.ok(Object.values(mixedBackup.games).some((g) => g.levelId === mixedIds[155] && g.cats.length === 1));
  dom.window.close();
  assert.deepEqual(errors, []);
  console.log("Feature integration passed: theme persistence and system changes, drag paint/erase/cancel/undo, unchanged taps, reduced motion, real JSON download bytes, FileReader transfer, branch preservation, repeat imports, invalid-file safety, Expert navigation/hints/backup, and notification rendering.");
})().catch((error) => { console.error(error); process.exitCode = 1; setTimeout(() => process.exit(1), 100); });
