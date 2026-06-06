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
import { derivePersona } from "@/lib/badges";
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
  const [busy, setBusy] = useState<null | "download" | "copy" | "share">(null);
  const [copied, setCopied] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [pw, setPw] = useState(0);

  // Detect Web Share API file support post-mount (avoids a hydration mismatch).
  useEffect(() => {
    try {
      const probe = new File([new Blob()], "card.png", { type: "image/png" });
      setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

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
  const persona = derivePersona(stats);
  const { w, h } = RATIOS[ratio];
  const scale = pw ? Math.min(pw / w, MAX_PREVIEW_H / h, 1) : 0.4;

  const fileName = `cli-usage-${template}-${ratio}.png`;
  const captionText = `apparently I'm a ${persona.title} ${persona.emoji} — ${fmtCompact(stats.totalTokens)} tokens across ${stats.days} active days, all on-device with CLI Usage Analytics →`;

  /** Render the off-screen card to a PNG File (2× for retina). */
  async function capture(): Promise<File> {
    const node = cardRef.current;
    if (!node) throw new Error("card not ready");
    const { domToPng } = await import("modern-screenshot");
    const dataUrl = await domToPng(node, { scale: 2 });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], fileName, { type: "image/png" });
  }

  async function withCard(action: "download" | "copy") {
    setBusy(action);
    setExportErr(null);
    try {
      const file = await capture();
      if (action === "download") {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": file })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      setExportErr("Couldn't render the image. Try Download, or a Chromium browser.");
    } finally {
      setBusy(null);
    }
  }

  /** Post the card image directly via the native share sheet (Web Share API). */
  async function shareImage() {
    setBusy("share");
    setExportErr(null);
    try {
      const file = await capture();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: captionText, title: "CLI Usage Analytics" });
      } else {
        // capability changed / unavailable — fall back to a download
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // user-cancelled share is an AbortError — not an error to surface
      if ((e as DOMException)?.name !== "AbortError") {
        setExportErr("Couldn't open the share sheet. Try Download instead.");
      }
    } finally {
      setBusy(null);
    }
  }

  function postToX() {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(captionText)}`, "_blank", "noopener");
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
          <div className="flex items-center gap-2.5 rounded-xl border border-accent/30 bg-accent/[0.06] px-3 py-2.5">
            <span className="text-xl leading-none">{persona.emoji}</span>
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-muted">your persona</div>
              <div className="truncate text-sm font-semibold text-fg">{persona.title}</div>
            </div>
          </div>

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
            {canShareFiles ? (
              <button
                type="button"
                onClick={shareImage}
                disabled={busy !== null}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-bg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                <Share2 className="h-4 w-4" /> {busy === "share" ? "Opening…" : "Share image"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => withCard("download")}
                disabled={busy !== null}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-bg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                <Download className="h-4 w-4" /> {busy === "download" ? "Rendering…" : "Download PNG"}
              </button>
            )}
            <div className={cn("grid gap-2", canShareFiles ? "grid-cols-3" : "grid-cols-2")}>
              {canShareFiles && (
                <button
                  type="button"
                  onClick={() => withCard("download")}
                  disabled={busy !== null}
                  className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-bg/40 text-sm text-fg transition-all hover:border-accent/50 active:scale-[0.98] disabled:opacity-60"
                >
                  <Download className="h-4 w-4" /> {busy === "download" ? "…" : "Save"}
                </button>
              )}
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
                <Share2 className="h-4 w-4" /> X
              </button>
            </div>
            {exportErr ? (
              <p className="text-[11px] leading-relaxed text-amber-500">{exportErr}</p>
            ) : (
              <p className="text-[11px] leading-relaxed text-fg-muted">
                {canShareFiles
                  ? "“Share image” attaches the card to your device’s share sheet — post it straight to X, nothing uploaded by us."
                  : "Copy puts the image on your clipboard; “X” opens a draft to paste it into."}
              </p>
            )}
          </div>
        </Card>

        {/* ── preview ──────────────────────────────────────────────── */}
        <Card className="flex flex-col p-5">
          <PanelTitle title="Preview" hint={`${w}×${h} · exported at 2×`} />
          <div ref={previewRef} className="flex flex-1 flex-col items-center justify-start">
            <div style={{ width: w * scale, height: h * scale }} className="relative">
              <div
                className="absolute left-0 top-0 overflow-hidden rounded-2xl shadow-pop ring-1 ring-border"
                style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
              >
                <ShareCard stats={stats} template={template} theme={theme} ratio={ratio} handle={handle.trim() || undefined} />
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] text-fg-muted">
              apparently you&apos;re a <span className="font-medium text-fg">{persona.title}</span> {persona.emoji} · rendered &amp; exported on-device
            </p>
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
