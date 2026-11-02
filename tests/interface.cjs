const { JSDOM } = require("jsdom");
const { indexedDB, IDBKeyRange, IDBFactory } = require("fake-indexeddb");
const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const html = fs
  .readFileSync("dist/index.html", "utf8")
  .replace(/<script[^>]*type="module"[\s\S]*?<\/script>/, "");
const asset = fs
  .readFileSync("dist/index.html", "utf8")
  .match(/src="\.\/assets\/([^"]+\.js)"/)[1];
const bundle = fs.readFileSync("dist/assets/" + asset, "utf8");
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function launch(saved = {}, isolated = false) {
  const dom = new JSDOM(html, {
    url: "http://localhost:8765/catnap/game/dist/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  w.indexedDB = isolated ? new IDBFactory() : indexedDB;
  w.IDBKeyRange = IDBKeyRange;
  w.structuredClone = structuredClone;
  w.matchMedia = (q) => ({
    matches: false,
    media: q,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  w.Element.prototype.scrollIntoView = function () {};
  w.URL.createObjectURL = () => "blob:backup";
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {
    w.__downloaded = this.download;
  };
  Object.defineProperty(w.crypto, "randomUUID", {
    value: () => crypto.randomUUID(),
  });
  for (const [key, value] of Object.entries(saved))
    w.localStorage.setItem(key, value);
  w.addEventListener("error", (e) => errors.push(e.error?.stack || e.message));
  w.eval(bundle);
  await sleep(150);
  return dom;
}
const textButton = (w, text) =>
  [...w.document.querySelectorAll("button")].find(
    (el) =>
      el.textContent.trim() === text ||
      (["Hint", "Find a cat"].includes(text) &&
        el.querySelector(".token-count") &&
        el.textContent.trim().startsWith(text)),
  );
const click = async (w, text) => {
  const b = textButton(w, text);
  assert.ok(b, `Button exists: ${text}`);
  b.click();
  await sleep(60);
};
(async () => {
  let dom = await launch(),
    w = dom.window;
  assert.equal(w.document.querySelector("h1").textContent, "Level 01Easy");
  await click(w, "Hint");
  assert.ok(w.document.querySelector(".hint-card"));
  await click(w, "Place this cat");
  assert.equal(w.document.querySelectorAll(".cell.has-cat").length, 1);
  await click(w, "Undo");
  assert.equal(w.document.querySelectorAll(".cell.has-cat").length, 0);
  assert.equal(
    w.document.querySelector(".mode-switch"),
    null,
    "The old tool switch is gone",
  );
  await click(w, "Hint");
  assert.equal(
    w.document.querySelector(".game-actions button:nth-child(3) .token-count")
      .textContent,
    "9",
    "Reopening the same hint is free",
  );
  w.document.querySelector('[aria-label="Dismiss hint"]').click();
  await sleep(50);
  const target = w.document.querySelector(".cell");
  target.dispatchEvent(new w.MouseEvent("click", { bubbles: true, detail: 1 }));
  target.dispatchEvent(new w.MouseEvent("click", { bubbles: true, detail: 2 }));
  await sleep(60);
  assert.equal(w.document.querySelectorAll(".cell.has-cat").length, 1);
  await click(w, "Undo");
  assert.equal(w.document.querySelectorAll(".cell.has-cat").length, 0);
  assert.ok(
    JSON.parse(w.localStorage.getItem("catnap.save.v1")).rewards.spent,
    "Token use is saved",
  );
  w.document.querySelector(".cell").click();
  await sleep(50);
  assert.match(
    w.document.querySelector(".cell").getAttribute("aria-label"),
    /marked X/,
  );
  w.document.querySelector('[aria-label="Settings and backups"]').click();
  await sleep(50);
  const toggle = w.document.querySelector('[aria-label="Show region numbers"]');
  toggle.click();
  await sleep(30);
  assert.equal(toggle.getAttribute("aria-checked"), "true");
  w.document.querySelector('[aria-label="Close dialog"]').click();
  await sleep(50);
  assert.equal(w.document.querySelectorAll(".region-number").length, 25);
  for (let i = 0; i < 5; i++) await click(w, "Find a cat");
  assert.match(
    w.document.querySelector('[role="dialog"]').textContent,
    /Everyone’s found a home/,
  );
  assert.match(
    w.document.querySelector(".site-footer").textContent,
    /1 \/ 120/,
  );
  assert.equal(
    new Set(
      [...w.document.querySelectorAll(".cell.has-cat svg[data-coat]")].map(
        (svg) => svg.dataset.coat,
      ),
    ).size,
    5,
    "Every region has a different colored cat",
  );
  assert.equal(
    JSON.parse(w.localStorage.getItem("catnap.save.v1")).completed["level-001"]
      .stars,
    1,
  );

  w.document.querySelector('[aria-label="Close dialog"]').click();
  await sleep(30);
  const snapshot = Object.fromEntries(
    Array.from({ length: w.localStorage.length }, (_, i) => {
      const key = w.localStorage.key(i);
      return [key, w.localStorage.getItem(key)];
    }),
  );
  dom.window.close();
  dom = await launch(snapshot);
  w = dom.window;
  assert.equal(w.document.querySelectorAll(".cell.has-cat").length, 5);
  assert.match(
    w.document.querySelector(".site-footer").textContent,
    /1 \/ 120/,
  );
  const walletBefore = JSON.parse(
    w.localStorage.getItem("catnap.save.v1"),
  ).rewards;
  w.document.querySelector('[aria-label="Gifts and helping paws"]').click();
  await sleep(40);
  await click(w, "Get a free cat assist");
  assert.equal(
    w.document.querySelector(".find-cat .token-count").textContent,
    "1",
  );
  assert.deepEqual(
    JSON.parse(w.localStorage.getItem("catnap.save.v1")).rewards.spent,
    walletBefore.spent,
  );
  await click(w, "Restart");
  await click(w, "Restart this puzzle");
  const level = JSON.parse(fs.readFileSync("lib/levels.json", "utf8"))[0];
  for (const cell of level.solution) {
    w.document
      .querySelectorAll(".cell")
      [cell].dispatchEvent(
        new w.KeyboardEvent("keydown", { key: "c", bubbles: true }),
      );
    await sleep(30);
  }
  assert.equal(w.document.querySelectorAll(".win-stars .earned").length, 3);
  assert.ok(
    w.document.querySelector(".replay-note"),
    "Replays improve stars but do not mint gifts",
  );
  assert.equal(
    w.document.querySelector(".find-cat .token-count").textContent,
    "1",
  );
  w.document.querySelector('[aria-label="Close dialog"]').click();
  await sleep(40);
  await click(w, "Your cats");
  await click(w, "GingerA little curious. A lot of fluff.Choose companion");
  assert.match(
    w.document.querySelector(".cat-option.chosen").textContent,
    /Ginger/,
  );
  w.document.querySelector('[aria-label="Close dialog"]').click();
  await sleep(30);
  await click(w, "Daily puzzle");
  assert.match(w.document.querySelector("h1").textContent, /Daily puzzle/);
  w.document.querySelector('[aria-label="Pause puzzle"]').click();
  await sleep(30);
  assert.ok(w.document.querySelector(".pause-cover"));
  await click(w, "Ready when you are");
  await click(w, "All 120 levels");
  assert.ok(
    w.document.querySelector(".map-path path"),
    "A winding map connects the levels",
  );
  assert.equal(w.document.querySelectorAll(".map-node").length, 12);
  w.document.querySelector('[aria-label="Next chapter"]').click();
  await sleep(60);
  assert.equal(w.document.querySelectorAll(".map-node").length, 24);
  assert.ok(w.document.querySelector(".map-chapter-gift"));
  await click(w, "Quick level list");
  await click(w, "120");
  assert.match(w.document.querySelector("h1").textContent, /Level 120/);
  assert.equal(w.document.querySelectorAll(".cell").length, 81);
  w.document.querySelector('[aria-label="Settings and backups"]').click();
  await sleep(30);
  await click(w, "Export save");
  assert.match(w.__downloaded, /catnap-save-.*\.json/);
  const backup = JSON.parse(w.localStorage.getItem("catnap.save.v1"));
  backup.completed["level-002"] = {
    levelId: "level-002",
    completedAt: 123,
    bestTime: 20,
  };
  backup.settings.lastLevel = "level-001";
  backup.settings.updatedAt = Date.now() + 1000;
  const input = w.document.querySelector("input[type=file]");
  Object.defineProperty(input, "files", {
    value: [{ size: 1000, text: async () => JSON.stringify(backup) }],
    configurable: true,
  });
  input.dispatchEvent(new w.Event("change", { bubbles: true }));
  await sleep(100);
  assert.match(w.document.querySelector("h1").textContent, /Level 01/);
  assert.match(
    w.document.querySelector(".site-footer").textContent,
    /2 \/ 120/,
  );
  w.document.querySelector('[aria-label="Settings and backups"]').click();
  await sleep(30);
  const badInput = w.document.querySelector("input[type=file]");
  Object.defineProperty(badInput, "files", {
    value: [{ size: 2, text: async () => "{}" }],
    configurable: true,
  });
  badInput.dispatchEvent(new w.Event("change", { bubbles: true }));
  await sleep(100);
  assert.match(
    w.document.querySelector(".toast").textContent,
    /not a valid Catnap save/,
  );
  assert.match(
    w.document.querySelector(".site-footer").textContent,
    /2 \/ 120/,
  );
  dom.window.close();
  const oldLevel = JSON.parse(fs.readFileSync("lib/levels.json", "utf8"))[0];
  const legacy = {
    version: 1,
    games: {
      "level-001:legacy-mac": {
        id: "level-001:legacy-mac",
        levelId: "level-001",
        device: "legacy-mac",
        revision: 1,
        updatedAt: 100,
        elapsed: 40,
        cats: oldLevel.solution,
        marks: [],
      },
    },
    completed: {
      "level-001": { levelId: "level-001", completedAt: 100, bestTime: 40 },
    },
    settings: {
      cat: "mochi",
      autoMark: false,
      reducedMotion: false,
      patterns: false,
      lastLevel: "level-001",
      updatedAt: 100,
    },
  };
  dom = await launch(
    {
      "catnap.save.v1": JSON.stringify(legacy),
      "catnap.device.v1": "legacy-mac",
    },
    true,
  );
  w = dom.window;
  assert.equal(
    w.document.querySelectorAll(".cell.has-cat").length,
    5,
    "Legacy solved boards survive the update",
  );
  assert.equal(
    w.document.querySelector(".game-actions button:nth-child(3) .token-count")
      .textContent,
    "11",
    "Existing completions receive their useful gift",
  );
  w.dispatchEvent(new w.Event("pagehide"));
  await sleep(30);
  assert.equal(
    JSON.parse(w.localStorage.getItem("catnap.save.v1")).completed["level-001"]
      .stars,
    undefined,
    "Reload does not invent three stars for legacy completions",
  );
  assert.deepEqual(errors, []);
  console.log(
    "UI smoke passed: single/double tap, one-step undo, region-colored cats, saved token use and free refills, stars without repeat gifts, chapter map, legacy migration, backup transfer, and original gameplay.",
  );
  dom.window.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  setTimeout(() => process.exit(1), 100);
});
