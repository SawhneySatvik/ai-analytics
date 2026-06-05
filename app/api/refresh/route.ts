import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/cache";
import { filterOptions } from "@/lib/aggregate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Force a full re-ingest of ~/.claude, bypassing the file-signature cache. */
export async function POST() {
  try {
    const snap = await getSnapshot(true);
    return NextResponse.json({
      builtAt: snap.builtAt,
      buildMs: snap.buildMs,
      timezone: snap.timezone,
      fileCount: snap.fileCount,
      distinctMessageCount: snap.distinctMessageCount,
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
