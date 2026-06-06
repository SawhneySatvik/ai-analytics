import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/cache";
import { filterKey, memoizeQuery } from "@/lib/queryCache";
import { parseFilters } from "@/lib/request";
import { buildSummaryResponse } from "@/lib/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const snap = await getSnapshot();
    const url = new URL(req.url);
    const body = memoizeQuery(snap, "summary:" + filterKey(url.searchParams), () =>
      buildSummaryResponse(snap, parseFilters(url.searchParams)),
    );
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ingestion failed" },
      { status: 500 },
    );
  }
}
