import React, { forwardRef, useRef, useState, useCallback, createContext, useContext, type CSSProperties, type PointerEvent, type RefObject, type ReactNode } from "react";
import { useLongPressProgressReporter } from "./LongPressProgressContext";
import { LongPressBeamBurst } from "./LongPressBeamBurst";

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

const LONG_PRESS_MS = 600;
/** Longer hold for header navigation (back / forward). */
export const HEADER_NAV_LONG_PRESS_MS = 1000;
const MOVE_THRESHOLD = 10;
const LEFT_PROGRESS_W = 3;
const PROGRESS_INSET = 5;
const DEFAULT_PROGRESS_COLOR = "#9090b8";

const ACTION_PRIMARY_LABEL   = "#8888a8";
const ACTION_SECONDARY_LABEL = "#707090";
const ACTION_COMPACT_LABEL   = "#747494";
const ACTION_DISABLED_LABEL  = "#404058";
const ACTION_HOLDING_LABEL   = "#9090b8";

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
}: {
  progress: number;
  accentColor?: string;
  inset?: number;
}) {
  if (progress <= 0) return null;
  const barColor = accentColor ?? DEFAULT_PROGRESS_COLOR;
  return (
    <>
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
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: `${progress * 100}%`,
          background: accentColor ? `${accentColor}14` : "rgba(255,255,255,0.04)",
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
  variant?: "primary" | "secondary";
  /** fill = in-button bars; beam = side loading bars to app edge (default) */
  progressVariant?: "fill" | "beam";
  edgeContainerRef?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
  labelSize?: number;
  descriptionSize?: number;
  compact?: boolean;
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
  labelSize = 9,
  descriptionSize = 9,
  compact = false,
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
    useLongPress(onLongPress, disabled, { accentColor, confirmAction });

  const idleBorder = disabled
    ? 0.07
    : variant === "primary"
      ? 0.12
      : 0.10;

  const idleLabel = disabled
    ? ACTION_DISABLED_LABEL
    : holding
      ? ACTION_HOLDING_LABEL
      : variant === "primary"
        ? ACTION_PRIMARY_LABEL
        : compact
          ? ACTION_COMPACT_LABEL
          : ACTION_SECONDARY_LABEL;

  const lit = active || holding;

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
    <button
      ref={setButtonRef}
      type="button"
      disabled={disabled}
      aria-label={label}
      className={`relative flex flex-col items-center justify-center rounded-xl overflow-hidden touch-none transition-colors duration-150 ${className}`}
      style={{
        cursor: disabled ? "default" : "pointer",
        background: holding ? "#10101e" : active ? "rgba(255,255,255,0.08)" : "#0d0d1c",
        border: `1.5px solid rgba(255,255,255,${holding ? 0.14 : lit ? 0.22 : idleBorder})`,
        minHeight: compact ? 0 : 32,
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {progressVariant === "fill" && (
        <LongPressProgress progress={progress} accentColor={accentColor} />
      )}
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
        <span style={{
          position: "relative", zIndex: 1,
          fontSize: labelSize, letterSpacing: compact ? "0" : "0.2em", fontWeight: 500,
          color: idleLabel,
          lineHeight: 1,
          transition: "color 0.15s ease",
        }}>
          {label}
        </span>
      )}
    </button>
    </>
  );
});
