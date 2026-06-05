// Client-facing response shapes. Type-only imports from the server lib are
// erased at build time, so importing these into client components is safe.
import type {
  DailyRecord,
  ModelRecord,
  ProjectRecord,
  SessionRecord,
} from "./types";
import type {
  Summary,
  ToolStat,
  SubagentStat,
  HeatCell,
  FilterOptions,
  TimelinePoint,
} from "./aggregate";

export interface SnapshotMeta {
  builtAt: number;
  buildMs: number;
  timezone: string;
  fileCount: number;
  lineCount: number;
  assistantLineCount: number;
  distinctMessageCount: number;
  duplicateLineCount: number;
  malformedLineCount: number;
  warnings: string[];
}

export interface BranchStat {
  branch: string;
  messageCount: number;
  tokens: number;
  cost: number;
}

export interface SpeedStat {
  speed: string;
  messageCount: number;
  tokens: number;
}

export interface CommandStats {
  topCommands: { command: string; count: number }[];
  totalPrompts: number;
  totalCommands: number;
}

export interface ToolSummary {
  tools: ToolStat[];
  totalToolCalls: number;
  webSearch: number;
  webFetch: number;
}

export interface HeatmapData {
  cells: HeatCell[];
  hourTotals: number[];
  weekdayTotals: number[];
}

export interface SummaryResponse {
  meta: SnapshotMeta;
  summary: Summary;
  daily: DailyRecord[];
  models: ModelRecord[];
  projects: ProjectRecord[];
  tools: ToolSummary;
  subagents: SubagentStat[];
  branches: BranchStat[];
  speeds: SpeedStat[];
  heatmap: HeatmapData;
  commands: CommandStats;
}

export interface SessionsResponse {
  sessions: SessionRecord[];
}

export interface SessionDetailResponse {
  session: SessionRecord;
  summary: Summary;
  timeline: TimelinePoint[];
  tools: ToolSummary;
  subagents: SubagentStat[];
  models: ModelRecord[];
}

export interface MetaResponse {
  builtAt: number;
  buildMs: number;
  timezone: string;
  fileCount: number;
  lineCount: number;
  assistantLineCount: number;
  distinctMessageCount: number;
  duplicateLineCount: number;
  malformedLineCount: number;
  warnings: string[];
  options: FilterOptions;
}
