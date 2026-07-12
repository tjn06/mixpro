import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { BucketSelection, BucketSize } from "../domain/bucket/types";
import { isBucketAtMaxFill } from "../domain/bucket/types";
import {
  enforceBucketLimitOnChange,
  mixLitersFromValues,
} from "../domain/bucket/limits";
import type { SandType } from "../domain/mix/volume";
import {
  MIXER_DRAG_BLOCKED_MS,
  MIXER_DRAG_OVERLAY_HIDE_MS,
  MIXER_BUCKET_LIMIT_VIBRATE_MS,
  MIXER_SWIPE_DRAG_MARGIN_PX,
  MIXER_SWIPE_HEIGHT,
  MIXER_SWIPE_MAX_DY_PER_FRAME,
  MIXER_SWIPE_STEPS_PER_DRAG,
  MIXER_SWIPE_ZONES,
  mixerZoneIndexFromX,
} from "../presentation/mixerSwipeConfig";
import { applyRecipeChange, driverIdFromIndex } from "../domain/recipe/calc";
import type { BlendingRecipe } from "../domain/recipe/types";

export interface UseMixerSwipeAdjustOptions {
  recipe: BlendingRecipe;
  values: number[];
  onValuesChange: (next: number[]) => void;
  active: number;
  bucketSelection: BucketSelection;
  sandType: SandType;
  disabled?: boolean;
}

export function useMixerSwipeAdjust({
  recipe,
  values,
  onValuesChange,
  active,
  bucketSelection,
  sandType,
  disabled = false,
}: UseMixerSwipeAdjustOptions) {
  const [activeZone, setActiveZone] = useState<number | null>(null);
  const [dragDirection, setDragDirection] = useState<"up" | "down" | null>(null);
  const [dragBlocked, setDragBlocked] = useState(false);
  const [dragFocus, setDragFocus] = useState(false);

  const swipeAreaRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef(values);
  const recipeRef = useRef(recipe);
  const bucketRef = useRef(bucketSelection);
  const pendingValues = useRef<number[] | null>(null);
  const rafPending = useRef(false);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragLastY = useRef(0);
  const dragBaseVal = useRef(0);
  const dragStepSize = useRef(1);
  const dragBlockedTimer = useRef<number | null>(null);
  const dragOverlayHideTimer = useRef<number | null>(null);

  valuesRef.current = values;
  recipeRef.current = recipe;
  bucketRef.current = bucketSelection;

  const commitValues = useCallback(
    (next: number[]) => {
      pendingValues.current = next;
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(() => {
        rafPending.current = false;
        if (pendingValues.current) onValuesChange(pendingValues.current);
      });
    },
    [onValuesChange],
  );

  const flushValues = useCallback(() => {
    if (pendingValues.current) {
      onValuesChange(pendingValues.current);
      pendingValues.current = null;
    }
    rafPending.current = false;
  }, [onValuesChange]);

  const clearDragBlocked = useCallback(() => {
    if (dragBlockedTimer.current !== null) {
      window.clearTimeout(dragBlockedTimer.current);
      dragBlockedTimer.current = null;
    }
    setDragBlocked(false);
  }, []);

  const triggerDragBlocked = useCallback(() => {
    setDragBlocked(true);
    navigator.vibrate?.(MIXER_BUCKET_LIMIT_VIBRATE_MS);
    if (dragBlockedTimer.current !== null) {
      window.clearTimeout(dragBlockedTimer.current);
    }
    dragBlockedTimer.current = window.setTimeout(() => {
      dragBlockedTimer.current = null;
      setDragBlocked(false);
    }, MIXER_DRAG_BLOCKED_MS);
  }, []);

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
      clearDragBlocked();
    },
    [clearDragOverlayHide, clearDragBlocked],
  );

  useEffect(() => {
    if (!disabled) return;
    clearDragOverlayHide();
    clearDragBlocked();
    setDragFocus(false);
    if (isDragging.current) {
      isDragging.current = false;
      setActiveZone(null);
      setDragDirection(null);
      flushValues();
    }
  }, [disabled, clearDragOverlayHide, clearDragBlocked, flushValues]);

  const endSwipe = useCallback(
    (e?: PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      if (e && swipeAreaRef.current?.hasPointerCapture(e.pointerId)) {
        swipeAreaRef.current.releasePointerCapture(e.pointerId);
      }
      isDragging.current = false;
      setActiveZone(null);
      setDragDirection(null);
      clearDragBlocked();
      scheduleHideDragOverlay();
      flushValues();
    },
    [flushValues, scheduleHideDragOverlay, clearDragBlocked],
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
      dragBaseVal.current = values[active];
      dragStepSize.current = MIXER_SWIPE_ZONES[zi].step;
      el.setPointerCapture(e.pointerId);
    },
    [values, active, showDragOverlay, disabled],
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
      const snapped = Math.round(raw / step) * step;
      const driver = driverIdFromIndex(active);
      let next = applyRecipeChange(recipeRef.current, driver, snapped);
      const bucket = bucketRef.current;
      next = enforceBucketLimitOnChange(
        next,
        valuesRef.current,
        recipeRef.current,
        bucket,
        sandType,
      );
      if (bucket !== "none") {
        const nextLiters = mixLitersFromValues(next, sandType, recipeRef.current);
        if (
          isBucketAtMaxFill(nextLiters, bucket as BucketSize) &&
          snapped > dragBaseVal.current
        ) {
          dragBaseVal.current = next[active];
          dragStartY.current = clientY;
          triggerDragBlocked();
        }
      }
      commitValues(next);
    },
    [active, commitValues, sandType, triggerDragBlocked],
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
    dragBlocked,
    dragFocus,
    onSwipeDown,
    onSwipeMove,
    onSwipeEnd,
  };
}
