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

export type SelectChipGestureMode = "select" | "qty";

type ChipActions = {
  onTap: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
};

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

    const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabledRef.current || event.button !== 0) return;

      const el = event.currentTarget;
      targetRef.current = el;
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
      longTimerRef.current = window.setTimeout(() => {
        longFiredRef.current = true;
        longTimerRef.current = null;
        endHoldVisual();
        navigator.vibrate?.(10);
        actionsRef.current.onLongPress?.();
      }, SELECT_CHIP_LONG_PRESS_MS);
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabledRef.current) return;
      const dx = event.clientX - startRef.current.x;
      const dy = event.clientY - startRef.current.y;
      if (dx * dx + dy * dy <= MOVE_CANCEL_PX * MOVE_CANCEL_PX) return;
      movedRef.current = true;
      if (longTimerRef.current != null) cancelPress();
    };

    const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabledRef.current) return;
      clearLongTimer();

      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        /* ignore */
      }

      if (longFiredRef.current) {
        event.preventDefault();
        return;
      }

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
        elapsed <= CANCEL_SALVAGE_MS;

      cancelPress();
      try {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        /* ignore */
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
