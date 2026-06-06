// Builds the hosted, browser-ingest static site into out/.
//
// `output: 'export'` can't coexist with the force-dynamic app/api routes, so we
// temporarily stash app/api, run the export build with BUILD_TARGET=static +
// NEXT_PUBLIC_STATIC_MODE=1, then always restore app/api (try/finally). The
// local SSR build (`npm run build`) is untouched.

import { spawnSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "app", "api");
const stash = join(root, ".api-stash");
const nextBin = join(root, "node_modules", ".bin", "next");

function run(cmd, args, env) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: root, env });
  return res.status ?? 1;
}

// 1. refresh the bundled demo dataset
if (run(process.execPath, [join(root, "scripts", "gen-demo.mjs")], process.env) !== 0) {
  process.exit(1);
}

// 2. stash app/api, export, restore
let moved = false;
try {
  if (existsSync(apiDir)) {
    if (existsSync(stash)) rmSync(stash, { recursive: true, force: true });
    renameSync(apiDir, stash);
    moved = true;
  }

  const code = run(nextBin, ["build"], {
    ...process.env,
    BUILD_TARGET: "static",
    NEXT_PUBLIC_STATIC_MODE: "1",
  });
  if (code !== 0) process.exit(code);
} finally {
  if (moved) {
    if (existsSync(apiDir)) rmSync(apiDir, { recursive: true, force: true });
    renameSync(stash, apiDir);
  }
}

console.log("\n✓ Static site exported to out/  (deploy this directory)");
