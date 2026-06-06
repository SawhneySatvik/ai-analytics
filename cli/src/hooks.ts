import { useEffect, useState } from "react";
import { useStdout } from "ink";

const ENTER_ALT = "\x1b[?1049h";
const LEAVE_ALT = "\x1b[?1049l";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

/**
 * Run the app on the terminal's alternate screen buffer (vim/htop style) and
 * always restore the normal screen — on unmount, on Ctrl-C/SIGTERM, and on
 * process exit — so a crash never strands the terminal. No-op when not a TTY
 * (piped output / tests).
 */
export function useFullscreen() {
  useEffect(() => {
    if (!process.stdout.isTTY) return;
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      process.stdout.write(SHOW_CURSOR);
      process.stdout.write(LEAVE_ALT);
    };
    const onSignal = () => {
      restore();
      process.exit(0);
    };
    process.stdout.write(ENTER_ALT);
    process.stdout.write(HIDE_CURSOR);
    process.once("exit", restore);
    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
    return () => {
      process.off("exit", restore);
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      restore();
    };
  }, []);
}

/** Current terminal [columns, rows], updated on resize. */
export function useDimensions(): [number, number] {
  const { stdout } = useStdout();
  const [size, setSize] = useState<[number, number]>([stdout?.columns || 80, stdout?.rows || 24]);
  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setSize([stdout.columns || 80, stdout.rows || 24]);
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);
  return size;
}
