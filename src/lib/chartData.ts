// Pure, client-safe transforms from API records to chart-friendly rows.
import type { DailyRecord, ModelRecord } from "./types";
import type { SourceRecord } from "./aggregate";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a "YYYY-MM-DD" key as "Jun 6" without any timezone shifting. */
export function fmtDayLabel(s: string | number): string {
  const str = String(s);
  const [y, m, d] = str.split("-").map(Number);
  if (!m || !d) return str;
  void y;
  return `${MONTHS[m - 1]} ${d}`;
}

export interface DailyRow {
  date: string;
  input: number;
  output: number;
  cacheCreate: number;
  cacheRead: number;
  total: number;
  billable: number;
  cost: number;
  messages: number;
  sessions: number;
  toolCalls: number;
  cacheHitRate: number;
}

export function flattenDaily(daily: DailyRecord[]): DailyRow[] {
  return daily.map((d) => {
    const u = d.usage;
    const cacheDenom = u.cacheRead + u.cacheCreate;
    return {
      date: d.date,
      input: u.input,
      output: u.output,
      cacheCreate: u.cacheCreate,
      cacheRead: u.cacheRead,
      total: u.input + u.output + u.cacheCreate + u.cacheRead,
      billable: u.input + u.output + u.cacheCreate,
      cost: d.cost,
      messages: d.messageCount,
      sessions: d.sessionCount,
      toolCalls: d.toolCallCount,
      cacheHitRate: cacheDenom > 0 ? u.cacheRead / cacheDenom : 0,
    };
  });
}

type SeriesModel = Pick<ModelRecord, "key" | "label" | "color">;

export function dailyModelSeries(daily: DailyRecord[], models: SeriesModel[]) {
  const data = daily.map((d) => {
    const row: Record<string, unknown> = { date: d.date };
    for (const m of models) row[m.key] = d.tokensByModel[m.key] ?? 0;
    return row;
  });
  const series = models.map((m) => ({ key: m.key, name: m.label, color: m.color }));
  return { data, series };
}

export function dailySourceSeries(daily: DailyRecord[], sources: SourceRecord[]) {
  const data = daily.map((d) => {
    const row: Record<string, unknown> = { date: d.date };
    for (const s of sources) row[s.source] = d.tokensBySource[s.source] ?? 0;
    return row;
  });
  const series = sources.map((s) => ({ key: s.source, name: s.label, color: s.color }));
  return { data, series };
}
