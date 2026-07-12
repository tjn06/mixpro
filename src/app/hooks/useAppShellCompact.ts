import { useLayoutEffect, useRef, useState } from "react";
import {
  isFormFieldFocused,
  readStableShellHeightPx,
} from "../layout/applyStableViewportHeight";

function readAppRefHeightPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--app-ref-h").trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 764;
}

/** True when shell height is at or below `--app-ref-h` (764px). Ignores keyboard resize. */
export function useAppShellCompact(): boolean {
  const [compact, setCompact] = useState(false);
  const lastCompactRef = useRef(false);

  useLayoutEffect(() => {
    const shell = document.querySelector(".app-frame-host");
    if (!shell) return;

    const sync = () => {
      if (isFormFieldFocused()) {
        setCompact(lastCompactRef.current);
        return;
      }

      const refH = readAppRefHeightPx();
      const stableH = readStableShellHeightPx();
      const h = stableH ?? shell.getBoundingClientRect().height;
      const next = h <= refH;
      lastCompactRef.current = next;
      setCompact(next);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(shell);
    window.addEventListener("focusin", sync);
    window.addEventListener("focusout", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("focusin", sync);
      window.removeEventListener("focusout", sync);
    };
  }, []);

  return compact;
}
