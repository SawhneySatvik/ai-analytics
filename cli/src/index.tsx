// Thin launcher. Handle --no-color BEFORE anything pulls in ink/chalk (whose
// color level is decided at import time), then defer to main().
const argv = process.argv.slice(2);
if (argv.includes("--no-color")) process.env.NO_COLOR = "1";

const { main } = await import("./main.js");
await main(argv);

export {};
