import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProgress,
  mergeProgress,
  validProgress,
  saveForLevel,
  type GameSave,
} from "../lib/progress.ts";

const game = (device: string, revision: number, cats = [2]): GameSave => ({
  id: `level-001:${device}`,
  levelId: "level-001",
  device,
  revision,
  cats,
  marks: [0],
  updatedAt: revision * 1000,
  elapsed: 12,
});
test("exported JSON round-trips without losing a board, settings, or completion", () => {
  const p = emptyProgress(),
    g = game("mac", 1);
  p.games[g.id] = g;
  p.completed["level-002"] = {
    levelId: "level-002",
    completedAt: 42,
    bestTime: 27,
  };
  p.settings.cat = "ginger";
  const imported: unknown = JSON.parse(JSON.stringify(p));
  assert.ok(validProgress(imported));
  assert.deepEqual(imported, p);
});
test("import combines achievements, keeps the best time, and preserves both devices’ boards", () => {
  const mac = emptyProgress(),
    phone = emptyProgress();
  const a = game("mac", 2),
    b = game("iphone", 3, [4]);
  mac.games[a.id] = a;
  phone.games[b.id] = b;
  mac.completed["level-001"] = {
    levelId: "level-001",
    completedAt: 100,
    bestTime: 30,
  };
  phone.completed["level-001"] = {
    levelId: "level-001",
    completedAt: 200,
    bestTime: 25,
  };
  phone.completed["level-002"] = {
    levelId: "level-002",
    completedAt: 300,
    bestTime: 60,
  };
  const result = mergeProgress(mac, phone);
  assert.equal(Object.keys(result.games).length, 2);
  assert.equal(Object.keys(result.completed).length, 2);
  assert.deepEqual(result.completed["level-001"], {
    levelId: "level-001",
    completedAt: 100,
    bestTime: 25,
  });
  assert.deepEqual(
    mergeProgress(result, phone),
    result,
    "importing the same backup twice is safe",
  );
  assert.equal(saveForLevel(result, "level-001", "mac")?.device, "iphone");
});
test("an older backup cannot overwrite a newer save from the same device", () => {
  const current = emptyProgress(),
    backup = emptyProgress();
  const a = game("mac", 7),
    b = game("mac", 2, [4]);
  current.games[a.id] = a;
  backup.games[b.id] = b;
  assert.deepEqual(mergeProgress(current, backup).games[a.id], a);
});
test("malformed imports cannot replace progress", () => {
  for (const value of [
    null,
    [],
    {},
    { ...emptyProgress(), version: 99 },
    { ...emptyProgress(), settings: { cat: "unknown" } },
  ])
    assert.equal(validProgress(value), false);
  const p = emptyProgress(),
    g = game("mac", 1);
  p.games[g.id] = { ...g, cats: [0], marks: [0] };
  assert.equal(validProgress(p), false);
  p.games[g.id] = { ...g, revision: -1 };
  assert.equal(validProgress(p), false);
  p.games[g.id] = { ...g, cats: [NaN] };
  assert.equal(validProgress(p), false);
  const unsafe = JSON.parse(JSON.stringify(emptyProgress()));
  unsafe.games.constructor = g;
  assert.equal(validProgress(unsafe), false);
});
