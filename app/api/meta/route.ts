import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/cache";
import { filterOptions } from "@/lib/aggregate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snap = await getSnapshot();
    return NextResponse.json({
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
      options: filterOptions(snap.messages),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ingestion failed" },
      { status: 500 },
    );
  }
}
