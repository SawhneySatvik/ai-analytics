// Maps the dashboard's API endpoint URLs to the SAME pure response builders the
// Node routes use, but against an in-browser Snapshot. This is what makes the
// hosted static client byte-identical to the local SSR app.

import { parseFilters } from "./request";
import {
  buildMetaResponse,
  buildSessionDetailResponse,
  buildSessionsResponse,
  buildSummaryResponse,
} from "./responses";
import type { Snapshot } from "./types";

/** Resolve an `/api/*` URL (path + query) locally from a Snapshot. */
export function resolveLocal(url: string, snap: Snapshot): unknown {
  const qIdx = url.indexOf("?");
  const path = qIdx >= 0 ? url.slice(0, qIdx) : url;
  const params = new URLSearchParams(qIdx >= 0 ? url.slice(qIdx + 1) : "");
  const filters = parseFilters(params);

  switch (path) {
    case "/api/summary":
      return buildSummaryResponse(snap, filters);
    case "/api/sessions": {
      const id = params.get("id");
      if (id) {
        const detail = buildSessionDetailResponse(snap, id);
        if (!detail) throw new Error("session not found");
        return detail;
      }
      return buildSessionsResponse(snap, filters);
    }
    case "/api/meta":
    case "/api/refresh":
      return buildMetaResponse(snap);
    default:
      throw new Error(`unknown endpoint ${path}`);
  }
}
