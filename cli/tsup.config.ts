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
  external: ["react", "react/*", "ink", "ink/*"],
  esbuildOptions(options) {
    options.alias = { "@core": path.resolve(__dirname, "../src/lib") };
    options.jsx = "automatic";
  },
});
