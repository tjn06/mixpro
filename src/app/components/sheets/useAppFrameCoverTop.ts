import { useCallback, useLayoutEffect, useState } from "react";

/** Bottom edge of the main header bar — covers subline + recipe zone below it. */
export function measureAppFrameCoverTop(frame: HTMLElement): number | null {
  const header = frame.querySelector<HTMLElement>(".app-header");
  if (!header) return null;
  const frameRect = frame.getBoundingClientRect();
  const headerRect = header.getBoundingClientRect();
  return Math.max(0, headerRect.bottom - frameRect.top);
}

export function useAppFrameCoverTop(active: boolean): number | null {
  const [coverTop, setCoverTop] = useState<number | null>(null);

  const measure = useCallback(() => {
    const frame = document.querySelector<HTMLElement>(".app-frame");
    if (!frame) {
      setCoverTop(null);
      return;
    }
    setCoverTop(measureAppFrameCoverTop(frame));
  }, []);

  useLayoutEffect(() => {
    if (!active) {
      setCoverTop(null);
      return;
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, measure]);

  return coverTop;
}
