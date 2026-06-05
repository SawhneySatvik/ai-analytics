import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/cache";
import { parseFilters } from "@/lib/request";
import {
  applyFilters,
  summarize,
  dailySeries,
  modelBreakdown,
  sourceBreakdown,
  projectBreakdown,
  toolBreakdown,
  subagentBreakdown,
  branchBreakdown,
  speedBreakdown,
  hourWeekdayHeatmap,
  commandStats,
} from "@/lib/aggregate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const snap = await getSnapshot();
    const url = new URL(req.url);
    const filters = parseFilters(url.searchParams);
    const messages = applyFilters(snap.messages, filters);

    return NextResponse.json({
      meta: {
        builtAt: snap.builtAt,
        buildMs: snap.buildMs,
        timezone: snap.timezone,
        fileCount: snap.fileCount,
        lineCount: snap.lineCount,
        assistantLineCount: snap.assistantLineCount,
        distinctMessageCount: snap.distinctMessageCount,
        duplicateLineCount: snap.duplicateLineCount,
        malformedLineCount: snap.malformedLineCount,
        warnings: snap.warnings,
      },
      summary: summarize(messages),
      daily: dailySeries(messages),
      models: modelBreakdown(messages),
      sources: sourceBreakdown(messages),
      projects: projectBreakdown(messages),
      tools: toolBreakdown(messages),
      subagents: subagentBreakdown(messages),
      branches: branchBreakdown(messages),
      speeds: speedBreakdown(messages),
      heatmap: hourWeekdayHeatmap(messages),
      commands: commandStats(snap.history, filters),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ingestion failed" },
      { status: 500 },
    );
  }
}
