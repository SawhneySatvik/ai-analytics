import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";
import { DashboardProvider } from "@/components/dashboard-context";
import { SnapshotProvider } from "@/components/snapshot-provider";
import { Shell } from "@/components/Shell";

// Set NEXT_PUBLIC_SITE_URL on the host to your real domain so OG/Twitter image
// URLs resolve absolutely; the fallback keeps previews working out of the box.
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://agentmon.vercel.app";
const DESCRIPTION =
  "agentmon turns your local Claude Code, Codex & OpenCode transcripts into a beautiful tokens, cost, models, sessions and activity dashboard — on your machine, nothing uploaded.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "agentmon — local-first AI coding usage analytics",
    template: "%s · agentmon",
  },
  description: DESCRIPTION,
  applicationName: "agentmon",
  authors: [{ name: "Satvik Sawhney", url: "https://satviksawhney.vercel.app" }],
  keywords: [
    "agentmon",
    "Claude Code",
    "Codex",
    "OpenCode",
    "AI coding analytics",
    "token usage",
    "LLM cost",
    "local-first",
  ],
  openGraph: {
    type: "website",
    siteName: "agentmon",
    url: SITE,
    title: "agentmon — local-first AI coding usage analytics",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "agentmon — local-first AI coding usage analytics",
    description: DESCRIPTION,
  },
};

// Resolve and apply the saved theme before paint to avoid a flash. Mirrors
// src/lib/themes.ts (kept inline + dependency-free so it runs in <head>).
const themeScript = `(function(){try{var LIGHT={paper:1,rose:1,solar:1};var t=localStorage.getItem('ca-theme')||'midnight';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'paper':'midnight'):t;var el=document.documentElement;el.setAttribute('data-theme',r);el.classList.toggle('dark',!LIGHT[r]);}catch(e){var d=document.documentElement;d.setAttribute('data-theme','midnight');d.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SnapshotProvider>
          <DashboardProvider>
            <Shell>{children}</Shell>
          </DashboardProvider>
        </SnapshotProvider>
      </body>
    </html>
  );
}
