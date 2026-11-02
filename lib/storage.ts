import Dexie, { type Table } from "dexie";
import {
  emptyProgress,
  mergeProgress,
  validProgress,
  type Progress,
} from "./progress.ts";

const KEY = "catnap.save.v1";
const DEVICE = "catnap.device.v1";
type SaveDatabase = Dexie & {
  saves: Table<{ id: string; progress: Progress }>;
};
let db: SaveDatabase | undefined;
function database() {
  if (!db) {
    db = new Dexie("catnap") as SaveDatabase;
    db.version(1).stores({ saves: "id" });
  }
  return db!;
}
let writes = Promise.resolve();
export function persist(progress: Progress): Promise<boolean> {
  // A small synchronous journal catches the last move even when the tab closes immediately.
  let journalSaved = false;
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
    journalSaved = true;
  } catch {
    /* IndexedDB is the fallback. */
  }
  writes = writes
    .catch(() => {})
    .then(async () => {
      await database().saves.put({ id: "player", progress });
    });
  return writes.then(
    () => true,
    () => journalSaved,
  );
}
export async function loadProgress(): Promise<Progress> {
  let progress = emptyProgress();
  try {
    const text = localStorage.getItem(KEY);
    if (text) {
      const parsed: unknown = JSON.parse(text);
      if (validProgress(parsed)) progress = parsed;
    }
  } catch {
    /* Keep the independent IndexedDB copy. */
  }
  try {
    const record = await database().saves.get("player");
    if (record && validProgress(record.progress))
      progress = mergeProgress(progress, record.progress);
  } catch {
    /* Journal works without IndexedDB. */
  }
  return progress;
}
export function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE);
    if (!id || !/^[a-z0-9-]{1,80}$/.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
export async function storageWorks() {
  try {
    localStorage.setItem("catnap.probe", "1");
    localStorage.removeItem("catnap.probe");
    return true;
  } catch {
    /* Try IDB. */
  }
  try {
    await database().saves.get("player");
    return true;
  } catch {
    return false;
  }
}
export async function flushWrites() {
  await writes;
}
