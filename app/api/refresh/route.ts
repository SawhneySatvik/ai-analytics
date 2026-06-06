import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/cache";
import { buildMetaResponse } from "@/lib/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Force a full re-ingest of ~/.claude, bypassing the file-signature cache. */
export async function POST() {
  try {
    const snap = await getSnapshot(true);
    return NextResponse.json(buildMetaResponse(snap));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ingestion failed" },
      { status: 500 },
    );
  }
}
