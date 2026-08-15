import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  MIXER_DRAG_OVERLAY_HIDE_MS,
  MIXER_SWIPE_DRAG_MARGIN_PX,
  MIXER_SWIPE_HEIGHT,
  MIXER_SWIPE_MAX_DY_PER_FRAME,
  MIXER_SWIPE_STEPS_PER_DRAG,
  MIXER_SWIPE_ZONES,
  mixerZoneIndexFromX,
} from "../presentation/mixerSwipeConfig";

export interface UseSingleValueSwipeAdjustOptions {
  valueGrams: number;
  onValueChange: (nextGrams: number) => void;
  disabled?: boolean;
}

/** Mixer-style swipe zones that adjust one gram value (no recipe ratios / bucket). */
export function useSingleValueSwipeAdjust({
  valueGrams,
  onValueChange,
  disabled = false,
}: UseSingleValueSwipeAdjustOptions) {
  const [activeZone, setActiveZone] = useState<number | null>(null);
  const [dragDirection, setDragDirection] = useState<"up" | "down" | null>(null);
  const [dragFocus, setDragFocus] = useState(false);

  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(valueGrams);
  const pendingValue = useRef<number | null>(null);
  const rafPending = useRef(false);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragLastY = useRef(0);
  const dragBaseVal = useRef(0);
  const dragStepSize = useRef(1);
  const dragOverlayHideTimer = useRef<number | null>(null);

  valueRef.current = valueGrams;

  const commitValue = useCallback(
    (next: number) => {
      pendingValue.current = next;
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(() => {
        rafPending.current = false;
        if (pendingValue.current != null) onValueChange(pendingValue.current);
      });
    },
    [onValueChange],
  );

  const flushValue = useCallback(() => {
    if (pendingValue.current != null) {
      onValueChange(pendingValue.current);
      pendingValue.current = null;
    }
    rafPending.current = false;
  }, [onValueChange]);

  const clearDragOverlayHide = useCallback(() => {
    if (dragOverlayHideTimer.current !== null) {
      window.clearTimeout(dragOverlayHideTimer.current);
      dragOverlayHideTimer.current = null;
    }
  }, []);

  const showDragOverlay = useCallback(() => {
    clearDragOverlayHide();
    setDragFocus(true);
  }, [clearDragOverlayHide]);

  const scheduleHideDragOverlay = useCallback(() => {
    clearDragOverlayHide();
    dragOverlayHideTimer.current = window.setTimeout(() => {
      dragOverlayHideTimer.current = null;
      setDragFocus(false);
    }, MIXER_DRAG_OVERLAY_HIDE_MS);
  }, [clearDragOverlayHide]);

  useEffect(
    () => () => {
      clearDragOverlayHide();
    },
    [clearDragOverlayHide],
  );

  useEffect(() => {
    if (!disabled) return;
    clearDragOverlayHide();
    setDragFocus(false);
    if (isDragging.current) {
      isDragging.current = false;
      setActiveZone(null);
      setDragDirection(null);
      flushValue();
    }
  }, [disabled, clearDragOverlayHide, flushValue]);

  const endSwipe = useCallback(
    (e?: PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      if (e && swipeAreaRef.current?.hasPointerCapture(e.pointerId)) {
        swipeAreaRef.current.releasePointerCapture(e.pointerId);
      }
      isDragging.current = false;
      setActiveZone(null);
      setDragDirection(null);
      scheduleHideDragOverlay();
      flushValue();
    },
    [flushValue, scheduleHideDragOverlay],
  );

  const onSwipeDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.button !== 0) return;
      const el = swipeAreaRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const zi = mixerZoneIndexFromX(e.clientX - rect.left, rect.width);

      isDragging.current = true;
      showDragOverlay();
      setActiveZone(zi);
      setDragDirection(null);
      dragStartY.current = e.clientY;
      dragLastY.current = e.clientY;
      dragBaseVal.current = valueGrams;
      dragStepSize.current = MIXER_SWIPE_ZONES[zi].step;
      el.setPointerCapture(e.pointerId);
    },
    [valueGrams, showDragOverlay, disabled],
  );

  const onSwipeMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      const el = swipeAreaRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      if (
        e.clientY < rect.top - MIXER_SWIPE_DRAG_MARGIN_PX ||
        e.clientY > rect.bottom + MIXER_SWIPE_DRAG_MARGIN_PX
      ) {
        return;
      }

      let clientY = e.clientY;
      const frameDy = clientY - dragLastY.current;
      if (Math.abs(frameDy) > MIXER_SWIPE_MAX_DY_PER_FRAME) {
        clientY = dragLastY.current + Math.sign(frameDy) * MIXER_SWIPE_MAX_DY_PER_FRAME;
      }
      dragLastY.current = clientY;

      if (frameDy < 0) setDragDirection("up");
      else if (frameDy > 0) setDragDirection("down");

      const step = dragStepSize.current;
      const dy = dragStartY.current - clientY;
      const swipeH = el.offsetHeight > 0 ? el.offsetHeight : MIXER_SWIPE_HEIGHT;
      const pxPerStep = swipeH / MIXER_SWIPE_STEPS_PER_DRAG;
      const raw = dragBaseVal.current + (dy / pxPerStep) * step;
      const snapped = Math.max(0, Math.round(raw / step) * step);
      commitValue(snapped);
    },
    [commitValue],
  );

  const onSwipeEnd = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      endSwipe(e);
    },
    [endSwipe],
  );

  return {
    swipeAreaRef,
    activeZone,
    dragDirection,
    dragFocus,
    onSwipeDown,
    onSwipeMove,
    onSwipeEnd,
  };
}
