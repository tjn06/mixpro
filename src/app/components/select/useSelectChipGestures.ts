import {
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** Shared timing — menu open defer uses the same window as double-tap. */
export const SELECT_CHIP_LONG_PRESS_MS = 420;
export const SELECT_CHIP_DOUBLE_TAP_MS = 300;
export const SELECT_CHIP_PULSE_MS = 240;

const MOVE_CANCEL_PX = 10;
/** Salvage a select-mode tap if the browser cancels a short, still press. */
const CANCEL_SALVAGE_MS = 280;
/**
 * After a long-press that may remove/reflow a chip, ignore chip gestures until
 * that pointer lifts, then a short cool-off so a neighbor under the finger
 * does not receive an accidental tap.
 */
const SUPPRESS_COOL_OFF_MS = 360;

export type SelectChipGestureMode = "select" | "qty";

type ChipActions = {
  onTap: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
};

/** Active pointer that must not start/finish chip gestures on other targets. */
let suppressPointerId: number | null = null;
/** After lift — block new presses briefly while layout settles. */
let suppressUntilMs = 0;
let windowSuppressBound = false;

function isChipGestureSuppressed(pointerId?: number): boolean {
  if (suppressPointerId != null) {
    if (pointerId == null || pointerId === suppressPointerId) return true;
    // Block other fingers too while a destructive press is in flight.
    return true;
  }
  return suppressUntilMs > 0 && performance.now() < suppressUntilMs;
}

function clearWindowSuppressListeners() {
  if (!windowSuppressBound) return;
  window.removeEventListener("pointerup", onWindowSuppressPointerEnd, true);
  window.removeEventListener("pointercancel", onWindowSuppressPointerEnd, true);
  window.removeEventListener("click", onWindowSuppressClick, true);
  windowSuppressBound = false;
}

function onWindowSuppressPointerEnd(event: PointerEvent) {
  if (suppressPointerId == null) return;
  if (event.pointerId !== suppressPointerId) return;
  event.preventDefault();
  event.stopPropagation();
  suppressPointerId = null;
  suppressUntilMs = performance.now() + SUPPRESS_COOL_OFF_MS;
  clearWindowSuppressListeners();
}

function onWindowSuppressClick(event: MouseEvent) {
  if (!isChipGestureSuppressed()) return;
  event.preventDefault();
  event.stopPropagation();
}

/** Arm after long-press — survives the pressed chip unmounting. */
function armChipGestureSuppress(pointerId: number) {
  suppressPointerId = pointerId;
  suppressUntilMs = 0;
  if (windowSuppressBound) return;
  window.addEventListener("pointerup", onWindowSuppressPointerEnd, true);
  window.addEventListener("pointercancel", onWindowSuppressPointerEnd, true);
  window.addEventListener("click", onWindowSuppressClick, true);
  windowSuppressBound = true;
}

function clearHold(el: HTMLElement | null) {
  if (!el) return;
  delete el.dataset.hold;
  el.style.removeProperty("--select-chip-hold-ms");
}

function startHold(el: HTMLElement) {
  el.dataset.hold = "";
  el.style.setProperty(
    "--select-chip-hold-ms",
    `${SELECT_CHIP_LONG_PRESS_MS}ms`,
  );
}

function pulseUp(el: HTMLElement) {
  delete el.dataset.pulse;
  // Restart CSS animation if a pulse is already running.
  void el.offsetWidth;
  el.dataset.pulse = "up";
  window.setTimeout(() => {
    if (el.dataset.pulse === "up") delete el.dataset.pulse;
  }, SELECT_CHIP_PULSE_MS);
}

/**
 * Pointer gestures for select chips.
 *
 * - `select`: instant tap only (first pick / open). No long-press timer.
 * - `qty`: double-tap (+1 + pulse), long-press (−1 + hold drain).
 *
 * Hold/pulse feedback writes `data-hold` / `data-pulse` on the event target
 * (no React re-render). Action callbacks are read from a ref each time.
 *
 * After long-press, a module-level suppress blocks other chips until the
 * finger lifts (and a short cool-off), so removing one chip cannot retarget
 * the still-down pointer onto a neighbor.
 */
export function useSelectChipGestures({
  enabled = true,
  mode,
  onTap,
  onDoubleTap,
  onLongPress,
}: {
  enabled?: boolean;
  mode: SelectChipGestureMode;
  onTap: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const actionsRef = useRef<ChipActions>({ onTap, onDoubleTap, onLongPress });
  actionsRef.current = { onTap, onDoubleTap, onLongPress };

  const longTimerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);
  const lastTapAtRef = useRef(0);
  const startRef = useRef({ x: 0, y: 0, t: 0 });
  const movedRef = useRef(false);
  const targetRef = useRef<HTMLElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  return useMemo(() => {
    const clearLongTimer = () => {
      if (longTimerRef.current != null) {
        window.clearTimeout(longTimerRef.current);
        longTimerRef.current = null;
      }
    };

    const endHoldVisual = () => clearHold(targetRef.current);

    const cancelPress = () => {
      clearLongTimer();
      endHoldVisual();
    };

    const releaseCapture = (
      el: HTMLElement,
      pointerId: number,
    ) => {
      try {
        if (el.hasPointerCapture?.(pointerId)) {
          el.releasePointerCapture(pointerId);
        }
      } catch {
        /* ignore */
      }
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabledRef.current || event.button !== 0) return;
      if (isChipGestureSuppressed(event.pointerId)) {
        event.preventDefault();
        return;
      }

      const el = event.currentTarget;
      targetRef.current = el;
      pointerIdRef.current = event.pointerId;
      longFiredRef.current = false;
      movedRef.current = false;
      startRef.current = {
        x: event.clientX,
        y: event.clientY,
        t: performance.now(),
      };
      cancelPress();

      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        /* ignore — not all targets support capture */
      }

      if (modeRef.current !== "qty") return;

      startHold(el);
      const pointerId = event.pointerId;
      longTimerRef.current = window.setTimeout(() => {
        longFiredRef.current = true;
        longTimerRef.current = null;
        endHoldVisual();
        navigator.vibrate?.(10);
        // Suppress before reflow so a neighbor cannot steal the still-down finger.
        armChipGestureSuppress(pointerId);
        actionsRef.current.onLongPress?.();
      }, SELECT_CHIP_LONG_PRESS_MS);
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabledRef.current) return;
      if (isChipGestureSuppressed(event.pointerId) && !longFiredRef.current) {
        return;
      }
      const dx = event.clientX - startRef.current.x;
      const dy = event.clientY - startRef.current.y;
      if (dx * dx + dy * dy <= MOVE_CANCEL_PX * MOVE_CANCEL_PX) return;
      movedRef.current = true;
      if (longTimerRef.current != null) cancelPress();
    };

    const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
      clearLongTimer();
      releaseCapture(event.currentTarget, event.pointerId);

      if (longFiredRef.current || isChipGestureSuppressed(event.pointerId)) {
        event.preventDefault();
        // Window listener also clears suppress; do it here if this target still lives.
        if (suppressPointerId === event.pointerId) {
          suppressPointerId = null;
          suppressUntilMs = performance.now() + SUPPRESS_COOL_OFF_MS;
          clearWindowSuppressListeners();
        }
        return;
      }

      if (!enabledRef.current) return;

      endHoldVisual();
      if (movedRef.current) return;

      const modeNow = modeRef.current;
      const now = performance.now();

      if (modeNow === "select") {
        lastTapAtRef.current = 0;
        actionsRef.current.onTap();
        return;
      }

      // qty mode
      if (now - lastTapAtRef.current <= SELECT_CHIP_DOUBLE_TAP_MS) {
        lastTapAtRef.current = 0;
        navigator.vibrate?.(8);
        pulseUp(event.currentTarget);
        actionsRef.current.onDoubleTap?.();
        return;
      }
      lastTapAtRef.current = now;
      actionsRef.current.onTap();
    };

    const onPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
      const elapsed = performance.now() - startRef.current.t;
      const canSalvageSelect =
        modeRef.current === "select" &&
        !movedRef.current &&
        !longFiredRef.current &&
        !isChipGestureSuppressed(event.pointerId) &&
        elapsed <= CANCEL_SALVAGE_MS;

      cancelPress();
      releaseCapture(event.currentTarget, event.pointerId);

      if (suppressPointerId === event.pointerId) {
        suppressPointerId = null;
        suppressUntilMs = performance.now() + SUPPRESS_COOL_OFF_MS;
        clearWindowSuppressListeners();
      }

      if (canSalvageSelect && enabledRef.current) {
        lastTapAtRef.current = 0;
        actionsRef.current.onTap();
      }
    };

    const onContextMenu = (event: ReactMouseEvent) => {
      event.preventDefault();
    };

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
    };
  }, []);
}
