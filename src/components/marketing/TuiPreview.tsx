"use client";

// A terminal-window mock that recreates the agentmon TUI in the browser using
// the ported glyph/color math (src/lib/tui/render.ts) fed by the demo snapshot —
// same half-block chart, shade heatmap and muted palette as the real CLI. The
// frame is intentionally dark in every web theme (a terminal is a terminal).

import { dailyModelSeries } from "@/lib/chartData";
import { fmtCompact, fmtUSD } from "@/lib/format";
import { useDemoSummary } from "@/lib/browser/demoPreview";
import { renderChart, renderHeatmap, TERM, type Span } from "@/lib/tui/render";

const CHART_W = 60;
const CHART_H = 8;
const TABS = ["Overview", "Models", "Projects", "Sessions", "Activity"];

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((sp, i) => (
        <span key={i} style={{ color: sp.color, backgroundColor: sp.bg }}>
          {sp.ch}
        </span>
      ))}
    </>
  );
}

function hourAxis(): string {
  let s = "    "; // 4-char weekday gutter
  for (let h = 0; h < 24; h++) s += h % 6 === 0 ? String(h).padStart(2, " ") : "  ";
  return s;
}

export function TuiPreview() {
  const s = useDemoSummary();

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border shadow-pop"
      style={{ background: TERM.bg }}
    >
      {/* terminal chrome */}
      <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: "#ffffff14" }}>
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="ml-2 flex-1 text-center font-mono text-[10px]" style={{ color: TERM.muted }}>
          agentmon — ~/.claude · ~/.codex · opencode
        </div>
      </div>

      {/* terminal body */}
      <div className="overflow-x-auto p-4">
        <div
          className="font-mono leading-[1.45]"
          style={{ color: TERM.fg, fontSize: 11, width: "max-content", minWidth: "100%" }}
        >
          {s ? (
            <>
              {/* header / tabs */}
              <div className="whitespace-pre">
                <span style={{ color: TERM.accent, fontWeight: 700 }}>agentmon</span>
                <span style={{ color: TERM.dim }}>{"  "}</span>
                {TABS.map((t, i) => (
                  <span key={t}>
                    <span
                      style={
                        i === 0
                          ? { color: TERM.accent, borderBottom: `1px solid ${TERM.accent}` }
                          : { color: TERM.muted }
                      }
                    >
                      {t}
                    </span>
                    <span style={{ color: TERM.dim }}>{"   "}</span>
                  </span>
                ))}
              </div>

              {/* filter chips */}
              <div className="mt-1 whitespace-pre" style={{ color: TERM.muted }}>
                <span style={{ color: TERM.dim }}>range </span>
                <span style={{ color: TERM.accent }}>all</span>
                <span style={{ color: TERM.dim }}>{"   "}source </span>
                <span style={{ color: TERM.accent }}>all</span>
                <span style={{ color: TERM.dim }}>{"   "}scope </span>
                <span style={{ color: TERM.accent }}>all</span>
              </div>

              {/* KPI line */}
              <div className="mt-3 whitespace-pre">
                <span style={{ color: TERM.muted }}>tokens </span>
                <span style={{ color: TERM.fg, fontWeight: 700 }}>{fmtCompact(s.summary.totalTokens)}</span>
                <span style={{ color: TERM.dim }}>{"   "}</span>
                <span style={{ color: TERM.muted }}>cost </span>
                <span style={{ color: TERM.success, fontWeight: 700 }}>{fmtUSD(s.summary.cost)}</span>
                <span style={{ color: TERM.dim }}>{"   "}</span>
                <span style={{ color: TERM.muted }}>msgs </span>
                <span style={{ color: TERM.fg, fontWeight: 700 }}>{fmtCompact(s.summary.messageCount)}</span>
                <span style={{ color: TERM.dim }}>{"   "}</span>
                <span style={{ color: TERM.muted }}>sessions </span>
                <span style={{ color: TERM.fg, fontWeight: 700 }}>{fmtCompact(s.summary.sessionCount)}</span>
              </div>

              {/* tokens/day half-block chart */}
              {(() => {
                const { data, series } = dailyModelSeries(s.daily, s.models.slice(0, 5));
                const chart = renderChart({ data, series, style: "area", width: CHART_W, height: CHART_H, valueFmt: fmtCompact });
                return (
                  <div className="mt-3">
                    {chart.lines.map((ln, i) => (
                      <div key={i} className="whitespace-pre">
                        <span style={{ color: TERM.muted }}>{ln.label.padStart(6, " ")} </span>
                        <Spans spans={ln.spans} />
                      </div>
                    ))}
                    <div className="whitespace-pre" style={{ color: TERM.dim }}>
                      {"       " + "─".repeat(chart.width)}
                    </div>
                    <div className="whitespace-pre" style={{ color: TERM.muted }}>
                      {"       " +
                        chart.xLabels[0].padEnd(Math.floor(chart.width / 2)) +
                        chart.xLabels[1].padEnd(chart.width - Math.floor(chart.width / 2) - chart.xLabels[2].length) +
                        chart.xLabels[2]}
                    </div>
                    <div className="mt-1 whitespace-pre">
                      {"       "}
                      {chart.legend.map((b, i) => (
                        <span key={i}>
                          <span style={{ color: b.color }}>─ </span>
                          <span style={{ color: TERM.muted }}>{b.name}</span>
                          <span style={{ color: TERM.dim }}>{"   "}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* activity heatmap */}
              <div className="mt-4">
                <div className="whitespace-pre" style={{ color: TERM.muted }}>
                  activity · hour × weekday
                </div>
                <div className="mt-1 whitespace-pre" style={{ color: TERM.dim }}>
                  {hourAxis()}
                </div>
                {renderHeatmap(s.heatmap.cells, "tokens").map((row) => (
                  <div key={row.wd} className="whitespace-pre">
                    <span style={{ color: TERM.muted }}>{row.wd.padEnd(4, " ")}</span>
                    <Spans spans={row.cells} />
                  </div>
                ))}
              </div>

              <div className="mt-3 whitespace-pre" style={{ color: TERM.dim }}>
                <span>1–5 / Tab switch · </span>
                <span style={{ color: TERM.muted }}>↑↓</span>
                <span> move · </span>
                <span style={{ color: TERM.muted }}>f</span>
                <span> range · </span>
                <span style={{ color: TERM.muted }}>q</span>
                <span> quit</span>
              </div>
            </>
          ) : (
            <div className="space-y-2" style={{ color: TERM.dim }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="h-3 animate-pulse rounded" style={{ background: "#ffffff0d", width: `${90 - (i % 5) * 12}%` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
