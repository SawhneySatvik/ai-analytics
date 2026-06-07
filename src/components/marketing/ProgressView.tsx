"use client";

// On-device ingest progress — shown on the landing while a folder is being read
// or reconnected, and reused by the dashboard gate while a saved folder restores.

import { Loader2 } from "lucide-react";

import { useSnapshot } from "@/components/snapshot-provider";

export function ProgressView() {
  const { status, progress } = useSnapshot();
  const label = status === "restoring" ? "Reconnecting to your folder…" : "Reading your usage on-device…";
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
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
        {progress?.label && <div className="truncate font-mono text-[10px] text-fg-muted/70">{progress.label}</div>}
      </div>
    </div>
  );
}
