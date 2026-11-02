import test from "node:test";
import assert from "node:assert/strict";
import { emptyProgress, validProgress } from "../lib/progress.ts";
import { parseBackup, readBackupFile, MAX_BACKUP_BYTES } from "../lib/backup.ts";

test("new preferences and legacy saves both round trip, including UTF-8 BOM files", () => {
  const p = emptyProgress();
  p.settings.theme = "night";
  p.settings.dragMark = false;
  assert.deepEqual(parseBackup("\uFEFF" + JSON.stringify(p)), p);
  delete p.settings.theme;
  delete p.settings.dragMark;
  assert.ok(validProgress(p));
  assert.deepEqual(parseBackup(JSON.stringify(p)), p);
  for (const theme of ["broken", false, null])
    assert.equal(validProgress({ ...p, settings: { ...p.settings, theme } }), false);
});
test("backup import rejects invalid JSON, unknown levels, and out-of-board cells", () => {
  assert.throws(() => parseBackup("bad"), /readable JSON/);
  assert.throws(() => parseBackup("{}"), /not a valid Catnap save/);
  const p = emptyProgress();
  p.settings.lastLevel = "level-999";
  assert.throws(() => parseBackup(JSON.stringify(p)), /unknown level/);
  p.settings.lastLevel = "daily-2026-99-99";
  assert.throws(() => parseBackup(JSON.stringify(p)), /unknown level/);
  p.settings.lastLevel = "level-001";
  p.games["level-001:mac"] = { id: "level-001:mac", levelId: "level-001", device: "mac", revision: 1, elapsed: 0, updatedAt: 1, cats: [], marks: [25] };
  assert.throws(() => parseBackup(JSON.stringify(p)), /invalid board/);
});
test("oversize and unreadable files fail before changing progress", async () => {
  await assert.rejects(readBackupFile({ size: MAX_BACKUP_BYTES + 1 } as File), /too large/);
  await assert.rejects(readBackupFile({ size: 10, text: async () => { throw new Error("file unavailable"); } } as unknown as File), /file unavailable/);
});
