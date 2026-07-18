import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

const LONG_PRESS_MS = 420;
const DOUBLE_TAP_MS = 320;
const MOVE_CANCEL_PX = 10;

/**
 * Tap / double-tap / long-press for quantity chips.
 * - First tap (unselected path handled by caller via onTap)
 * - Double-tap → onDoubleTap
 * - Long-press → onLongPress (skips tap)
 */
export function useSelectChipGestures({
  enabled = true,
  onTap,
  onDoubleTap,
  onLongPress,
}: {
  enabled?: boolean;
  onTap: () => void;
  onDoubleTap: () => void;
  onLongPress: () => void;
}) {
  const longTimerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const lastTapAtRef = useRef(0);

  const clearLong = useCallback(() => {
    if (longTimerRef.current != null) {
      window.clearTimeout(longTimerRef.current);
      longTimerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (event.button !== 0) return;
      longFiredRef.current = false;
      startRef.current = { x: event.clientX, y: event.clientY };
      clearLong();
      longTimerRef.current = window.setTimeout(() => {
        longFiredRef.current = true;
        longTimerRef.current = null;
        navigator.vibrate?.(10);
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [clearLong, enabled, onLongPress],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || longTimerRef.current == null) return;
      const dx = event.clientX - startRef.current.x;
      const dy = event.clientY - startRef.current.y;
      if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) clearLong();
    },
    [clearLong, enabled],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      clearLong();
      if (longFiredRef.current) {
        event.preventDefault();
        return;
      }
      const now = performance.now();
      if (now - lastTapAtRef.current <= DOUBLE_TAP_MS) {
        lastTapAtRef.current = 0;
        onDoubleTap();
        return;
      }
      lastTapAtRef.current = now;
      onTap();
    },
    [clearLong, enabled, onDoubleTap, onTap],
  );

  const onPointerCancel = useCallback(() => {
    clearLong();
  }, [clearLong]);

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
