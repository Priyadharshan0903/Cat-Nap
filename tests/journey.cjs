const { launch, click, sleep, errors } = require("./harness.cjs");
const assert = require("node:assert/strict"), fs = require("node:fs");
const ids = JSON.parse(fs.readFileSync("lib/journey.json", "utf8"));
const old = JSON.parse(fs.readFileSync("lib/expert-levels.json", "utf8")).find((p) => p.id === "level-132");
const now = Date.now(), device = "saved-mac", gameId = old.id + ":" + device;
const before = { version: 1, settings: { cat: "mochi", autoMark: false, reducedMotion: true, patterns: false, lastLevel: old.id, updatedAt: now },
  completed: {}, rewards: { spent: {}, refilled: {} }, lives: { losses: { existing: now - 1000 } },
  games: { [gameId]: { id: gameId, levelId: old.id, device, revision: 4, updatedAt: now, elapsed: 81, cats: old.solution.slice(0, 3), marks: [] } } };
for (let i = 1; i <= 12; i++) {
  const id = "level-" + String(i).padStart(3, "0");
  before.completed[id] = { levelId: id, completedAt: now - 2000, bestTime: 20 };
}
(async () => {
  const dom = await launch({ "catnap.save.v1": JSON.stringify(before), "catnap.device.v1": device }, true), w = dom.window;
  assert.equal(w.document.querySelector(".puzzle-board").dataset.puzzleId, old.id);
  const occupied = [...w.document.querySelectorAll(".cell")].flatMap((b, i) => b.classList.contains("has-cat") ? [i] : []);
  assert.deepEqual(occupied, old.solution.slice(0, 3), "A saved Expert board resumes the same cells after mixing");
  assert.equal(w.document.querySelector(".lives-meter strong").textContent, "2 / 3");
  const stage = ids.indexOf(old.id) + 1;
  assert.match(w.document.querySelector("h1").textContent, new RegExp("Level " + stage + "Expert"));
  await click(w, "All 156 levels");
  w.document.querySelector('[aria-label^="Open chapter 1:"]').click(); await sleep(30);
  assert.match(w.document.querySelector(".map-chapter-gift").textContent, /already yours/, "An old chapter gift remains credited");
  assert.ok(new Set([...w.document.querySelectorAll(".map-puzzle-info")].map((b) => b.textContent.split(" · ")[0])).size >= 2);
  assert.equal([...w.document.querySelectorAll("button")].some((b) => /Explore Expert|Try Expert/.test(b.textContent)), false);
  await click(w, "Quick level list"); await click(w, "156");
  assert.equal(w.document.querySelector(".puzzle-board").dataset.puzzleId, ids[155]);
  w.document.querySelector(".level-bottom-nav button:first-child").click(); await sleep(30);
  assert.equal(w.document.querySelector(".puzzle-board").dataset.puzzleId, ids[154]);
  w.document.querySelector(".level-bottom-nav button:last-child").click(); await sleep(30);
  assert.equal(w.document.querySelector(".puzzle-board").dataset.puzzleId, ids[155]);
  assert.equal(w.document.querySelector(".lives-meter strong").textContent, "2 / 3", "Mixing/navigation never resets lives");
  w.document.querySelector('[aria-label="Settings and backups"]').click(); await sleep(30);
  const input = w.document.querySelector("input[type=file]");
  Object.defineProperty(input, "files", { value: [new w.File([JSON.stringify(before)], "previous-journey.json", { type: "application/json" })] });
  input.dispatchEvent(new w.Event("change", { bubbles: true })); await sleep(120);
  assert.equal(w.document.querySelector(".puzzle-board").dataset.puzzleId, old.id);
  assert.equal(w.document.querySelectorAll(".has-cat").length, 3);
  assert.equal(w.document.querySelector(".lives-meter strong").textContent, "2 / 3");
  assert.equal(Object.keys(JSON.parse(w.localStorage.getItem("catnap.save.v1")).completed).length, 12);
  assert.deepEqual(errors, []);
  dom.window.close();
  console.log("Mixed journey integration passed: existing-board restoration, map variety, retained chapter gifts/lives, mixed next/previous navigation, and older backup compatibility.");
})().catch((error) => { console.error(error); process.exitCode = 1; setTimeout(() => process.exit(1), 100); });
