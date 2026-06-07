"use client";

// The home route serves two build targets:
//   • hosted (static)  — the marketing Landing is the front door, always shown;
//                        the dashboard lives under /overview.
//   • local (SSR)      — there is no connect step, so go straight to the Overview.
import { STATIC_MODE } from "@/components/snapshot-provider";
import { Landing } from "@/components/Landing";
import { Overview } from "@/components/Overview";

export default function Home() {
  return STATIC_MODE ? <Landing /> : <Overview />;
}
