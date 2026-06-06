import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/cache";
import { filterKey, memoizeQuery } from "@/lib/queryCache";
import { parseFilters } from "@/lib/request";
import {
  applyFilters,
  sessionList,
  sessionTimeline,
  summarize,
  toolBreakdown,
  subagentBreakdown,
  modelBreakdown,
} from "@/lib/aggregate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const snap = await getSnapshot();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    // ── single-session detail ────────────────────────────────────────────────
    if (id) {
      const detail = memoizeQuery(snap, "session:" + id, () => {
        const msgs = snap.messages.filter((m) => m.sessionId === id);
        if (msgs.length === 0) return null;
        const [session] = sessionList(msgs, snap.sessionMeta);
        return {
          session,
          summary: summarize(msgs),
          timeline: sessionTimeline(msgs),
          tools: toolBreakdown(msgs),
          subagents: subagentBreakdown(msgs),
          models: modelBreakdown(msgs),
        };
      });
      if (!detail) {
        return NextResponse.json({ error: "session not found" }, { status: 404 });
      }
      return NextResponse.json(detail);
    }

    // ── filtered session list ──────────────────────────────────────────────────
    const body = memoizeQuery(snap, "sessions:" + filterKey(url.searchParams), () => {
      const filters = parseFilters(url.searchParams);
      const messages = applyFilters(snap.messages, filters);
      return { sessions: sessionList(messages, snap.sessionMeta) };
    });
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ingestion failed" },
      { status: 500 },
    );
  }
}
