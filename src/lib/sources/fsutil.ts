import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

/** Recursively collect every file path under `dir` (missing dir → []). */
export async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}
