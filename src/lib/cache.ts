import crypto from "node:crypto";
import fsp from "node:fs/promises";

import { buildSnapshot } from "./ingest";
import { getEnabledLoaders } from "./sources";
import { enabledSources } from "./paths";
import type { DiscoverResult } from "./sources/types";
import type { Snapshot } from "./types";

// Module-level singleton. In the Next.js Node runtime this persists across
// requests within a server instance, so we parse the data dirs once and reuse
// the result until the files actually change (or a manual refresh forces a
// rebuild).
let cached: { sig: string; snapshot: Snapshot } | null = null;
let building: Promise<Snapshot> | null = null;

async function computeSignature(discovered: DiscoverResult[]): Promise<string> {
  const h = crypto.createHash("sha1");
  // Salt with the enabled-sources set so toggling ANALYTICS_SOURCES busts the cache.
  h.update("sources:").update(enabledSources().join(","));

  const sigPaths = discovered.flatMap((d) => d.sigPaths).sort();
  for (const f of sigPaths) {
    try {
      const s = await fsp.stat(f);
      h.update(f).update(String(s.mtimeMs)).update(String(s.size));
    } catch {
      /* file vanished between list and stat — ignore */
    }
  }

  const histPaths = discovered.flatMap((d) => d.historyPaths).sort();
  for (const f of histPaths) {
    try {
      const s = await fsp.stat(f);
      h.update("hist").update(f).update(String(s.mtimeMs)).update(String(s.size));
    } catch {
      /* no such history file */
    }
  }
  return h.digest("hex");
}

/**
 * Return the current snapshot, rebuilding only when the file signature changed
 * (or `force` is set). Concurrent callers during a first build share one parse.
 */
export async function getSnapshot(force = false): Promise<Snapshot> {
  const loaders = getEnabledLoaders();
  const discovered = await Promise.all(loaders.map((l) => l.discover()));
  const sig = await computeSignature(discovered);

  if (!force && cached && cached.sig === sig) return cached.snapshot;
  if (!force && building) return building;

  const p = buildSnapshot(discovered)
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
