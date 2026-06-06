import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/cache";
import { buildMetaResponse } from "@/lib/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snap = await getSnapshot();
    return NextResponse.json(buildMetaResponse(snap));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ingestion failed" },
      { status: 500 },
    );
  }
}
