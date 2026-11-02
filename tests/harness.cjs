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
async function launch(saved = {}, isolated = false, clock) {
  const dom = new JSDOM(html, {
    url: "http://localhost:8765/catnap/game/dist/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  if (clock) {
    let now = clock.now;
    w.Date.now = () => now;
    w.__setNow = (value) => { now = value; };
  }
  w.indexedDB = isolated ? new IDBFactory() : indexedDB;
  w.IDBKeyRange = IDBKeyRange;
  w.structuredClone = structuredClone;
  const mediaChanges = new Set();
  w.__systemDark = false;
  w.__setSystemDark = (dark) => { w.__systemDark = dark; for (const fn of mediaChanges) fn(); };
  w.matchMedia = (q) => ({
    get matches() { return w.__systemDark && q.includes("prefers-color-scheme"); },
    media: q,
    addListener() {},
    removeListener() {},
    addEventListener(type, fn) { if (type === "change") mediaChanges.add(fn); },
    removeEventListener(type, fn) { if (type === "change") mediaChanges.delete(fn); },
  });
  w.Element.prototype.scrollIntoView = function (options) { w.__lastScroll = { className: this.className, options }; };
  w.URL.createObjectURL = (blob) => { w.__backupBlob = blob; return "blob:backup"; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {
    w.__downloaded = this.download;
    w.__downloadAttached = this.isConnected;
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
module.exports = { launch, click, textButton, sleep, errors };
