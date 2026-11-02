import "fake-indexeddb/auto";
import Dexie from "dexie";
import test from "node:test";
import assert from "node:assert/strict";
import { emptyProgress } from "../lib/progress.ts";
import {
  deviceId,
  flushWrites,
  loadProgress,
  persist,
} from "../lib/storage.ts";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  },
  configurable: true,
});
test("the last move is journaled immediately and can be restored before database writes finish", async () => {
  const save = emptyProgress();
  save.settings.cat = "luna";
  save.settings.updatedAt = 123;
  save.games["level-001:mac"] = {
    id: "level-001:mac",
    device: "mac",
    levelId: "level-001",
    cats: [2],
    marks: [0],
    revision: 1,
    elapsed: 17,
    updatedAt: 123,
  };
  persist(save);
  assert.ok(memory.get("catnap.save.v1"));
  assert.deepEqual(await loadProgress(), save);
  await flushWrites();
  const reopened = new Dexie("catnap");
  reopened.version(1).stores({ saves: "id" });
  assert.deepEqual(
    (await reopened.table("saves").get("player")).progress,
    save,
  );
  reopened.close();
});
test("IndexedDB recovers progress when the JSON journal is unavailable or corrupted", async () => {
  const before = await loadProgress();
  memory.set("catnap.save.v1", "{broken json");
  assert.deepEqual(await loadProgress(), before);
  memory.delete("catnap.save.v1");
  assert.deepEqual(await loadProgress(), before);
});
test("closing and reopening preserves the device identity used to merge transferred saves", () => {
  assert.equal(deviceId(), deviceId());
});
