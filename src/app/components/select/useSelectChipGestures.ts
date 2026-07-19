import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

export const SELECT_CHIP_LONG_PRESS_MS = 420;
const DOUBLE_TAP_MS = 320;
const MOVE_CANCEL_PX = 10;

/**
 * Tap / double-tap / long-press for quantity chips.
 * - First tap (unselected path handled by caller via onTap)
 * - Double-tap → onDoubleTap
 * - Long-press → onLongPress (skips tap)
 * - Optional hold visual via onHoldChange while pressing toward long-press
 */
export function useSelectChipGestures({
  enabled = true,
  /** When true, pointer-down starts hold feedback until cancel or long-press. */
  holdFeedback = false,
  onTap,
  onDoubleTap,
  onLongPress,
  onHoldChange,
}: {
  enabled?: boolean;
  holdFeedback?: boolean;
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
  const holdFeedbackRef = useRef(holdFeedback);
  holdFeedbackRef.current = holdFeedback;

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
      if (holdFeedbackRef.current) {
        holdingRef.current = true;
        onHoldChange?.(true);
      }
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
