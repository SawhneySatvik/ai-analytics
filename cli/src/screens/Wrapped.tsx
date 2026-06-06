import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";

import type { ScreenProps } from "../data.js";
import { deriveShareStats, type ShareTemplate } from "@core/share";
import { derivePersona, computeBadges, nextMilestone } from "@core/badges";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@core/format";
import { dailyModelSeries } from "@core/chartData";
import { palette } from "../theme.js";
import { Kpi, SectionTitle } from "../components/ui.js";
import { BarRow, Heatmap } from "../components/viz.js";
import { Chart } from "../components/chart.js";
import { useMouse } from "../mouse.js";
import { exportCard, openPath, type ExportResult } from "../cardImage.js";

const CARDS: { id: ShareTemplate; label: string }[] = [
  { id: "wrapped", label: "Wrapped" },
  { id: "persona", label: "Persona" },
  { id: "receipt", label: "Receipt" },
  { id: "loadout", label: "Loadout" },
  { id: "rhythm", label: "Rhythm" },
  { id: "milestone", label: "Milestone" },
];

const SEL_W = 14;
const hourLabel = (h: number | null) => (h == null ? "—" : `${String(h).padStart(2, "0")}:00`);
const shortDay = (d: string | null) => (d ? d.slice(0, 3) : "—");

export function Wrapped({ d, width, height, contentTop, compact }: ScreenProps) {
  const [cardIdx, setCardIdx] = useState(0);
  const [status, setStatus] = useState<"idle" | "exporting" | "error">("idle");
  const [last, setLast] = useState<ExportResult | null>(null);
  const { onClick, onWheel } = useMouse();

  const stats = deriveShareStats(d);
  const persona = derivePersona(stats);
  const badges = computeBadges(stats);
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);
  const ms = nextMilestone(stats.totalTokens);
  const template = CARDS[cardIdx].id;

  const runExport = () => {
    if (status === "exporting") return;
    setStatus("exporting");
    exportCard(stats, template)
      .then((r) => {
        setLast(r);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  };

  useInput((input) => {
    if (input === "g") setCardIdx((i) => (i + 1) % CARDS.length);
    else if (input === "e") runExport();
    else if (input === "o" && last) void openPath(last.path);
  });

  // Deterministic rows for mouse hit-testing: caption(contentTop) + blank, then
  // the left selector column starts at contentTop+2.
  const top = contentTop + 2; // "CARD" header row
  const itemBase = top + 1; // first template item
  const exportRow = top + 8;
  const openRow = top + 9;

  useEffect(() => {
    const offClick = onClick((cx, cy) => {
      if (cx > SEL_W + 1) return; // left column only
      for (let i = 0; i < CARDS.length; i++) if (cy === itemBase + i) return void setCardIdx(i);
      if (cy === exportRow) return void runExport();
      if (cy === openRow && last) return void openPath(last.path);
    });
    const offWheel = onWheel((dir) => setCardIdx((i) => (i + (dir === "down" ? 1 : CARDS.length - 1)) % CARDS.length));
    return () => {
      offClick();
      offWheel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClick, onWheel, itemBase, exportRow, openRow, last, status, cardIdx]);

  const cardW = Math.max(28, width - SEL_W - 4);

  return (
    <Box flexDirection="column">
      {/* persona caption — exactly one row (truncate) for deterministic offsets */}
      <Box width={width} marginBottom={1}>
        <Text wrap="truncate-end">
          <Text color={palette.accent} bold>
            {persona.emoji} {persona.title}
          </Text>
          <Text color={palette.muted}> — {persona.blurb}</Text>
        </Text>
      </Box>

      <Box>
        {/* left selector column */}
        <Box flexDirection="column" width={SEL_W} marginRight={2}>
          <Text color={palette.dim}>CARD</Text>
          {CARDS.map((c, i) => (
            <Text key={c.id} color={i === cardIdx ? palette.accent : palette.muted} bold={i === cardIdx}>
              {(i === cardIdx ? "› " : "  ") + c.label}
            </Text>
          ))}
          <Text> </Text>
          <Text color={status === "exporting" ? palette.warn : palette.accent}>
            {status === "exporting" ? "  …rendering" : "↑ export img"}
          </Text>
          <Text color={last ? palette.fg : palette.dim}>{last ? "  open file" : "  open —"}</Text>
        </Box>

        {/* the selected card */}
        <Box borderStyle="round" borderColor={palette.dim} paddingX={1} width={cardW} flexDirection="column">
          <CardBody template={template} stats={stats} d={d} width={cardW - 4} />
        </Box>
      </Box>

      {/* export status (variable text, below the fixed rows) */}
      <Box marginTop={0}>
        {status === "error" ? (
          <Text color={palette.danger}>couldn&apos;t write the image</Text>
        ) : last ? (
          <Text color={palette.success} wrap="truncate-end">
            saved {last.path} ({last.format}) · g/wheel cycle · click or e/o
          </Text>
        ) : (
          <Text color={palette.dim}>click a card or action · g/wheel cycle · e export · o open</Text>
        )}
      </Box>

      {/* badges */}
      <Box marginTop={1} flexDirection="column">
        <SectionTitle>{`Badges  ${earned.length}/${badges.length}`}</SectionTitle>
        <Box flexWrap="wrap">
          {earned.map((b) => (
            <Box key={b.id} marginRight={2}>
              <Text color={palette.fg}>
                {b.emoji} {b.label}
              </Text>
            </Box>
          ))}
          {earned.length === 0 ? <Text color={palette.muted}>none yet — keep coding</Text> : null}
        </Box>
        {!compact && locked.length > 0 ? (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.dim}>in progress</Text>
            {locked.slice(0, 3).map((b) => (
              <BarRow
                key={b.id}
                label={`${b.emoji} ${b.label}`}
                value={b.progress}
                max={1}
                barWidth={Math.min(20, width - 40)}
                labelWidth={22}
                color={palette.muted}
                valueText={fmtPct(b.progress)}
              />
            ))}
          </Box>
        ) : null}
        {ms.next ? (
          <Box marginTop={1}>
            <BarRow
              label="Milestone"
              value={ms.pctToNext}
              max={1}
              barWidth={Math.min(24, width - 44)}
              labelWidth={10}
              color={palette.accent}
              valueText={`${fmtPct(ms.pctToNext)} → ${ms.next.label}`}
              valueWidth={16}
            />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function CardBody({
  template,
  stats,
  d,
  width,
}: {
  template: ShareTemplate;
  stats: ReturnType<typeof deriveShareStats>;
  d: ScreenProps["d"];
  width: number;
}) {
  if (template === "persona") {
    return (
      <Box flexDirection="column">
        <Text color={palette.muted}>MY CODING PERSONA</Text>
        <Box marginTop={1} flexDirection="column">
          {stats.models.slice(0, 4).map((m) => (
            <BarRow key={m.label} label={m.label} value={m.pct} max={1} barWidth={Math.max(8, width - 30)} labelWidth={14} valueText={fmtPct(m.pct)} />
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color={palette.muted}>
            peak <Text color={palette.fg}>{shortDay(stats.peakDay)} {hourLabel(stats.peakHour)}</Text> · cache{" "}
            <Text color={palette.fg}>{fmtPct(stats.cacheHitRate)}</Text> · weekend{" "}
            <Text color={palette.fg}>{fmtPct(stats.weekendPct)}</Text>
          </Text>
        </Box>
      </Box>
    );
  }
  if (template === "receipt") {
    return (
      <Box flexDirection="column">
        <Text color={palette.muted}>AI USAGE RECEIPT · {stats.rangeLabel}</Text>
        <Box height={1} />
        {stats.models.slice(0, 5).map((m) => (
          <Box key={m.label} justifyContent="space-between" width={width}>
            <Text color={palette.fg}>{m.label}</Text>
            <Text color={palette.fg}>{fmtUSD(m.cost)}</Text>
          </Box>
        ))}
        <Box justifyContent="space-between" width={width}>
          <Text color={palette.muted}>cache savings</Text>
          <Text color={palette.muted}>-{fmtUSD(stats.cacheSavings)}</Text>
        </Box>
        <Box justifyContent="space-between" width={width} marginTop={1}>
          <Text bold color={palette.fg}>TOTAL</Text>
          <Text bold color={palette.accent}>{fmtUSD(stats.cost)}</Text>
        </Box>
      </Box>
    );
  }
  if (template === "loadout") {
    const maxPct = stats.models[0]?.pct || 1;
    return (
      <Box flexDirection="column">
        <Text color={palette.muted}>MY LOADOUT · {fmtUSD(stats.cost)}</Text>
        {stats.models.slice(0, 5).map((m) => (
          <BarRow
            key={m.label}
            label={m.label}
            value={m.pct}
            max={maxPct}
            barWidth={Math.max(8, width - 32)}
            labelWidth={14}
            valueText={`${fmtPct(m.pct)} ${fmtUSD(m.cost)}`}
            valueWidth={14}
          />
        ))}
        <Box marginTop={1}>
          <Text color={palette.muted} wrap="truncate-end">
            by tool: {stats.sources.map((s) => `${s.label} ${fmtPct(s.pct)}`).join(" · ")}
          </Text>
        </Box>
      </Box>
    );
  }
  if (template === "rhythm") {
    return (
      <Box flexDirection="column">
        <Text color={palette.muted}>
          WHEN I CODE · peak {shortDay(stats.peakDay)} {hourLabel(stats.peakHour)}
        </Text>
        <Box marginTop={1}>
          <Heatmap cells={stats.heatmap.cells} metric="tokens" />
        </Box>
        <Text color={palette.muted}>
          weekdays <Text color={palette.fg}>{fmtPct(stats.weekdayPct)}</Text> · weekends{" "}
          <Text color={palette.fg}>{fmtPct(stats.weekendPct)}</Text> · {fmtNum(stats.days)} active days
        </Text>
      </Box>
    );
  }
  if (template === "milestone") {
    const ms = nextMilestone(stats.totalTokens);
    const ladder: [string, number][] = [["1M", 1e6], ["10M", 1e7], ["100M", 1e8], ["1B", 1e9], ["10B", 1e10]];
    return (
      <Box flexDirection="column">
        <Text color={palette.muted}>{ms.achieved ? "MILESTONE UNLOCKED" : "NEXT MILESTONE"}</Text>
        <Text bold color={palette.fg}>
          {ms.achieved ? `${ms.achieved.label} tokens 🎉` : `${fmtCompact(stats.totalTokens)} tokens`}
        </Text>
        <Box marginTop={1} flexWrap="wrap">
          {ladder.map(([label, value]) => {
            const reached = stats.totalTokens >= value;
            return (
              <Box key={label} marginRight={1}>
                <Text color={reached ? palette.accent : palette.dim}>{reached ? "✓" : "○"}{label}</Text>
              </Box>
            );
          })}
        </Box>
        {ms.next ? (
          <Box marginTop={1}>
            <BarRow label={fmtCompact(stats.totalTokens)} value={ms.pctToNext} max={1} barWidth={Math.max(8, width - 28)} labelWidth={10} color={palette.accent} valueText={`→ ${ms.next.label}`} />
          </Box>
        ) : (
          <Text color={palette.accent}>topped the charts 🏆</Text>
        )}
      </Box>
    );
  }
  // wrapped (default) — KPIs + a braille tokens-by-model area chart
  const s = stats;
  const { data: chartData, series: chartSeries } = dailyModelSeries(d.daily, d.models);
  return (
    <Box flexDirection="column">
      <Text color={palette.muted}>AI WRAPPED · {s.rangeLabel}</Text>
      <Box marginTop={1}>
        <Kpi label="Tokens" value={fmtCompact(s.totalTokens)} accent width={12} />
        <Kpi label="Cost" value={fmtUSD(s.cost)} width={11} />
        <Kpi label="Msgs" value={fmtNum(s.messages)} width={10} />
        <Kpi label="Cache" value={fmtPct(s.cacheHitRate)} width={9} />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={palette.dim}>TOKENS / DAY · BY MODEL</Text>
        <Chart data={chartData} series={chartSeries} style="area" width={Math.max(24, width - 2)} height={8} valueFmt={fmtCompact} />
      </Box>
      <Text color={palette.dim}>
        peak {shortDay(s.peakDay)} {hourLabel(s.peakHour)} · subagents {fmtPct(s.subagentPct)} · wk {fmtPct(s.weekdayPct)}/{fmtPct(s.weekendPct)}
      </Text>
    </Box>
  );
}
