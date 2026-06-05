import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "./globals.css";
import { DashboardProvider } from "@/components/dashboard-context";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Claude Usage Analytics",
  description: "Local-first analytics over your ~/.claude usage data.",
};

// Set the theme class before paint to avoid a flash. Defaults to dark.
const themeScript = `(function(){try{var t=localStorage.getItem('ca-theme');if(t!=='light'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

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
