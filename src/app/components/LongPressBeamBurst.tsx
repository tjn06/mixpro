import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

const DEFAULT_BAR_COLOR = "#9090b8";
const BAR_Z_INDEX = 40;
const TRACK_COLOR = "rgba(255,255,255,0.07)";

type SideBarMetrics = {
  centerY: number;
  barHeight: number;
  anchorLeft: number;
  anchorRight: number;
  edgeLeft: number;
  edgeRight: number;
  maxLeft: number;
  maxRight: number;
};

function resolveEdgeContainer(
  anchor: HTMLElement,
  edgeContainerRef?: RefObject<HTMLElement | null>,
) {
  return (
    edgeContainerRef?.current
    ?? anchor.closest<HTMLElement>(".mobile-shell__slot")
    ?? anchor.closest<HTMLElement>(".mobile-shell")
  );
}

function measureSideBarMetrics(
  anchor: HTMLElement,
  edge: HTMLElement,
): SideBarMetrics {
  const anchorRect = anchor.getBoundingClientRect();
  const edgeRect = edge.getBoundingClientRect();
  const maxLeft = anchorRect.left - edgeRect.left;
  const maxRight = edgeRect.right - anchorRect.right;
  return {
    centerY: anchorRect.top + anchorRect.height / 2,
    barHeight: anchorRect.height,
    anchorLeft: anchorRect.left,
    anchorRight: anchorRect.right,
    edgeLeft: edgeRect.left,
    edgeRight: edgeRect.right,
    maxLeft,
    maxRight,
  };
}

function sideFillWidth(
  side: "left" | "right",
  metrics: SideBarMetrics,
  progress: number,
): number {
  const span = side === "left" ? metrics.maxLeft : metrics.maxRight;
  return span * progress;
}

function SideLoadingBar({
  side,
  metrics,
  progress,
  color,
}: {
  side: "left" | "right";
  metrics: SideBarMetrics;
  progress: number;
  color: string;
}) {
  const span = side === "left" ? metrics.maxLeft : metrics.maxRight;
  const fillW = sideFillWidth(side, metrics, progress);
  if (span <= 0) return null;

  const trackLeft = side === "left" ? metrics.edgeLeft : metrics.anchorRight;
  const fillLeft = side === "left" ? metrics.anchorLeft - fillW : metrics.anchorRight;

  return (
    <>
      <div
        className="pointer-events-none"
        style={{
          position: "fixed",
          left: trackLeft,
          top: metrics.centerY,
          width: span,
          height: metrics.barHeight,
          transform: "translateY(-50%)",
          background: TRACK_COLOR,
          zIndex: BAR_Z_INDEX,
        }}
        aria-hidden
      />
      {fillW > 0 && (
        <div
          className="pointer-events-none"
          style={{
            position: "fixed",
            left: fillLeft,
            top: metrics.centerY,
            width: fillW,
            height: metrics.barHeight,
            transform: "translateY(-50%)",
            background: color,
            zIndex: BAR_Z_INDEX + 1,
          }}
          aria-hidden
        />
      )}
    </>
  );
}

export function LongPressBeamBurst({
  progress,
  anchorRef,
  accentColor,
  edgeContainerRef,
}: {
  progress: number;
  anchorRef: RefObject<HTMLElement | null>;
  accentColor?: string;
  edgeContainerRef?: RefObject<HTMLElement | null>;
}) {
  const [metrics, setMetrics] = useState<SideBarMetrics | null>(null);
  const color = accentColor ?? DEFAULT_BAR_COLOR;

  useLayoutEffect(() => {
    if (progress <= 0) {
      setMetrics(null);
      return;
    }
    const anchor = anchorRef.current;
    if (!anchor) return;
    const edge = resolveEdgeContainer(anchor, edgeContainerRef);
    if (!edge) return;
    setMetrics(measureSideBarMetrics(anchor, edge));
  }, [progress, anchorRef, edgeContainerRef]);

  if (progress <= 0 || !metrics) return null;

  return createPortal(
    <>
      <SideLoadingBar side="left" metrics={metrics} progress={progress} color={color} />
      <SideLoadingBar side="right" metrics={metrics} progress={progress} color={color} />
    </>,
    document.body,
  );
}
