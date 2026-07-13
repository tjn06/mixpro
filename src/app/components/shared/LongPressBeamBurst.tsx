import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { componentTokens } from "../../ui/tokens";

const lp = componentTokens.longPress;
const FALLBACK_RADIUS = 14;
/** Above panel chrome inside the beam canvas; sheets use their own canvas at z≈31. */
export const BEAM_Z = 20;

type Layout = {
  top: number;
  height: number;
  buttonLeft: number;
  buttonRight: number;
  canvasWidth: number;
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
    top: a.top - c.top,
    height: a.height,
    buttonLeft: a.left - c.left,
    buttonRight: a.right - c.left,
    canvasWidth: canvas.clientWidth,
    underlapLeft: cornerLeft + borderX,
    underlapRight: cornerRight + borderX,
  };
}

function SideBar({
  side,
  layout,
  progress,
  color,
}: {
  side: "left" | "right";
  layout: Layout;
  progress: number;
  color: string;
}) {
  const h = layout.height;
  const span =
    side === "left" ? layout.buttonLeft : layout.canvasWidth - layout.buttonRight;
  if (span <= 0 || h <= 0) return null;

  const underlap = side === "left" ? layout.underlapLeft : layout.underlapRight;
  const barW = span + underlap;
  const left = side === "left" ? 0 : layout.buttonRight - underlap;
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
      className="pointer-events-none absolute overflow-hidden"
      style={{ left, top: layout.top, width: barW, height: h, zIndex: BEAM_Z }}
    >
      <div className="absolute inset-0" style={{ background: lp.beamTrack }} />
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
}: {
  progress: number;
  anchorRef: RefObject<HTMLElement | null>;
  accentColor?: string;
  edgeContainerRef?: RefObject<HTMLElement | null>;
}) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const color = accentColor ?? lp.progress;

  useLayoutEffect(() => {
    if (progress <= 0) {
      setLayout(null);
      setPortal(null);
      return;
    }

    const measure = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const canvas = resolveCanvas(anchor, edgeContainerRef);
      if (!canvas) return;
      setPortal(canvas);
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

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [progress, anchorRef, edgeContainerRef]);

  if (progress <= 0 || !layout || !portal) return null;

  return createPortal(
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: BEAM_Z }} aria-hidden>
      <SideBar side="left" layout={layout} progress={progress} color={color} />
      <SideBar side="right" layout={layout} progress={progress} color={color} />
    </div>,
    portal,
  );
}
