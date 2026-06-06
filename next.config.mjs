import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Two build targets share one codebase:
//   • default  — local SSR app; the Node server reads ~/.claude via /api/*.
//   • static   — hosted, browser-ingest build (BUILD_TARGET=static); exported to
//                out/ with no server. scripts/build-static.mjs stashes app/api
//                out of the way (force-dynamic routes can't be exported) and sets
//                NEXT_PUBLIC_STATIC_MODE=1 so the client ingests on-device.
const isStatic = process.env.BUILD_TARGET === "static";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app reads ~/.claude with the Node fs APIs at request time. Keep server
  // code on the Node runtime (never edge) and don't try to bundle the data dir.
  // Pin the file-tracing root to this folder so the parent resume repo's lockfile
  // isn't mistaken for the workspace root.
  outputFileTracingRoot: __dirname,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  ...(isStatic
    ? {
        output: "export",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
