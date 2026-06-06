// Turn a drag-and-drop DataTransfer into SourceFiles, traversing dropped folders
// (webkitGetAsEntry) so a dropped ~/.claude or ~/.codex keeps its paths. Falls
// back to the flat file list when the entries API is unavailable.

import type { SourceFile } from "./loaders";

const isData = (name: string) => name.endsWith(".jsonl") || name.endsWith(".meta.json");

async function walk(entry: FileSystemEntry, path: string, out: SourceFile[]): Promise<void> {
  if (entry.isFile) {
    if (!isData(entry.name)) return;
    const fileEntry = entry as FileSystemFileEntry;
    out.push({
      relPath: path,
      read: () => new Promise<File>((res, rej) => fileEntry.file(res, rej)).then((f) => f.text()),
    });
    return;
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries returns the directory in batches; call until it returns empty.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
    if (!batch.length) break;
    for (const child of batch) await walk(child, `${path}/${child.name}`, out);
  }
}

export async function sourceFilesFromDataTransfer(dt: DataTransfer): Promise<SourceFile[]> {
  const items = Array.from(dt.items ?? []);
  const entries = items
    .map((it) => it.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => Boolean(e));

  if (entries.length) {
    const out: SourceFile[] = [];
    for (const e of entries) await walk(e, e.name, out);
    return out;
  }

  // no entries API — use the flat file list
  return Array.from(dt.files)
    .filter((f) => isData(f.name))
    .map((f) => ({ relPath: f.name, read: () => f.text() }));
}
