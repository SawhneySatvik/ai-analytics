import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
};

export default nextConfig;
