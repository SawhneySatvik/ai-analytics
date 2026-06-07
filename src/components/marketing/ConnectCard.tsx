"use client";

// The data-connect call-to-action — the working core of the old Landing, lifted
// into a self-contained card so the marketing page can use it as the hero CTA.
// All ingest paths preserved: one-click folder pick (Chromium), folder upload,
// .jsonl picker, drag-drop, and the demo. Plus OS-aware "jump to ~/.claude" help.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleCheck,
  Copy,
  Database,
  FolderOpen,
  FolderPlus,
  Play,
  Upload,
} from "lucide-react";

import { useSnapshot } from "@/components/snapshot-provider";
import { sourceFilesFromDataTransfer } from "@/lib/browser/dropzone";
import { cn } from "@/lib/utils";

type OS = "mac" | "windows" | "linux" | "other";

/** Human label for the connected data source — mirrors the header control. */
function sourceLabel(source: string | null, folderCount: number): string {
  if (source === "demo") return "demo data";
  if (source === "upload") return "uploaded files";
  if (folderCount > 1) return `${folderCount} folders`;
  return "local folder";
}

export function ConnectCard({ onConnect }: { onConnect?: () => void }) {
  const {
    status,
    snapshot,
    source,
    folderCount,
    error,
    canPickDirectory,
    connectFolder,
    addFolder,
    uploadFiles,
    dropSourceFiles,
    loadDemo,
    disconnect,
  } = useSnapshot();
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
  const goToKeys =
    os === "mac" ? "⌘ + Shift + G" : os === "windows" ? "Alt + D" : os === "linux" ? "Ctrl + L" : "the dialog’s path field";
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

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = await sourceFilesFromDataTransfer(e.dataTransfer);
    if (files.length) {
      onConnect?.();
      void dropSourceFiles(files);
    }
  }

  // Already connected (e.g. a returning visitor whose folder was restored): the
  // landing stays the front door, but the CTA becomes a way into the dashboard.
  if (status === "ready" && snapshot) {
    return (
      <div className="w-full">
        <div className="rounded-2xl border border-border bg-bg-elev/50 p-4 shadow-card backdrop-blur-xl sm:p-5">
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-fg">
            <CircleCheck className="h-4 w-4 text-emerald-500" />
            You&apos;re connected
            <span className="text-fg-muted">· {sourceLabel(source, folderCount)}</span>
          </div>
          <Link
            href="/overview"
            className="shine group mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg shadow-pop transition-all hover:opacity-90 active:scale-[0.99]"
          >
            Open your dashboard
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-fg-muted">
            {source === "folder" && canPickDirectory && (
              <button
                type="button"
                onClick={() => {
                  onConnect?.();
                  void addFolder();
                }}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
              >
                <FolderPlus className="h-3.5 w-3.5" /> add another folder
              </button>
            )}
            <button
              type="button"
              onClick={() => void disconnect()}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
            >
              <Database className="h-3.5 w-3.5" /> use different data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-2xl border bg-bg-elev/50 p-4 shadow-card backdrop-blur-xl transition-colors sm:p-5",
          dragging ? "border-accent bg-accent/5" : "border-border",
        )}
      >
        <div className="space-y-2.5">
          {canPickDirectory && (
            <button
              type="button"
              onClick={() => {
                onConnect?.();
                void connectFolder();
              }}
              className="shine group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-bg shadow-pop transition-all hover:opacity-90 active:scale-[0.99]"
            >
              <FolderOpen className="h-4 w-4" /> Connect your folder
              <span className="ml-0.5 transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => folderRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-medium text-fg transition-all hover:border-accent/50 active:scale-[0.99]"
            >
              <Upload className="h-4 w-4" /> {canPickDirectory ? "Upload folder" : "Choose folder"}
            </button>
            <button
              type="button"
              onClick={() => filesRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm font-medium text-fg transition-all hover:border-accent/50 active:scale-[0.99]"
            >
              <Upload className="h-4 w-4" /> .jsonl files
            </button>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-fg-muted">
          {canPickDirectory ? (
            <>
              In the dialog, press <span className="font-mono text-fg">{goToKeys}</span> and enter{" "}
              <span className="font-mono text-fg">{claudePath}</span> to jump straight there — or pick your home folder and
              we’ll find <span className="font-mono">.claude</span> &amp; <span className="font-mono">.codex</span> inside.
            </>
          ) : (
            <>
              …or drag &amp; drop your <span className="font-mono">.claude</span> / <span className="font-mono">.codex</span>{" "}
              folder here
            </>
          )}
        </p>

        <details className="group mt-3 rounded-xl border border-border/70 bg-bg/40 px-3.5 py-2.5 text-left">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-medium text-fg-muted transition-colors hover:text-fg">
            Can&apos;t find your folder?
            <span className="text-fg-muted/60 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <div className="mt-2.5 space-y-2.5 text-[11px] leading-relaxed text-fg-muted">
            <p>
              <span className="font-mono">.claude</span> and <span className="font-mono">.codex</span> are hidden folders,
              so the file dialog won&apos;t show them by default. Easiest fixes:
            </p>
            <p>
              <span className="font-medium text-fg">1. Jump straight to it.</span> In the dialog press{" "}
              <span className="font-mono">{goToKeys}</span>, paste a path below, and open it — this reveals the hidden
              folder in one step. Picking <span className="font-mono">.claude</span> directly works.
            </p>
            <p>
              <span className="font-medium text-fg">2. Or reveal hidden files</span> ({revealHint}), then open the folder
              directly.
            </p>
            <p>
              <span className="font-medium text-fg">3. Or pick your home folder</span> — nothing else on your disk is read;
              we only step into <span className="font-mono">.claude</span> / <span className="font-mono">.codex</span>.
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
            <p className="pt-0.5 text-fg-muted/80">
              Each pick connects one folder — connected one tool but not the other? Use{" "}
              <span className="font-medium text-fg">“add folder”</span> in the header to merge more in.
            </p>
          </div>
        </details>

        <div className="mt-3 flex items-center justify-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => {
              onConnect?.();
              void loadDemo();
            }}
            className="inline-flex items-center gap-1.5 text-fg-muted transition-colors hover:text-accent"
          >
            <Play className="h-3.5 w-3.5" /> Try the live demo
          </button>
          {!canPickDirectory && (
            <span className="text-fg-muted/70">· one-click connect works in Chrome/Edge</span>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-500">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}
      </div>

      <input
        ref={folderRef}
        type="file"
        multiple
        aria-label="Upload your .claude or .codex folder"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files;
          if (f?.length) {
            onConnect?.();
            void uploadFiles(f);
          }
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
          if (f?.length) {
            onConnect?.();
            void uploadFiles(f);
          }
        }}
      />
    </div>
  );
}
