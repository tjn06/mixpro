export type Rect = { top: number; left: number; width: number; height: number };

/** Element position in the anchor's local layout space. */
export function localRect(el: HTMLElement, anchor: HTMLElement): Rect {
  const elR = el.getBoundingClientRect();
  const ancR = anchor.getBoundingClientRect();
  return {
    top: elR.top - ancR.top,
    left: elR.left - ancR.left,
    width: elR.width,
    height: elR.height,
  };
}

export function rectBottom(r: Rect): number {
  return r.top + r.height;
}

/**
 * Content band below readouts: bucket SVG + Reset + Save/Load.
 * Readout labels and values stay visible above.
 */
export function saveCoverTargetRect(
  bucketReadout: Rect,
  recReadout: Rect,
  actions: Rect,
  cards: Rect | null,
  anchorWidth: number,
  sectionRowGap: number,
): Rect {
  const top = Math.max(rectBottom(bucketReadout), rectBottom(recReadout));
  const bottom = rectBottom(actions);
  let height = bottom - top;
  if (cards) {
    height = Math.min(height, cards.top - sectionRowGap - top);
  }
  return {
    top,
    left: 0,
    width: anchorWidth,
    height: Math.max(0, height),
  };
}

/** Full-width unlock bar in the control deck. */
export function unlockExpandedRect(
  anchorWidth: number,
  expandedTop: number,
  expandedHeight: number,
): Rect {
  return {
    top: expandedTop,
    left: 0,
    width: anchorWidth,
    height: expandedHeight,
  };
}
