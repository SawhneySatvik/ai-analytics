"use client";

import { Star } from "lucide-react";

import { AUTHOR, GITHUB_REPO, PORTFOLIO, STAR_TEXT } from "@/lib/links";

/**
 * Author credit + a GitHub star call-to-action. `full` for the landing footer,
 * `compact` for the sidebar.
 */
export function Attribution({ variant = "full" }: { variant?: "full" | "compact" }) {
  const star = (
    <a
      href={GITHUB_REPO}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-fg-muted transition-colors hover:text-accent"
    >
      <Star className="h-3.5 w-3.5" /> {STAR_TEXT}
    </a>
  );
  const by = (
    <span className="text-fg-muted">
      by{" "}
      <a href={PORTFOLIO} target="_blank" rel="noreferrer" className="text-fg-muted transition-colors hover:text-fg">
        {AUTHOR}
      </a>
    </span>
  );

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-1 text-[10px]">
        {star}
        {by}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
      <span className="text-fg-muted">
        Built by{" "}
        <a href={PORTFOLIO} target="_blank" rel="noreferrer" className="text-fg transition-colors hover:text-accent">
          {AUTHOR}
        </a>
      </span>
      <span className="text-fg-muted/40">·</span>
      {star}
    </div>
  );
}
