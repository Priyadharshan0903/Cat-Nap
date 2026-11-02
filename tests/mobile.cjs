const { launch, click, sleep, errors } = require("./harness.cjs");
const assert = require("node:assert/strict"), fs = require("node:fs");
const level = JSON.parse(fs.readFileSync("lib/levels.json", "utf8"))[0];
const active = (w) => Object.values(JSON.parse(w.localStorage.getItem("catnap.save.v1")).games).sort((a, b) => b.updatedAt - a.updatedAt)[0];

// Model a direct-touch browser: it captures implicitly to the starting tile.
// A transfer must deliver lostpointercapture from the old target, bubbling to the board.
function touchBrowser(w) {
  const grid = w.document.querySelector(".puzzle-board"), cells = [...w.document.querySelectorAll(".cell")];
  const captures = new Map();
  grid.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 300 });
  function event(target, type, id, x = 30, y = 30, detail = 0) {
    const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y, detail });
    Object.defineProperties(e, { pointerId: { value: id }, pointerType: { value: "touch" }, isPrimary: { value: true } });
    target.dispatchEvent(e);
  }
  for (const element of [grid, ...cells]) {
    element.setPointerCapture = (id) => {
      const old = captures.get(id);
      if (old === element) return;
      captures.set(id, element);
      if (old) event(old, "lostpointercapture", id);
      event(element, "gotpointercapture", id);
    };
    element.hasPointerCapture = (id) => captures.get(id) === element;
  }
  function down(cell, id = 41) {
    captures.set(id, cells[cell]);
    event(cells[cell], "pointerdown", id, (cell % 5) * 60 + 30, Math.floor(cell / 5) * 60 + 30);
  }
  function move(x, y, id = 41) { event(captures.get(id) ?? grid, "pointermove", id, x, y); }
  function up(x = 30, y = 30, id = 41) {
    const target = captures.get(id) ?? grid;
    event(target, "pointerup", id, x, y);
    captures.delete(id);
    event(target, "lostpointercapture", id, x, y);
  }
  function nativeClick(cell) { event(cells[cell], "click", 41); }
  return { grid, cells, captures, event, down, move, up, nativeClick };
}

(async () => {
  const dom = await launch({}, true), w = dom.window;
  const touch = touchBrowser(w);
  const cat = level.solution[0];
  touch.cells[cat].dispatchEvent(new w.KeyboardEvent("keydown", { key: "c", bubbles: true }));
  const existingX = cat === 1 ? 2 : 1;
  touch.cells[existingX].dispatchEvent(new w.KeyboardEvent("keydown", { key: "x", bubbles: true }));
  await sleep(30);
  const before = active(w);
  touch.down(0);
  touch.move(150, 30);
  assert.equal(touch.captures.get(41) === touch.cells[0], true, "Touch capture stays on the starting tile; moving must not cancel the stroke");
  // Lost capture/cancellation from another finger or target must not cancel this swipe.
  touch.event(touch.cells[0], "lostpointercapture", 99);
  touch.event(touch.cells[0], "pointercancel", 99);
  touch.event(touch.cells[5], "lostpointercapture", 41);
  touch.move(270, 30);
  await sleep(20);
  assert.deepEqual(active(w).marks, before.marks, "Touch strokes preview without writing partial saves");
  touch.move(350, 30); // The captured finger can leave the board before lifting.
  touch.up(350, 30);
  touch.nativeClick(0); // A compatibility click with detail=0 must not toggle a painted square.
  await sleep(30);
  const painted = active(w);
  assert.deepEqual(painted.cats, before.cats, "Swiping preserves cats");
  const expected = [...new Set([...before.marks, ...[0, 1, 2, 3, 4].filter((c) => c !== cat)])].sort((a, b) => a - b);
  assert.deepEqual([...painted.marks].sort((a, b) => a - b), expected, "Captured touch events paint all crossed cells and survive the release click");
  touch.down(0);
  touch.move(270, 30);
  touch.move(30, 30);
  touch.up();
  touch.nativeClick(0);
  await sleep(20);
  assert.deepEqual(active(w).marks, [], "Dragging from X erases the crossed marks without re-marking on the return pass");
  assert.deepEqual(active(w).cats, before.cats, "Erase strokes preserve cats");
  await click(w, "Undo");
  assert.deepEqual([...active(w).marks].sort((a, b) => a - b), expected, "An entire erase swipe is one Undo step");
  await click(w, "Undo");
  assert.deepEqual(active(w).marks, before.marks, "A mobile swipe is one Undo step");
  touch.down(5);
  touch.move(270, 90);
  touch.event(touch.cells[5], "pointercancel", 41);
  touch.up(270, 90);
  touch.nativeClick(5);
  await sleep(30);
  assert.deepEqual(active(w).marks, before.marks, "A genuine mobile cancellation discards the preview and suppresses its compatibility click");
  touch.down(13); touch.up(210, 150); touch.nativeClick(13);
  await sleep(20);
  assert.ok(active(w).marks.includes(13), "A new finger tap works after cancellation");
  touch.down(13); touch.up(210, 150); touch.nativeClick(13);
  await sleep(30);
  assert.ok(active(w).cats.includes(13), "Touch clicks with detail=0 still support double-tap cats");
  await click(w, "Undo");
  assert.deepEqual(active(w).cats, before.cats);
  assert.deepEqual(active(w).marks, before.marks, "Undo restores the state before the complete double tap");
  assert.deepEqual(errors, []);
  dom.window.close();
  console.log("Mobile input regression passed: implicit capture, captured tile moves, capture-loss ordering, release outside the board, cancellation, compatibility clicks, single/double taps, drag erasing, protected cats, and one-step Undo.");
})().catch((error) => { console.error(error); process.exitCode = 1; setTimeout(() => process.exit(1), 100); });
