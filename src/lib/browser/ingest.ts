// Public browser-ingest API used by the static client. Runs on the main thread
// (file reads are async I/O, so the UI stays responsive and progress streams per
// file); a Web Worker is a possible future optimization.

import type { Snapshot } from "../types";
import {
  filesToSourceFiles,
  ingestSourceFiles,
  walkDirectory,
  type ProgressFn,
  type SourceFile,
} from "./loaders";

export type { IngestProgress, ProgressFn, SourceFile } from "./loaders";

/** Build a Snapshot from an already-collected list of source files. */
export function ingestFromSourceFiles(files: SourceFile[], onProgress?: ProgressFn): Promise<Snapshot> {
  return ingestSourceFiles(files, onProgress);
}

/** True when the File System Access directory picker is available (Chromium). */
export function supportsDirectoryPicker(): boolean {
  return typeof window !== "undefined" && typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
}

/** Build a Snapshot from a granted directory handle. */
export async function ingestFromHandle(handle: FileSystemDirectoryHandle, onProgress?: ProgressFn): Promise<Snapshot> {
  const files = await walkDirectory(handle, onProgress);
  return ingestSourceFiles(files, onProgress);
}

/** Build a Snapshot from uploaded files (drag-drop or <input webkitdirectory>). */
export async function ingestFromFiles(files: File[] | FileList, onProgress?: ProgressFn): Promise<Snapshot> {
  return ingestSourceFiles(filesToSourceFiles(files), onProgress);
}

/** Show the directory picker and return the granted handle (Chromium only). */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  const picker = (window as unknown as {
    showDirectoryPicker: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker;
  return picker({ mode: "read" });
}

/** Load the bundled synthetic demo snapshot (public/demo-snapshot.json). */
export async function loadDemoSnapshot(): Promise<Snapshot> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const res = await fetch(`${base}/demo-snapshot.json`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to load demo data (${res.status})`);
  return (await res.json()) as Snapshot;
}
