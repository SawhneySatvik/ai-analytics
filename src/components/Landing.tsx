"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  Copy,
  FolderOpen,
  Loader2,
  Play,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { useSnapshot } from "@/components/snapshot-provider";
import { Attribution } from "@/components/Attribution";
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

type OS = "mac" | "windows" | "linux" | "other";

export function Landing() {
  const { status, error, canPickDirectory, connectFolder, uploadFiles, dropSourceFiles, loadDemo } = useSnapshot();
  const [dragging, setDragging] = useState(false);
  const [os, setOs] = useState<OS>("other");
  const [copied, setCopied] = useState<string | null>(null);
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

  // Resolved after mount so the prerendered shell and first client render agree.
  useEffect(() => {
    const ua = navigator.userAgent;
    setOs(/Mac/i.test(ua) ? "mac" : /Win/i.test(ua) ? "windows" : /Linux|X11/i.test(ua) ? "linux" : "other");
  }, []);

  const revealHint =
    os === "mac"
      ? "press ⌘ + Shift + . (period)"
      : os === "windows"
        ? "turn on View ▸ Show ▸ Hidden items"
        : os === "linux"
          ? "press Ctrl + H"
          : "enable “show hidden files” in the dialog";
  // The OS file dialog's "jump to a path" shortcut — by far the easiest way to
  // reach a hidden dot-folder (it navigates there AND reveals it in one step).
  const goToKeys =
    os === "mac"
      ? "⌘ + Shift + G"
      : os === "windows"
        ? "Alt + D"
        : os === "linux"
          ? "Ctrl + L"
          : "the dialog’s path field";
  const claudePath = os === "windows" ? "%USERPROFILE%\\.claude" : "~/.claude";
  const codexPath = os === "windows" ? "%USERPROFILE%\\.codex" : "~/.codex";

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

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
                      <FolderOpen className="h-4 w-4" /> Connect your folder
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => folderRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium text-fg transition-all hover:border-accent/50 active:scale-[0.99]"
                  >
                    <Upload className="h-4 w-4" /> {canPickDirectory ? "Upload a folder instead" : "Choose a folder to scan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => filesRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium text-fg transition-all hover:border-accent/50 active:scale-[0.99]"
                  >
                    <Upload className="h-4 w-4" /> Select .jsonl files
                  </button>
                </div>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-fg-muted">
                  {canPickDirectory ? (
                    <>In the dialog, press <span className="font-mono">{goToKeys}</span> and enter{" "}
                      <span className="font-mono">{claudePath}</span> to jump straight there — or
                      pick your home folder and we’ll find <span className="font-mono">.claude</span>{" "}
                      &amp; <span className="font-mono">.codex</span> inside.</>
                  ) : (
                    <>…or drag &amp; drop your <span className="font-mono">.claude</span> /{" "}
                      <span className="font-mono">.codex</span> folder here</>
                  )}
                </p>
              </div>

              <details className="group mt-3 rounded-lg border border-border/70 bg-bg/40 px-3.5 py-2.5 text-left">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-medium text-fg-muted transition-colors hover:text-fg">
                  Can&apos;t find your folder?
                  <span className="text-fg-muted/60 transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="mt-2.5 space-y-2.5 text-[11px] leading-relaxed text-fg-muted">
                  <p>
                    <span className="font-mono">.claude</span> and{" "}
                    <span className="font-mono">.codex</span> are hidden folders, so the file
                    dialog won&apos;t show them by default. Easiest fixes:
                  </p>
                  <p>
                    <span className="font-medium text-fg">1. Jump straight to it.</span> In the
                    dialog press <span className="font-mono">{goToKeys}</span>, paste a path below,
                    and open it — this reveals the hidden folder in one step. Picking{" "}
                    <span className="font-mono">.claude</span> directly works.
                  </p>
                  <p>
                    <span className="font-medium text-fg">2. Or reveal hidden files</span>{" "}
                    ({revealHint}), then open the folder directly.
                  </p>
                  <p>
                    <span className="font-medium text-fg">3. Or pick your home folder</span> — nothing
                    else on your disk is read; we only step into{" "}
                    <span className="font-mono">.claude</span> /{" "}
                    <span className="font-mono">.codex</span>.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[claudePath, codexPath].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => void copy(p)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-2 py-1 font-mono text-[10px] text-fg transition-colors hover:border-accent/50"
                      >
                        {copied === p ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </details>

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
                  Tip: one-click connect works in Chrome/Edge. Here, {revealHint} so your{" "}
                  <span className="font-mono">.claude</span> folder is visible, then upload it.
                </p>
              )}
            </>
          )}

          <div className="mt-6 space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-fg-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              100% on-device — your data never leaves this browser.
            </div>
            <Attribution />
          </div>
        </div>

        <input
          ref={folderRef}
          type="file"
          multiple
          aria-label="Upload your .claude or .codex folder"
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
          aria-label="Select .jsonl transcript files"
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
