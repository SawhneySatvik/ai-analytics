"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Eye, EyeOff, Share2 } from "lucide-react";

import { useDashboardData } from "@/components/dashboard-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, ErrorNote, Label, PageSkeleton, PanelTitle } from "@/components/ui";
import { ShareCard } from "@/components/share/ShareCard";
import type { SummaryResponse } from "@/lib/dto";
import {
  deriveShareStats,
  RATIOS,
  TEMPLATES,
  type ShareRatio,
  type ShareTemplate,
} from "@/lib/share";
import { THEMES } from "@/lib/themes";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX_PREVIEW_H = 680;

export default function SharePage() {
  const { data, error } = useDashboardData<SummaryResponse>("/api/summary");

  const [template, setTemplate] = useState<ShareTemplate>("wrapped");
  const [ratio, setRatio] = useState<ShareRatio>("landscape");
  const [theme, setTheme] = useState<string>("midnight");
  const [handle, setHandle] = useState("");
  const [redact, setRedact] = useState(false);
  const [busy, setBusy] = useState<null | "download" | "copy">(null);
  const [copied, setCopied] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [pw, setPw] = useState(0);

  // Default the card theme to whatever the app is currently showing.
  useEffect(() => {
    const cur = document.documentElement.getAttribute("data-theme");
    if (cur) setTheme(cur);
  }, []);

  // Track preview container width so we can scale the full-size card to fit.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPw(el.clientWidth));
    ro.observe(el);
    setPw(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  if (error && !data) return <ErrorNote message={`Couldn't load data — ${error}`} />;
  if (!data) return <PageSkeleton kpis={4} />;

  const stats = deriveShareStats(data, { redact });
  const { w, h } = RATIOS[ratio];
  const scale = pw ? Math.min(pw / w, MAX_PREVIEW_H / h, 1) : 0.4;

  async function withCard(action: "download" | "copy") {
    const node = cardRef.current;
    if (!node) return;
    setBusy(action);
    try {
      const { domToPng } = await import("modern-screenshot");
      const dataUrl = await domToPng(node, { scale: 2 });
      if (action === "download") {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `cli-usage-${template}-${ratio}.png`;
        a.click();
      } else {
        const blob = await (await fetch(dataUrl)).blob();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* surfaced via the button returning to idle */
    } finally {
      setBusy(null);
    }
  }

  function postToX() {
    const text = `My AI coding usage: ${fmtCompact(stats.totalTokens)} tokens across ${stats.days} active days. Mapped with CLI Usage Analytics →`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Share"
        description="Generate a card from your usage — rendered and exported entirely on-device, nothing uploaded."
      />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* ── controls ─────────────────────────────────────────────── */}
        <Card className="space-y-6 p-5">
          <div>
            <PanelTitle title="Template" />
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]",
                    template === t.id
                      ? "border-accent/50 bg-accent/10 ring-1 ring-inset ring-accent/20"
                      : "border-border bg-bg/40 hover:border-accent/40",
                  )}
                >
                  <div className="text-sm font-medium text-fg">{t.label}</div>
                  <div className="text-[11px] text-fg-muted">{t.blurb}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <PanelTitle title="Format" />
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(RATIOS) as ShareRatio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRatio(r)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-center transition-all active:scale-[0.98]",
                    ratio === r
                      ? "border-accent/50 bg-accent/10 ring-1 ring-inset ring-accent/20"
                      : "border-border bg-bg/40 hover:border-accent/40",
                  )}
                >
                  <div className="text-xs font-medium text-fg">{RATIOS[r].label}</div>
                  <div className="text-[10px] text-fg-muted">{RATIOS[r].sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <PanelTitle title="Theme" />
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  aria-label={t.label}
                  title={t.label}
                  className={cn(
                    "relative h-8 w-8 overflow-hidden rounded-lg ring-1 ring-inset transition-all",
                    theme === t.id ? "ring-2 ring-accent" : "ring-border hover:ring-accent/50",
                  )}
                  style={{ background: t.swatch.bg }}
                >
                  <span className="absolute inset-x-0 bottom-0 h-3" style={{ background: t.swatch.elev }} />
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full" style={{ background: t.swatch.accent }} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Handle (optional)</Label>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@yourhandle"
                className="mt-1.5 h-9 w-full rounded-lg border border-border bg-bg/40 px-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-muted/60 hover:border-accent/40 focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/35"
              />
            </div>
            <button
              type="button"
              onClick={() => setRedact((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-bg/40 px-3 py-2 text-sm text-fg transition-colors hover:border-accent/40"
            >
              <span className="flex items-center gap-2">
                {redact ? <EyeOff className="h-4 w-4 text-accent" /> : <Eye className="h-4 w-4 text-fg-muted" />}
                Redact project names
              </span>
              <span
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  redact ? "bg-accent" : "bg-border",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                    redact ? "left-[18px]" : "left-0.5",
                  )}
                />
              </span>
            </button>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => withCard("download")}
              disabled={busy !== null}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-bg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              <Download className="h-4 w-4" /> {busy === "download" ? "Rendering…" : "Download PNG"}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => withCard("copy")}
                disabled={busy !== null}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-bg/40 text-sm text-fg transition-all hover:border-accent/50 active:scale-[0.98] disabled:opacity-60"
              >
                {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : busy === "copy" ? "…" : "Copy"}
              </button>
              <button
                type="button"
                onClick={postToX}
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-bg/40 text-sm text-fg transition-all hover:border-accent/50 active:scale-[0.98]"
              >
                <Share2 className="h-4 w-4" /> Post on X
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-fg-muted">
              Copy puts the image on your clipboard; “Post on X” opens a draft — paste or attach the image there.
            </p>
          </div>
        </Card>

        {/* ── preview ──────────────────────────────────────────────── */}
        <Card className="flex flex-col p-5">
          <PanelTitle title="Preview" hint={`${w}×${h} · exported at 2×`} />
          <div ref={previewRef} className="flex flex-1 items-start justify-center">
            <div style={{ width: w * scale, height: h * scale }} className="relative">
              <div
                className="absolute left-0 top-0 overflow-hidden rounded-2xl shadow-pop"
                style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
              >
                <ShareCard stats={stats} template={template} theme={theme} ratio={ratio} handle={handle.trim() || undefined} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Off-screen full-size card used for the PNG export. Kept separate from
          the preview so the preview's scale transform can't shrink the capture. */}
      <div aria-hidden style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, overflow: "hidden" }}>
        <ShareCard ref={cardRef} stats={stats} template={template} theme={theme} ratio={ratio} handle={handle.trim() || undefined} />
      </div>
    </div>
  );
}
