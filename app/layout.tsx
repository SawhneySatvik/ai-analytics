import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";
import { DashboardProvider } from "@/components/dashboard-context";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "CLI Usage Analytics",
  description: "Local-first analytics over your Claude Code, Codex, and OpenCode usage.",
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
        <DashboardProvider>
          <Shell>{children}</Shell>
        </DashboardProvider>
      </body>
    </html>
  );
}
