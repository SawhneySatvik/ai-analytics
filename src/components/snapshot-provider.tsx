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
  ingestFromHandle,
  ingestFromSourceFiles,
  loadDemoSnapshot,
  pickDirectory,
  supportsDirectoryPicker,
  type IngestProgress,
  type SourceFile,
} from "@/lib/browser/ingest";
import { clearHandles, ensureReadPermission, loadHandle, saveHandle } from "@/lib/browser/idb";
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
  connectFolder: () => Promise<void>;
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
  connectFolder: async () => {},
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
  "No Claude or Codex usage found there. Pick your home folder (we'll find the hidden .claude / .codex inside it) or select the .claude folder directly.";

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
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null);

  useEffect(() => setCanPick(supportsDirectoryPicker()), []);

  const onProgress = useCallback((p: IngestProgress) => setProgress(p), []);

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

  const connectFolder = useCallback(async () => {
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
    try {
      setStatus("ingesting");
      setProgress(null);
      if (!(await ensureReadPermission(handle))) throw new Error("Read permission was denied.");
      const snap = requireData(await ingestFromHandle(handle, onProgress));
      handleRef.current = handle;
      await saveHandle(HANDLE_KEY, handle);
      install(snap, "folder");
    } catch (err) {
      setError(errMsg(err, "Couldn't read that folder."));
      setStatus("error");
    }
  }, [install, onProgress]);

  const uploadFiles = useCallback(
    async (files: File[] | FileList) => {
      try {
        setStatus("ingesting");
        setProgress(null);
        const snap = requireData(await ingestFromFiles(files, onProgress));
        handleRef.current = null;
        install(snap, "upload");
      } catch (err) {
        setError(errMsg(err, "Couldn't read those files."));
        setStatus("error");
      }
    },
    [install, onProgress],
  );

  const dropSourceFiles = useCallback(
    async (files: SourceFile[]) => {
      try {
        setStatus("ingesting");
        setProgress(null);
        const snap = requireData(await ingestFromSourceFiles(files, onProgress));
        handleRef.current = null;
        install(snap, "upload");
      } catch (err) {
        setError(errMsg(err, "Couldn't read those files."));
        setStatus("error");
      }
    },
    [install, onProgress],
  );

  const loadDemo = useCallback(async () => {
    try {
      setStatus("ingesting");
      setProgress(null);
      const snap = await loadDemoSnapshot();
      handleRef.current = null;
      install(snap, "demo");
    } catch (err) {
      setError(errMsg(err, "Couldn't load the demo data."));
      setStatus("error");
    }
  }, [install]);

  const refresh = useCallback(async () => {
    try {
      if (source === "folder" && handleRef.current) {
        setStatus("ingesting");
        if (!(await ensureReadPermission(handleRef.current))) throw new Error("Read permission was denied.");
        install(requireData(await ingestFromHandle(handleRef.current, onProgress)), "folder");
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
    handleRef.current = null;
    setLocalResolver(null);
    setSnapshot(null);
    setSource(null);
    setError(null);
    setProgress(null);
    setStatus("idle");
  }, []);

  // restore a previously granted folder handle on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const handle = await loadHandle(HANDLE_KEY);
      if (!handle || cancelled) return;
      try {
        setStatus("restoring");
        if (!(await ensureReadPermission(handle))) {
          if (!cancelled) setStatus("idle");
          return;
        }
        setStatus("ingesting");
        const snap = requireData(await ingestFromHandle(handle, onProgress));
        if (cancelled) return;
        handleRef.current = handle;
        install(snap, "folder");
      } catch {
        if (!cancelled) setStatus("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [install, onProgress]);

  const value = useMemo<SnapshotCtx>(
    () => ({
      mode: "static",
      status,
      error,
      progress,
      source,
      snapshot,
      canPickDirectory: canPick,
      connectFolder,
      uploadFiles,
      dropSourceFiles,
      loadDemo,
      refresh,
      disconnect,
    }),
    [status, error, progress, source, snapshot, canPick, connectFolder, uploadFiles, dropSourceFiles, loadDemo, refresh, disconnect],
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
