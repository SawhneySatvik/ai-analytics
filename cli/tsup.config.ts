import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Bundle the CLI + the shared `src/lib` data layer into a single ESM file with a
// shebang. React + Ink stay external (installed from npm at runtime), so the
// published package only pulls those two — never next/recharts.
export default defineConfig({
  entry: { index: "src/index.tsx" },
  format: ["esm"],
  target: "node18",
  platform: "node",
  bundle: true,
  clean: true,
  sourcemap: false,
  dts: false,
  banner: { js: "#!/usr/bin/env node" },
  // resvg is an optional native dep, loaded lazily at runtime for image export —
  // keep it external so it resolves from node_modules (and stays optional).
  external: ["react", "react/*", "ink", "ink/*", "@resvg/resvg-js"],
  esbuildOptions(options) {
    options.alias = { "@core": path.resolve(__dirname, "../src/lib") };
    options.jsx = "automatic";
  },
});
