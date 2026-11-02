import { getPuzzle } from "./catalog.ts";
import { validProgress, type Progress } from "./progress.ts";

export const MAX_BACKUP_BYTES = 16 * 1024 * 1024;
export function parseBackup(text: string): Progress {
  let value: unknown;
  try { value = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch { throw new Error("This file is not readable JSON. Choose a Catnap .json backup."); }
  if (!validProgress(value))
    throw new Error("That is not a valid Catnap save. Your progress is unchanged.");
  for (const game of Object.values(value.games)) {
    const level = getPuzzle(game.levelId);
    if (!level || [...game.cats, ...game.marks].some((c) => c >= level.size ** 2))
      throw new Error("This save contains an unknown level or invalid board.");
  }
  if (!getPuzzle(value.settings.lastLevel) || Object.keys(value.completed).some((id) => !getPuzzle(id)))
    throw new Error("This save contains an unknown level.");
  return value;
}

/** File.text is missing in some file-picker environments; FileReader also reads iCloud files. */
export function readBackupFile(file: File): Promise<string> {
  if (file.size > MAX_BACKUP_BYTES) return Promise.reject(new Error("This save is too large (maximum 16 MB)."));
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this file. Download it to your device and try again."));
    reader.onabort = () => reject(new Error("Reading the backup was cancelled."));
    reader.readAsText(file);
  });
}

export function downloadBackup(progress: Progress, filename: string) {
  const text = JSON.stringify(progress, null, 2);
  const file = new Blob([text], { type: "application/json" });
  if (file.size > MAX_BACKUP_BYTES) throw new Error("This backup exceeds the 16 MB import limit. Your local saves are still safe.");
  parseBackup(text);
  const url = URL.createObjectURL(file), anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  try { anchor.click(); }
  finally {
    anchor.remove();
    // Give Safari time to hand the blob to its download manager.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
