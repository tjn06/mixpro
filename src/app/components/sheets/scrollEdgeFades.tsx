import {
  useCallback,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";

export const SCROLL_EDGE_FADE_H = 36;
const EDGE_THRESHOLD = 4;

function measureScrollEdges(el: HTMLElement) {
  const canScroll = el.scrollHeight > el.clientHeight + EDGE_THRESHOLD;
  return {
    fromTop: canScroll && el.scrollTop > EDGE_THRESHOLD,
    fromBottom:
      canScroll &&
      el.scrollTop + el.clientHeight < el.scrollHeight - EDGE_THRESHOLD,
  };
}

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
    setEdges(measureScrollEdges(el));
  }, [scrollRef]);

  useLayoutEffect(() => {
    if (!enabled) {
      setEdges({ fromTop: false, fromBottom: false });
      return;
    }

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      sync();
      raf2 = requestAnimationFrame(sync);
    });

    const el = scrollRef.current;
    if (!el) {
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }

    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);

    const ro = new ResizeObserver(sync);
    ro.observe(el);
    if (el.firstElementChild) {
      ro.observe(el.firstElementChild);
    }

    const mo = new MutationObserver(sync);
    mo.observe(el, { childList: true, subtree: true, attributes: true });

    sync();

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      ro.disconnect();
      mo.disconnect();
    };
  }, [enabled, sync, watchKey]);

  return edges;
}

function ScrollEdgeFade({ edge }: { edge: "top" | "bottom" }) {
  const isTop = edge === "top";
  return (
    <div
      aria-hidden
      className="scroll-edge-fade pointer-events-none absolute inset-x-0"
      style={{
        height: SCROLL_EDGE_FADE_H,
        zIndex: 12,
        ...(isTop ? { top: 0 } : { bottom: 0 }),
        background: isTop
          ? "linear-gradient(to bottom, var(--scroll-edge-fade-color, var(--ui-header-bg)) 0%, transparent 100%)"
          : "linear-gradient(to top, var(--scroll-edge-fade-color, var(--ui-header-bg)) 0%, transparent 100%)",
      }}
    />
  );
}

/** Overlay fades — only when scrollable content exists in that direction. */
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
