"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  FolderOpen,
  Loader2,
  Play,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { useSnapshot } from "@/components/snapshot-provider";
import { sourceFilesFromDataTransfer } from "@/lib/browser/dropzone";
import { cn } from "@/lib/utils";

function ProgressView() {
  const { status, progress } = useSnapshot();
  const label = status === "restoring" ? "Reconnecting to your folder…" : "Reading your usage on-device…";
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null;
  return (
    <div className="space-y-4 text-center">
      <Loader2 className="mx-auto h-7 w-7 animate-spin text-accent" />
      <div className="text-sm font-medium text-fg">{label}</div>
      {progress && progress.total > 0 && (
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-elev">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="font-mono text-[11px] text-fg-muted">
            {progress.done.toLocaleString()} / {progress.total.toLocaleString()} files
            {progress.phase === "finalizing" ? " · aggregating…" : ""}
          </div>
        </div>
      )}
      {progress?.label && (
        <div className="truncate font-mono text-[10px] text-fg-muted/70">{progress.label}</div>
      )}
    </div>
  );
}

export function Landing() {
  const { status, error, canPickDirectory, connectFolder, uploadFiles, dropSourceFiles, loadDemo } = useSnapshot();
  const [dragging, setDragging] = useState(false);
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  // webkitdirectory isn't in the TS input prop types — set it imperatively.
  useEffect(() => {
    const el = folderRef.current;
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
    }
  }, []);

  const busy = status === "ingesting" || status === "restoring";

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = await sourceFilesFromDataTransfer(e.dataTransfer);
    if (files.length) void dropSourceFiles(files);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 text-accent shadow-card ring-1 ring-inset ring-accent/25">
            <Activity className="h-4 w-4" />
          </div>
          <div className="text-lg font-semibold tracking-tight text-fg">CLI Usage Analytics</div>
        </div>

        <div className="rounded-2xl border border-border bg-bg-elev/40 p-6 shadow-card backdrop-blur-xl sm:p-8">
          {busy ? (
            <ProgressView />
          ) : (
            <>
              <h1 className="text-center text-xl font-semibold tracking-tight text-fg">
                See your AI coding usage
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-center text-sm text-fg-muted">
                Connect your local Claude Code &amp; Codex data and explore it as a dashboard —
                tokens, cost, models, sessions, and more.
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "mt-6 rounded-xl border border-dashed p-5 transition-colors",
                  dragging ? "border-accent bg-accent/5" : "border-border",
                )}
              >
                <div className="space-y-2.5">
                  {canPickDirectory && (
                    <button
                      type="button"
                      onClick={() => void connectFolder()}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-all hover:opacity-90 active:scale-[0.99]"
                    >
                      <FolderOpen className="h-4 w-4" /> Connect data folder
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => folderRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium text-fg transition-all hover:border-accent/50 active:scale-[0.99]"
                  >
                    <Upload className="h-4 w-4" /> {canPickDirectory ? "Upload a folder instead" : "Choose your data folder"}
                  </button>
                  <button
                    type="button"
                    onClick={() => filesRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium text-fg transition-all hover:border-accent/50 active:scale-[0.99]"
                  >
                    <Upload className="h-4 w-4" /> Select .jsonl files
                  </button>
                </div>
                <p className="mt-3 text-center text-[11px] text-fg-muted">
                  …or drag &amp; drop your <span className="font-mono">.claude</span> /{" "}
                  <span className="font-mono">.codex</span> folder here
                </p>
              </div>

              <div className="mt-4 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => void loadDemo()}
                  className="inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-accent"
                >
                  <Play className="h-3.5 w-3.5" /> Try the demo instead
                </button>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-500">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> {error}
                </div>
              )}

              {!canPickDirectory && (
                <p className="mt-4 text-center text-[11px] text-fg-muted/70">
                  Tip: one-click folder connect works in Chrome/Edge. In other browsers, use
                  upload or drag &amp; drop.
                </p>
              )}
            </>
          )}

          <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-border pt-4 text-[11px] text-fg-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            100% on-device — your data never leaves this browser.
          </div>
        </div>

        <input
          ref={folderRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const f = e.target.files;
            if (f?.length) void uploadFiles(f);
          }}
        />
        <input
          ref={filesRef}
          type="file"
          multiple
          accept=".jsonl,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files;
            if (f?.length) void uploadFiles(f);
          }}
        />
      </div>
    </div>
  );
}
