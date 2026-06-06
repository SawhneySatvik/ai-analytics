// Thin launcher. Handle --no-color BEFORE anything pulls in ink/chalk (whose
// color level is decided at import time), then defer to main().
const argv = process.argv.slice(2);
if (argv.includes("--no-color")) process.env.NO_COLOR = "1";

// OpenCode reads its SQLite DB via the experimental `node:sqlite`, which emits an
// ExperimentalWarning to stderr — that would corrupt the alt-screen TUI. Swallow
// just that warning; let everything else through.
process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w.name === "ExperimentalWarning" && /SQLite/i.test(w.message)) return;
  process.stderr.write(`${w.name}: ${w.message}\n`);
});

const { main } = await import("./main.js");
await main(argv);

export {};
