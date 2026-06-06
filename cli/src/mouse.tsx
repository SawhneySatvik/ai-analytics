import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ClickFn = (x: number, y: number) => void;
type WheelFn = (dir: "up" | "down", x: number, y: number) => void;

interface MouseApi {
  onClick: (fn: ClickFn) => () => void;
  onWheel: (fn: WheelFn) => () => void;
  /** Hover cell, tracked only on the top two rows (tabs + filter bar). */
  hoverX: number;
  hoverY: number;
}

const Ctx = createContext<MouseApi | null>(null);

// 1003 = report all motion (for hover), 1006 = SGR extended coordinates.
const ENABLE = "\x1b[?1003h\x1b[?1006h";
const DISABLE = "\x1b[?1003l\x1b[?1006l";
const SGR = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

export function MouseProvider({ children }: { children: React.ReactNode }) {
  const clickFns = useRef(new Set<ClickFn>());
  const wheelFns = useRef(new Set<WheelFn>());
  const [hover, setHover] = useState({ x: -1, y: -1 });

  useEffect(() => {
    const stdin = process.stdin;
    if (!stdin.isTTY || !process.stdout.isTTY) return;
    process.stdout.write(ENABLE);

    const onData = (buf: Buffer) => {
      const s = buf.toString("latin1");
      let m: RegExpExecArray | null;
      SGR.lastIndex = 0;
      while ((m = SGR.exec(s))) {
        const b = Number(m[1]);
        const x = Number(m[2]) - 1;
        const y = Number(m[3]) - 1;
        const press = m[4] === "M";
        if (b & 64) {
          const dir = b & 1 ? "down" : "up";
          for (const fn of wheelFns.current) fn(dir, x, y);
        } else if (b & 32) {
          // motion — only track hover over the tab/filter rows to avoid flooding
          if (y < 2) setHover((h) => (h.x === x && h.y === y ? h : { x, y }));
          else setHover((h) => (h.y < 0 ? h : { x: -1, y: -1 }));
        } else if (press) {
          for (const fn of clickFns.current) fn(x, y);
        }
      }
    };

    stdin.on("data", onData);
    const restore = () => process.stdout.write(DISABLE);
    process.once("exit", restore);
    return () => {
      stdin.off("data", onData);
      process.off("exit", restore);
      restore();
    };
  }, []);

  const onClick = useCallback((fn: ClickFn) => {
    clickFns.current.add(fn);
    return () => {
      clickFns.current.delete(fn);
    };
  }, []);
  const onWheel = useCallback((fn: WheelFn) => {
    wheelFns.current.add(fn);
    return () => {
      wheelFns.current.delete(fn);
    };
  }, []);

  return <Ctx.Provider value={{ onClick, onWheel, hoverX: hover.x, hoverY: hover.y }}>{children}</Ctx.Provider>;
}

const NOOP: MouseApi = { onClick: () => () => {}, onWheel: () => () => {}, hoverX: -1, hoverY: -1 };

export function useMouse(): MouseApi {
  return useContext(Ctx) ?? NOOP;
}
