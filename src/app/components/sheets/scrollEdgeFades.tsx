import { useCallback, useEffect, useState, type RefObject } from "react";

export const SCROLL_EDGE_FADE_H = 36;
const EDGE_THRESHOLD = 4;

export function useScrollEdgeFades(
  scrollRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  /** Re-measure when scroll content size may change (expand/collapse, filter, etc.). */
  watchKey?: unknown,
) {
  const [edges, setEdges] = useState({ fromTop: false, fromBottom: false });

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canScroll = el.scrollHeight > el.clientHeight + EDGE_THRESHOLD;
    setEdges({
      fromTop: canScroll && el.scrollTop > EDGE_THRESHOLD,
      fromBottom:
        canScroll &&
        el.scrollTop + el.clientHeight < el.scrollHeight - EDGE_THRESHOLD,
    });
  }, [scrollRef]);

  useEffect(() => {
    if (!enabled) {
      setEdges({ fromTop: false, fromBottom: false });
      return;
    }
    sync();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [enabled, sync, watchKey]);

  return edges;
}

function ScrollEdgeFade({ edge }: { edge: "top" | "bottom" }) {
  const isTop = edge === "top";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-10"
      style={{
        height: SCROLL_EDGE_FADE_H,
        ...(isTop ? { top: 0 } : { bottom: 0 }),
        background: isTop
          ? "linear-gradient(to bottom, var(--ui-header-bg) 0%, transparent 100%)"
          : "linear-gradient(to top, var(--ui-header-bg) 0%, transparent 100%)",
      }}
    />
  );
}

/** Overlay fades — only render edges with scrollable overflow in that direction. */
export function ScrollEdgeFadeOverlays({
  fromTop,
  fromBottom,
}: {
  fromTop: boolean;
  fromBottom: boolean;
}) {
  return (
    <>
      {fromTop ? <ScrollEdgeFade edge="top" /> : null}
      {fromBottom ? <ScrollEdgeFade edge="bottom" /> : null}
    </>
  );
}
