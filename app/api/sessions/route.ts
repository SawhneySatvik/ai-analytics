import { NextResponse } from "next/server";

import { getSnapshot } from "@/lib/cache";
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
      const msgs = snap.messages.filter((m) => m.sessionId === id);
      if (msgs.length === 0) {
        return NextResponse.json({ error: "session not found" }, { status: 404 });
      }
      const [session] = sessionList(msgs, snap.sessionMeta);
      return NextResponse.json({
        session,
        summary: summarize(msgs),
        timeline: sessionTimeline(msgs),
        tools: toolBreakdown(msgs),
        subagents: subagentBreakdown(msgs),
        models: modelBreakdown(msgs),
      });
    }

    // ── filtered session list ──────────────────────────────────────────────────
    const filters = parseFilters(url.searchParams);
    const messages = applyFilters(snap.messages, filters);
    return NextResponse.json({ sessions: sessionList(messages, snap.sessionMeta) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ingestion failed" },
      { status: 500 },
    );
  }
}
