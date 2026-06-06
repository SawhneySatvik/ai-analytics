import { useState } from "react";
import { Box, Text, useInput } from "ink";

import type { ScreenProps } from "../data.js";
import { deriveShareStats, type ShareTemplate } from "@core/share";
import { derivePersona, computeBadges, nextMilestone } from "@core/badges";
import { fmtCompact, fmtNum, fmtPct, fmtUSD } from "@core/format";
import { palette } from "../theme.js";
import { Kpi, SectionTitle } from "../components/ui.js";
import { BarRow, Sparkline, Heatmap } from "../components/viz.js";
import { exportCard, openPath, type ExportResult } from "../cardImage.js";

const CARDS: { id: ShareTemplate; label: string }[] = [
  { id: "wrapped", label: "Wrapped" },
  { id: "persona", label: "Persona" },
  { id: "receipt", label: "Receipt" },
  { id: "loadout", label: "Loadout" },
  { id: "rhythm", label: "Rhythm" },
  { id: "milestone", label: "Milestone" },
];

const hourLabel = (h: number | null) => (h == null ? "—" : `${String(h).padStart(2, "0")}:00`);
const shortDay = (d: string | null) => (d ? d.slice(0, 3) : "—");

export function Wrapped({ d, width, compact }: ScreenProps) {
  const [cardIdx, setCardIdx] = useState(0);
  const [status, setStatus] = useState<"idle" | "exporting" | "error">("idle");
  const [last, setLast] = useState<ExportResult | null>(null);

  const stats = deriveShareStats(d);
  const persona = derivePersona(stats);
  const badges = computeBadges(stats);
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);
  const ms = nextMilestone(stats.totalTokens);
  const template = CARDS[cardIdx].id;

  useInput((input) => {
    if (input === "g") setCardIdx((i) => (i + 1) % CARDS.length);
    else if (input === "e") {
      if (status === "exporting") return;
      setStatus("exporting");
      exportCard(stats, template)
        .then((r) => {
          setLast(r);
          setStatus("idle");
        })
        .catch(() => setStatus("error"));
    } else if (input === "o" && last) {
      void openPath(last.path);
    }
  });

  const cardW = Math.min(width - 4, 60);

  return (
    <Box flexDirection="column">
      {/* persona caption */}
      <Box marginBottom={1}>
        <Text color={palette.accent} bold>
          {persona.emoji} {persona.title}
        </Text>
        <Text color={palette.muted}> — {persona.blurb}</Text>
      </Box>

      {/* the selected card */}
      <Box borderStyle="round" borderColor={palette.dim} paddingX={1} width={cardW} flexDirection="column">
        <CardBody template={template} stats={stats} width={cardW - 4} />
      </Box>

      {/* card selector + actions */}
      <Box marginTop={1}>
        {CARDS.map((c, i) => (
          <Text key={c.id} color={i === cardIdx ? palette.accent : palette.muted} bold={i === cardIdx}>
            {(i === cardIdx ? "‹" : " ") + c.label + (i === cardIdx ? "›" : " ") + "  "}
          </Text>
        ))}
      </Box>
      <Box>
        <Text color={palette.dim}>g cycle · e export image · {last ? "o open" : "—"}</Text>
      </Box>
      <Box>
        {status === "exporting" ? (
          <Text color={palette.warn}>rendering image…</Text>
        ) : status === "error" ? (
          <Text color={palette.danger}>couldn&apos;t write the image</Text>
        ) : last ? (
          <Text color={palette.success}>
            saved {last.path} ({last.format}) · press o to open
          </Text>
        ) : (
          <Text color={palette.dim}>exports a 1080×1080 image to this folder</Text>
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
                barWidth={Math.min(20, width - 36)}
                labelWidth={20}
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
              barWidth={Math.min(24, width - 40)}
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
  width,
}: {
  template: ShareTemplate;
  stats: ReturnType<typeof deriveShareStats>;
  width: number;
}) {
  if (template === "persona") {
    return (
      <Box flexDirection="column">
        <Text color={palette.muted}>MY CODING PERSONA</Text>
        <Text bold color={palette.fg}>
          {stats.topModel ? `${stats.topModel.label} ${fmtPct(stats.topModel.pct)}` : "—"}
        </Text>
        <Box marginTop={1} flexDirection="column">
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
        <Text color={palette.muted}>MY LOADOUT</Text>
        {stats.models.slice(0, 5).map((m) => (
          <BarRow
            key={m.label}
            label={m.label}
            value={m.pct}
            max={maxPct}
            barWidth={Math.max(8, width - 30)}
            labelWidth={16}
            valueText={fmtPct(m.pct)}
          />
        ))}
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
          <Text color={palette.fg}>{fmtPct(stats.weekendPct)}</Text>
        </Text>
      </Box>
    );
  }
  if (template === "milestone") {
    const ms = nextMilestone(stats.totalTokens);
    return (
      <Box flexDirection="column">
        <Text color={palette.muted}>{ms.achieved ? "MILESTONE UNLOCKED" : "NEXT MILESTONE"}</Text>
        <Text bold color={palette.fg}>
          {ms.achieved ? `${ms.achieved.label} tokens 🎉` : `${fmtCompact(stats.totalTokens)} tokens`}
        </Text>
        {ms.next ? (
          <Box marginTop={1}>
            <BarRow
              label={fmtCompact(stats.totalTokens)}
              value={ms.pctToNext}
              max={1}
              barWidth={Math.max(8, width - 28)}
              labelWidth={10}
              color={palette.accent}
              valueText={`→ ${ms.next.label}`}
            />
          </Box>
        ) : (
          <Text color={palette.accent}>topped the charts 🏆</Text>
        )}
      </Box>
    );
  }
  // wrapped (default)
  const s = stats;
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
        <Text color={palette.dim}>activity · peak {shortDay(s.peakDay)} {hourLabel(s.peakHour)}</Text>
        <Sparkline data={s.spark} width={Math.max(10, width - 2)} />
      </Box>
    </Box>
  );
}
