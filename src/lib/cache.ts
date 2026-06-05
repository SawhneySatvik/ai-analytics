import crypto from "node:crypto";
import fsp from "node:fs/promises";

import { listTranscriptFiles, buildSnapshot } from "./ingest";
import { HISTORY_FILE } from "./paths";
import type { Snapshot } from "./types";

// Module-level singleton. In the Next.js Node runtime this persists across
// requests within a server instance, so we parse ~/.claude once and reuse it
// until the files actually change (or a manual refresh forces a rebuild).
let cached: { sig: string; snapshot: Snapshot } | null = null;
let building: Promise<Snapshot> | null = null;

async function computeSignature(files: string[]): Promise<string> {
  const h = crypto.createHash("sha1");
  for (const f of [...files].sort()) {
    try {
      const s = await fsp.stat(f);
      h.update(f).update(String(s.mtimeMs)).update(String(s.size));
    } catch {
      /* file vanished between list and stat — ignore */
    }
  }
  try {
    const s = await fsp.stat(HISTORY_FILE);
    h.update("history").update(String(s.mtimeMs)).update(String(s.size));
  } catch {
    /* no history file */
  }
  return h.digest("hex");
}

/**
 * Return the current snapshot, rebuilding only when the file signature changed
 * (or `force` is set). Concurrent callers during a first build share one parse.
 */
export async function getSnapshot(force = false): Promise<Snapshot> {
  const files = await listTranscriptFiles();
  const sig = await computeSignature(files);

  if (!force && cached && cached.sig === sig) return cached.snapshot;
  if (!force && building) return building;

  const p = buildSnapshot(files)
    .then((snap) => {
      cached = { sig, snapshot: snap };
      if (building === p) building = null;
      return snap;
    })
    .catch((err) => {
      if (building === p) building = null;
      throw err;
    });
  building = p;
  return p;
}

export function peekCachedSnapshot(): Snapshot | null {
  return cached?.snapshot ?? null;
}
