import { useLayoutEffect, useState } from "react";

function readAppRefHeightPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--app-ref-h").trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 764;
}

/** True when `.app-frame-host` height is at or below `--app-ref-h` (764px). */
export function useAppShellCompact(): boolean {
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const shell = document.querySelector(".app-frame-host");
    if (!shell) return;

    const sync = () => {
      const refH = readAppRefHeightPx();
      const h = shell.getBoundingClientRect().height;
      setCompact(h <= refH);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(shell);
    return () => ro.disconnect();
  }, []);

  return compact;
}
