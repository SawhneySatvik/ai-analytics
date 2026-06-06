"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Snapshot } from "@/lib/types";
import {
  ingestFromFiles,
  ingestFromHandles,
  ingestFromSourceFiles,
  loadDemoSnapshot,
  pickDirectory,
  supportsDirectoryPicker,
  type IngestProgress,
  type SourceFile,
} from "@/lib/browser/ingest";
import { clearHandles, ensureReadPermission, loadHandles, saveHandles } from "@/lib/browser/idb";
import { revalidateAll, setLocalResolver } from "@/lib/dataCache";
import { resolveLocal } from "@/lib/staticResolve";
import { Landing } from "@/components/Landing";

/** Compile-time flag — true only in the hosted, browser-ingest build target. */
export const STATIC_MODE = process.env.NEXT_PUBLIC_STATIC_MODE === "1";

export type SnapshotStatus = "idle" | "restoring" | "ingesting" | "ready" | "error";
export type DataSource = "folder" | "upload" | "demo" | null;

export interface SnapshotCtx {
  mode: "ssr" | "static";
  status: SnapshotStatus;
  error: string | null;
  progress: IngestProgress | null;
  source: DataSource;
  snapshot: Snapshot | null;
  canPickDirectory: boolean;
  /** Number of connected local folders (0 unless source === "folder"). */
  folderCount: number;
  connectFolder: () => Promise<void>;
  /** Connect an additional folder and merge it with the current data. */
  addFolder: () => Promise<void>;
  uploadFiles: (files: File[] | FileList) => Promise<void>;
  dropSourceFiles: (files: SourceFile[]) => Promise<void>;
  loadDemo: () => Promise<void>;
  refresh: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const Ctx = createContext<SnapshotCtx | null>(null);
const HANDLE_KEY = "data-dir";

// In the local SSR build the provider is inert — data comes from /api/*.
const SSR_STUB: SnapshotCtx = {
  mode: "ssr",
  status: "ready",
  error: null,
  progress: null,
  source: null,
  snapshot: null,
  canPickDirectory: false,
  folderCount: 0,
  connectFolder: async () => {},
  addFolder: async () => {},
  uploadFiles: async () => {},
  dropSourceFiles: async () => {},
  loadDemo: async () => {},
  refresh: async () => {},
  disconnect: async () => {},
};

function errMsg(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

const NO_DATA =
  "No Claude or Codex usage found in that folder. In the picker, use your file dialog's “go to folder” shortcut to jump straight to ~/.claude (or ~/.codex) — or pick your home folder and we'll find the hidden .claude / .codex inside.";

/** Reject empty ingests so we show guidance instead of a blank dashboard. */
function requireData(snap: Snapshot): Snapshot {
  if (snap.messages.length === 0) throw new Error(NO_DATA);
  return snap;
}

function StaticSnapshotProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SnapshotStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<IngestProgress | null>(null);
  const [source, setSource] = useState<DataSource>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  // Resolved after mount so the prerendered shell (always false on the server)
  // and the first client render agree — avoids a hydration mismatch.
  const [canPick, setCanPick] = useState(false);
  const [folderCount, setFolderCount] = useState(0);
  // All connected folder handles (the picker grants one per call; we merge them).
  const handlesRef = useRef<FileSystemDirectoryHandle[]>([]);

  useEffect(() => setCanPick(supportsDirectoryPicker()), []);

  const onProgress = useCallback((p: IngestProgress) => setProgress(p), []);

  const setHandles = useCallback((hs: FileSystemDirectoryHandle[]) => {
    handlesRef.current = hs;
    setFolderCount(hs.length);
  }, []);

  // Install a snapshot: wire the local resolver SYNCHRONOUSLY (before children
  // mount and run their revalidate effects) so cached queries resolve on-device.
  const install = useCallback((snap: Snapshot, src: DataSource) => {
    setLocalResolver(async (url) => resolveLocal(url, snap));
    revalidateAll();
    setSnapshot(snap);
    setSource(src);
    setError(null);
    setProgress(null);
    setStatus("ready");
  }, []);

  // Pick a folder and ingest. `mode: "replace"` starts a fresh connection;
  // `mode: "add"` merges the new folder with the already-connected ones.
  const pickAndIngest = useCallback(
    async (mode: "replace" | "add") => {
      let handle: FileSystemDirectoryHandle;
      try {
        handle = await pickDirectory();
      } catch (err) {
        // user dismissed the picker — stay where we were
        if ((err as DOMException)?.name === "AbortError") return;
        setError(errMsg(err, "Couldn't open the folder picker."));
        setStatus("error");
        return;
      }
      // ignore re-picking a folder that's already connected
      if (mode === "add") {
        for (const h of handlesRef.current) {
          if (await h.isSameEntry?.(handle)) return;
        }
      }
      try {
        setStatus("ingesting");
        setProgress(null);
        if (!(await ensureReadPermission(handle))) throw new Error("Read permission was denied.");
        const next = mode === "add" ? [...handlesRef.current, handle] : [handle];
        const snap = requireData(await ingestFromHandles(next, onProgress));
        setHandles(next);
        await saveHandles(HANDLE_KEY, next);
        install(snap, "folder");
      } catch (err) {
        setError(errMsg(err, "Couldn't read that folder."));
        setStatus("error");
      }
    },
    [install, onProgress, setHandles],
  );

  const connectFolder = useCallback(() => pickAndIngest("replace"), [pickAndIngest]);
  const addFolder = useCallback(() => pickAndIngest("add"), [pickAndIngest]);

  const uploadFiles = useCallback(
    async (files: File[] | FileList) => {
      try {
        setStatus("ingesting");
        setProgress(null);
        const snap = requireData(await ingestFromFiles(files, onProgress));
        setHandles([]);
        install(snap, "upload");
      } catch (err) {
        setError(errMsg(err, "Couldn't read those files."));
        setStatus("error");
      }
    },
    [install, onProgress, setHandles],
  );

  const dropSourceFiles = useCallback(
    async (files: SourceFile[]) => {
      try {
        setStatus("ingesting");
        setProgress(null);
        const snap = requireData(await ingestFromSourceFiles(files, onProgress));
        setHandles([]);
        install(snap, "upload");
      } catch (err) {
        setError(errMsg(err, "Couldn't read those files."));
        setStatus("error");
      }
    },
    [install, onProgress, setHandles],
  );

  const loadDemo = useCallback(async () => {
    try {
      setStatus("ingesting");
      setProgress(null);
      const snap = await loadDemoSnapshot();
      setHandles([]);
      install(snap, "demo");
    } catch (err) {
      setError(errMsg(err, "Couldn't load the demo data."));
      setStatus("error");
    }
  }, [install, setHandles]);

  const refresh = useCallback(async () => {
    try {
      if (source === "folder" && handlesRef.current.length) {
        setStatus("ingesting");
        for (const h of handlesRef.current) {
          if (!(await ensureReadPermission(h))) throw new Error("Read permission was denied.");
        }
        install(requireData(await ingestFromHandles(handlesRef.current, onProgress)), "folder");
      } else if (source === "demo") {
        install(await loadDemoSnapshot(), "demo");
      }
      // uploaded files can't be re-read without a fresh selection — no-op
    } catch (err) {
      setError(errMsg(err, "Couldn't refresh the data."));
      setStatus("error");
    }
  }, [source, install, onProgress]);

  const disconnect = useCallback(async () => {
    await clearHandles();
    setHandles([]);
    setLocalResolver(null);
    setSnapshot(null);
    setSource(null);
    setError(null);
    setProgress(null);
    setStatus("idle");
  }, [setHandles]);

  // restore previously granted folder handles on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const handles = await loadHandles(HANDLE_KEY);
      if (!handles.length || cancelled) return;
      try {
        setStatus("restoring");
        const ok: FileSystemDirectoryHandle[] = [];
        for (const h of handles) {
          if (await ensureReadPermission(h)) ok.push(h);
        }
        if (!ok.length) {
          if (!cancelled) setStatus("idle");
          return;
        }
        setStatus("ingesting");
        const snap = requireData(await ingestFromHandles(ok, onProgress));
        if (cancelled) return;
        setHandles(ok);
        if (ok.length !== handles.length) await saveHandles(HANDLE_KEY, ok); // prune revoked
        install(snap, "folder");
      } catch {
        if (!cancelled) setStatus("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [install, onProgress, setHandles]);

  const value = useMemo<SnapshotCtx>(
    () => ({
      mode: "static",
      status,
      error,
      progress,
      source,
      snapshot,
      canPickDirectory: canPick,
      folderCount,
      connectFolder,
      addFolder,
      uploadFiles,
      dropSourceFiles,
      loadDemo,
      refresh,
      disconnect,
    }),
    [status, error, progress, source, snapshot, canPick, folderCount, connectFolder, addFolder, uploadFiles, dropSourceFiles, loadDemo, refresh, disconnect],
  );

  return (
    <Ctx.Provider value={value}>
      {status === "ready" && snapshot ? children : <Landing />}
    </Ctx.Provider>
  );
}

export function SnapshotProvider({ children }: { children: React.ReactNode }) {
  // STATIC_MODE is a compile-time constant, so exactly one branch exists per
  // build — no conditional-hooks hazard.
  if (!STATIC_MODE) {
    return <Ctx.Provider value={SSR_STUB}>{children}</Ctx.Provider>;
  }
  return <StaticSnapshotProvider>{children}</StaticSnapshotProvider>;
}

export function useSnapshot(): SnapshotCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSnapshot must be used within SnapshotProvider");
  return ctx;
}
