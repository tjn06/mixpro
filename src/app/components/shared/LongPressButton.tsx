import React, { forwardRef, useRef, useState, useCallback, useLayoutEffect, createContext, useContext, type CSSProperties, type PointerEvent, type RefObject, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useLongPressProgressReporter } from "./LongPressProgressContext";
import { BEAM_Z, LongPressBeamBurst } from "./LongPressBeamBurst";
import { componentTokens, cv } from "../../ui/tokens";

const lp = componentTokens.longPress;

const BUTTON_OVER_BEAM_Z = BEAM_Z + 8;
/** Header nav — portaled to body above side beams (BEAM_Z on document.body). */
const HEADER_OVER_BEAM_Z = 50;

export { BUTTON_OVER_BEAM_Z, HEADER_OVER_BEAM_Z };

const LongPressEdgeContext = createContext<RefObject<HTMLElement | null> | null>(null);

/** Supplies app content bounds for side beam progress on LongPressButton instances. */
export function LongPressEdgeProvider({
  edgeRef,
  children,
}: {
  edgeRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <LongPressEdgeContext.Provider value={edgeRef}>
      {children}
    </LongPressEdgeContext.Provider>
  );
}

function useLongPressEdgeContainer() {
  return useContext(LongPressEdgeContext);
}

export { useLongPressEdgeContainer };

const LONG_PRESS_MS = 600;
/** Longer hold for header navigation (back / forward). */
export const HEADER_NAV_LONG_PRESS_MS = 1000;
const MOVE_THRESHOLD = 10;
const LEFT_PROGRESS_W = 3;
const PROGRESS_INSET = 5;

type HoldBox = { top: number; left: number; width: number; height: number };

export type UseLongPressOptions = {
  accentColor?: string;
  confirmAction?: string;
  /** When true, drives the header confirm bar + message (back / lock only). */
  headerProgress?: boolean;
  durationMs?: number;
};

export function useLongPress(
  onLongPress: () => void,
  disabled = false,
  options?: UseLongPressOptions,
) {
  const [progress, setProgress] = useState(0);
  const rafRef   = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0, t: 0 });
  const firedRef = useRef(false);
  const reportGlobal = useLongPressProgressReporter();
  const accentColor = options?.accentColor;
  const confirmAction = options?.confirmAction;
  const headerProgress = options?.headerProgress ?? false;
  const durationMs = options?.durationMs ?? LONG_PRESS_MS;

  const holding = progress > 0;

  const report = useCallback(
    (p: number) => {
      if (headerProgress) {
        reportGlobal?.(p, { accentColor, action: confirmAction });
      }
    },
    [reportGlobal, accentColor, confirmAction, headerProgress],
  );

  const clear = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setProgress(0);
    firedRef.current = false;
    if (headerProgress) reportGlobal?.(0);
  }, [reportGlobal, headerProgress]);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    firedRef.current = false;

    const tick = () => {
      const elapsed = performance.now() - startRef.current.t;
      const p = Math.min(1, elapsed / durationMs);
      setProgress(p);
      report(p);
      if (p >= 1 && !firedRef.current) {
        firedRef.current = true;
        navigator.vibrate?.(12);
        onLongPress();
        clear();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, onLongPress, clear, report, durationMs]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (dx * dx + dy * dy > MOVE_THRESHOLD * MOVE_THRESHOLD) clear();
  }, [clear]);

  return {
    progress,
    holding,
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerCancel: clear,
  };
}

export function LongPressProgress({
  progress,
  accentColor,
  inset = PROGRESS_INSET,
  leftBar = true,
}: {
  progress: number;
  accentColor?: string;
  inset?: number;
  leftBar?: boolean;
}) {
  if (progress <= 0) return null;
  const barColor = accentColor ?? cv.longPress.progress;
  return (
    <>
      {leftBar ? (
        <div
          className="absolute pointer-events-none"
          style={{ left: inset, top: 6, bottom: 6, width: LEFT_PROGRESS_W }}
        >
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: `${progress * 100}%`,
              borderRadius: 2,
              background: barColor,
              boxShadow: `0 0 6px ${barColor}88`,
            }}
          />
        </div>
      ) : null}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: `${progress * 100}%`,
          background: accentColor ? `${accentColor}14` : cv.longPress.fill,
        }}
      />
    </>
  );
}

interface LongPressButtonProps {
  label: string;
  onLongPress: () => void;
  confirmAction?: string;
  accentColor?: string;
  disabled?: boolean;
  active?: boolean;
  icon?: ReactNode;
  /** Secondary hint below the title (stacked layout). */
  description?: string;
  /** Icon + title + optional description, for large locked overlays. */
  stacked?: boolean;
  variant?: "primary" | "secondary" | "header";
  /** fill = in-button bars; beam = side loading bars to app edge (default); water = bottom fill only */
  progressVariant?: "fill" | "beam" | "water";
  edgeContainerRef?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
  labelSize?: number | string;
  descriptionSize?: number | string;
  compact?: boolean;
  durationMs?: number;
}

export const LongPressButton = forwardRef<HTMLButtonElement, LongPressButtonProps>(function LongPressButton({
  label,
  onLongPress,
  confirmAction,
  accentColor,
  disabled = false,
  active = false,
  icon,
  description,
  stacked = false,
  variant = "secondary",
  progressVariant = "beam",
  edgeContainerRef,
  className = "",
  style,
  labelSize = "var(--text-ui-xs)",
  descriptionSize = "var(--text-ui-xs)",
  compact = false,
  durationMs,
}, ref) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const setButtonRef = useCallback((el: HTMLButtonElement | null) => {
    buttonRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  }, [ref]);
  const contextEdgeRef = useLongPressEdgeContainer();
  const beamEdgeRef = edgeContainerRef ?? contextEdgeRef;
  const { progress, holding, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
    useLongPress(onLongPress, disabled, { accentColor, confirmAction, durationMs });

  const isHeader = variant === "header";
  const borderAlpha = lp.borderAlpha;

  const idleBorder = disabled
    ? borderAlpha.disabled
    : isHeader
      ? borderAlpha.headerIdle
      : variant === "primary"
        ? borderAlpha.primaryIdle
        : borderAlpha.secondaryIdle;

  const idleLabel = disabled
    ? cv.longPress.labelDisabled
    : holding
      ? isHeader
        ? cv.longPress.labelHolding
        : cv.longPress.labelHolding
      : isHeader
        ? cv.headerIconButton.color
        : cv.longPress.labelIdle;

  const lit = active || holding;
  const beamEngaged = progressVariant === "beam" && progress > 0;
  const waterEngaged = progressVariant === "water" && progress > 0;
  const [holdBox, setHoldBox] = useState<HoldBox | null>(null);
  const holdBoxRef = useRef<HoldBox | null>(null);
  const liftBox = holdBox ?? holdBoxRef.current;
  /** Header: lift on pointer-down (before beam paints). Body: lift when beam is active. */
  const anchorActive =
    progressVariant === "beam" && liftBox != null && (isHeader || beamEngaged);
  const liftZIndex = isHeader ? HEADER_OVER_BEAM_Z : BUTTON_OVER_BEAM_Z;
  const headerBeamHold = isHeader && progressVariant === "beam" && liftBox != null;
  const lifted = anchorActive && liftBox != null;

  const captureHoldBox = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const box = { top: r.top, left: r.left, width: r.width, height: r.height };
    holdBoxRef.current = box;
    setHoldBox(box);
  }, []);

  const clearHoldBox = useCallback(() => {
    holdBoxRef.current = null;
    setHoldBox(null);
  }, []);

  useLayoutEffect(() => {
    if (!liftBox || (!beamEngaged && !headerBeamHold)) return;

    const measure = () => {
      const el = buttonRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const box = { top: r.top, left: r.left, width: r.width, height: r.height };
      holdBoxRef.current = box;
      setHoldBox(box);
    };

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [beamEngaged, headerBeamHold, liftBox]);

  const handlePointerDown = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    if (progressVariant === "beam") {
      flushSync(() => captureHoldBox());
    }
    onPointerDown(e);
  }, [progressVariant, captureHoldBox, onPointerDown]);

  const handlePointerUp = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    onPointerUp(e);
    clearHoldBox();
  }, [onPointerUp, clearHoldBox]);

  const handlePointerCancel = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    onPointerCancel(e);
    clearHoldBox();
  }, [onPointerCancel, clearHoldBox]);

  const sheetBackground = (() => {
    if (holding && !beamEngaged) return cv.action.longPressHolding;
    if (active || holding) return cv.action.longPressActive;
    return cv.action.longPressIdle;
  })();

  const headerBackground = (() => {
    if (headerBeamHold) return cv.headerIconButton.backgroundActiveSolid;
    return active || holding
      ? cv.headerIconButton.backgroundActive
      : cv.headerIconButton.background;
  })();

  const idleBackground = isHeader ? headerBackground : sheetBackground;

  const borderWidth = isHeader ? lp.borderWidthHeader : lp.borderWidthSheet;
  const borderStyle = isHeader
    ? lit
      ? cv.headerIconButton.borderActive
      : cv.headerIconButton.border
    : `${borderWidth}px solid rgba(var(--ui-long-press-border-rgb), ${
        holding
          ? isHeader
            ? borderAlpha.holdingHeader
            : borderAlpha.holdingSheet
          : lit
            ? isHeader
              ? borderAlpha.litHeader
              : borderAlpha.litSheet
            : idleBorder
      })`;

  const renderPressButton = () => (
    <button
      ref={setButtonRef}
      type="button"
      disabled={disabled}
      aria-label={label}
      className={`relative flex flex-col items-center justify-center overflow-hidden touch-none transition-colors duration-150 ${
        isHeader ? "header-icon-btn rounded-full shrink-0" : "rounded-xl"
      }${headerBeamHold ? " header-icon-btn--beam-holding" : ""}${anchorActive ? "" : ` ${className}`}`}
      style={{
        cursor: disabled ? "default" : "pointer",
        background: idleBackground,
        border: borderStyle,
        color: isHeader ? (lit ? cv.headerIconButton.colorActive : cv.headerIconButton.color) : undefined,
        minHeight: isHeader ? 0 : compact ? 0 : 32,
        ...(disabled && !isHeader ? { opacity: cv.longPress.disabledOpacity } : {}),
        ...(isHeader
          ? {
              width: 40,
              height: 40,
              opacity: disabled ? lp.opacityDisabledHeader : 1,
            }
          : {}),
        ...(lifted
          ? {
              position: "fixed" as const,
              top: liftBox!.top,
              left: liftBox!.left,
              width: liftBox!.width,
              height: liftBox!.height,
              margin: 0,
              zIndex: liftZIndex,
              isolation: "isolate" as const,
            }
          : {}),
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {progressVariant === "fill" ? (
        <LongPressProgress progress={progress} accentColor={accentColor} />
      ) : progressVariant === "water" ? (
        <LongPressProgress progress={progress} accentColor={accentColor} leftBar={false} />
      ) : null}
      {stacked ? (
        <span
          className="relative z-[1] flex items-center text-left"
          style={{ gap: 12, maxWidth: "92%", padding: "0 12px" }}
        >
          {icon ? (
            <span
              className="flex shrink-0 items-center justify-center"
              style={{ color: idleLabel, transition: "color 0.15s ease" }}
            >
              {icon}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-col" style={{ gap: description ? 5 : 0 }}>
            <span
              className="uppercase"
              style={{
                fontSize: labelSize,
                letterSpacing: "0.14em",
                fontWeight: 600,
                color: idleLabel,
                lineHeight: 1.15,
                transition: "color 0.15s ease",
              }}
            >
              {label}
            </span>
            {description ? (
              <span
                style={{
                  fontSize: descriptionSize,
                  letterSpacing: "0.03em",
                  fontWeight: 500,
                  color: idleLabel,
                  opacity: holding ? 0.95 : 0.72,
                  lineHeight: 1.35,
                  transition: "color 0.15s ease, opacity 0.15s ease",
                }}
              >
                {description}
              </span>
            ) : null}
          </span>
        </span>
      ) : icon ? (
        <span
          className="relative z-[1] flex items-center justify-center"
          style={{
            color: idleLabel,
            transition: "color 0.15s ease",
          }}
        >
          {icon}
        </span>
      ) : (
        <span
          className="uppercase"
          style={{
            position: "relative",
            zIndex: 1,
            fontSize: labelSize,
            letterSpacing: compact ? "0.08em" : "0.12em",
            fontWeight: 600,
            color: idleLabel,
            lineHeight: 1,
            transition: "color 0.15s ease",
          }}
        >
          {label}
        </span>
      )}
    </button>
  );

  return (
    <>
      {progressVariant === "beam" && (
        <LongPressBeamBurst
          progress={progress}
          anchorRef={buttonRef}
          accentColor={accentColor}
          edgeContainerRef={beamEdgeRef}
        />
      )}
      <span
        className={lifted && !isHeader ? className : undefined}
        style={
          lifted && !isHeader
            ? {
                width: liftBox!.width,
                height: liftBox!.height,
                minWidth: liftBox!.width,
                minHeight: liftBox!.height,
                display: "block",
                flexShrink: 0,
              }
            : { display: "contents" }
        }
      >
        {renderPressButton()}
      </span>
    </>
  );
});
