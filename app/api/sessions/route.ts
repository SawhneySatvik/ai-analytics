import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/cache";
import { filterKey, memoizeQuery } from "@/lib/queryCache";
import { parseFilters } from "@/lib/request";
import { buildSessionsResponse, buildSessionDetailResponse } from "@/lib/responses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const snap = await getSnapshot();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const detail = memoizeQuery(snap, "session:" + id, () => buildSessionDetailResponse(snap, id));
      if (!detail) {
        return NextResponse.json({ error: "session not found" }, { status: 404 });
      }
      return NextResponse.json(detail);
    }

    const body = memoizeQuery(snap, "sessions:" + filterKey(url.searchParams), () =>
      buildSessionsResponse(snap, parseFilters(url.searchParams)),
    );
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ingestion failed" },
      { status: 500 },
    );
  }
}
