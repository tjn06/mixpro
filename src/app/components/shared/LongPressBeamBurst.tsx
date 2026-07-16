import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cv } from "../../ui/tokens";

const FALLBACK_RADIUS = 14;
/** Fixed side beams — below holding buttons (see BUTTON_OVER_BEAM_Z). */
export const BEAM_Z = 18;

type Layout = {
  top: number;
  height: number;
  canvasLeft: number;
  canvasRight: number;
  buttonLeft: number;
  buttonRight: number;
  underlapLeft: number;
  underlapRight: number;
};

function parseRadiusPx(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function measureLayout(anchor: HTMLElement, canvas: HTMLElement): Layout {
  const a = anchor.getBoundingClientRect();
  const c = canvas.getBoundingClientRect();

  const cs = getComputedStyle(anchor);
  const borderX = Math.max(
    parseFloat(cs.borderLeftWidth) || 0,
    parseFloat(cs.borderRightWidth) || 0,
  );
  const cornerCap = Math.min(a.width, a.height) / 2;

  const cornerLeft = Math.min(
    Math.max(
      parseRadiusPx(cs.borderTopLeftRadius),
      parseRadiusPx(cs.borderBottomLeftRadius),
      FALLBACK_RADIUS,
    ),
    cornerCap,
  );
  const cornerRight = Math.min(
    Math.max(
      parseRadiusPx(cs.borderTopRightRadius),
      parseRadiusPx(cs.borderBottomRightRadius),
      FALLBACK_RADIUS,
    ),
    cornerCap,
  );

  return {
    top: a.top,
    height: a.height,
    canvasLeft: c.left,
    canvasRight: c.right,
    buttonLeft: a.left,
    buttonRight: a.right,
    underlapLeft: cornerLeft + borderX,
    underlapRight: cornerRight + borderX,
  };
}

function SideBar({
  side,
  layout,
  progress,
  color,
  zIndex,
}: {
  side: "left" | "right";
  layout: Layout;
  progress: number;
  color: string;
  zIndex: number;
}) {
  const h = layout.height;
  const span =
    side === "left"
      ? layout.buttonLeft - layout.canvasLeft
      : layout.canvasRight - layout.buttonRight;
  if (span <= 0 || h <= 0) return null;

  const underlap = side === "left" ? layout.underlapLeft : layout.underlapRight;
  const barW = span + underlap;
  const left = side === "left" ? layout.canvasLeft : layout.buttonRight - underlap;
  /** Progress uses visible strip only (canvas edge → button edge). */
  const fillW = span * progress;
  const hidden = span - fillW;

  const clipPath =
    side === "left"
      ? `inset(0 0 0 ${hidden}px)`
      : `inset(0 ${hidden}px 0 0)`;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed overflow-hidden"
      style={{ left, top: layout.top, width: barW, height: h, zIndex }}
    >
      <div className="absolute inset-0" style={{ background: cv.longPress.beamTrack }} />
      {fillW > 0 && (
        <div
          className="absolute inset-0"
          style={{
            background: color,
            clipPath,
            filter: `drop-shadow(0 0 5px ${color}88)`,
          }}
        />
      )}
    </div>
  );
}

function resolveCanvas(
  anchor: HTMLElement,
  edgeContainerRef?: RefObject<HTMLElement | null>,
) {
  return (
    edgeContainerRef?.current
    ?? anchor.closest<HTMLElement>("[data-beam-canvas]")
    ?? anchor.closest<HTMLElement>(".app-frame")
  );
}

export function LongPressBeamBurst({
  progress,
  anchorRef,
  accentColor,
  edgeContainerRef,
  zIndex = BEAM_Z,
}: {
  progress: number;
  anchorRef: RefObject<HTMLElement | null>;
  accentColor?: string;
  edgeContainerRef?: RefObject<HTMLElement | null>;
  /** Override when beams must sit above a cover sheet (default BEAM_Z). */
  zIndex?: number;
}) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const color = accentColor ?? cv.longPress.progress;

  useLayoutEffect(() => {
    if (progress <= 0) {
      setLayout(null);
      return;
    }

    const measure = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const canvas = resolveCanvas(anchor, edgeContainerRef);
      if (!canvas) return;
      setLayout(measureLayout(anchor, canvas));
    };

    measure();

    const anchor = anchorRef.current;
    const canvas = anchor ? resolveCanvas(anchor, edgeContainerRef) : null;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) {
      if (anchor) ro.observe(anchor);
      if (canvas) ro.observe(canvas);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [progress, anchorRef, edgeContainerRef]);

  if (progress <= 0 || !layout) return null;

  return createPortal(
    <>
      <SideBar side="left" layout={layout} progress={progress} color={color} zIndex={zIndex} />
      <SideBar side="right" layout={layout} progress={progress} color={color} zIndex={zIndex} />
    </>,
    document.body,
  );
}
