import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

export const SELECT_CHIP_LONG_PRESS_MS = 420;
const DOUBLE_TAP_MS = 320;
const MOVE_CANCEL_PX = 10;

/**
 * Tap / double-tap / long-press for quantity chips.
 *
 * Unselected (`qtyGestures` false): instant tap only — no long-press timer.
 * Selected (`qtyGestures` true): double-tap (+1) and long-press (−1) with hold feedback.
 *
 * Unselected taps do not stamp the double-tap clock — a bounce right after
 * first select will not fire +1 pulse by accident.
 */
export function useSelectChipGestures({
  enabled = true,
  qtyGestures = false,
  onTap,
  onDoubleTap,
  onLongPress,
  onHoldChange,
}: {
  enabled?: boolean;
  /** When true, enable double-tap / long-press qty gestures + hold drain. */
  qtyGestures?: boolean;
  onTap: () => void;
  onDoubleTap: () => void;
  onLongPress: () => void;
  onHoldChange?: (holding: boolean) => void;
}) {
  const longTimerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);
  const holdingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const lastTapAtRef = useRef(0);
  const qtyGesturesRef = useRef(qtyGestures);
  qtyGesturesRef.current = qtyGestures;

  const stopHoldVisual = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    onHoldChange?.(false);
  }, [onHoldChange]);

  const clearLongTimer = useCallback(() => {
    if (longTimerRef.current != null) {
      window.clearTimeout(longTimerRef.current);
      longTimerRef.current = null;
    }
  }, []);

  const cancelHold = useCallback(() => {
    clearLongTimer();
    stopHoldVisual();
  }, [clearLongTimer, stopHoldVisual]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (event.button !== 0) return;
      longFiredRef.current = false;
      startRef.current = { x: event.clientX, y: event.clientY };
      clearLongTimer();
      stopHoldVisual();

      /** Qty gestures only when selected — unselected stays a simple instant tap. */
      if (!qtyGesturesRef.current) return;

      holdingRef.current = true;
      onHoldChange?.(true);
      longTimerRef.current = window.setTimeout(() => {
        longFiredRef.current = true;
        longTimerRef.current = null;
        stopHoldVisual();
        navigator.vibrate?.(10);
        onLongPress();
      }, SELECT_CHIP_LONG_PRESS_MS);
    },
    [clearLongTimer, enabled, onHoldChange, onLongPress, stopHoldVisual],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || longTimerRef.current == null) return;
      const dx = event.clientX - startRef.current.x;
      const dy = event.clientY - startRef.current.y;
      if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) cancelHold();
    },
    [cancelHold, enabled],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      clearLongTimer();
      if (longFiredRef.current) {
        event.preventDefault();
        return;
      }
      stopHoldVisual();

      const now = performance.now();

      if (!qtyGesturesRef.current) {
        lastTapAtRef.current = 0;
        onTap();
        return;
      }

      if (now - lastTapAtRef.current <= DOUBLE_TAP_MS) {
        lastTapAtRef.current = 0;
        navigator.vibrate?.(8);
        onDoubleTap();
        return;
      }
      lastTapAtRef.current = now;
      onTap();
    },
    [clearLongTimer, enabled, onDoubleTap, onTap, stopHoldVisual],
  );

  const onPointerCancel = useCallback(() => {
    cancelHold();
  }, [cancelHold]);

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onContextMenu,
  };
}
