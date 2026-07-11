export type Rect = { top: number; left: number; width: number; height: number };

/**
 * Element position in the anchor's local layout space.
 * Corrects for the mobile-shell `transform: scale()` on the app canvas.
 */
export function localRect(el: HTMLElement, anchor: HTMLElement): Rect {
  const scale = anchor.offsetWidth > 0
    ? anchor.getBoundingClientRect().width / anchor.offsetWidth
    : 1;
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const elR = el.getBoundingClientRect();
  const ancR = anchor.getBoundingClientRect();
  return {
    top: (elR.top - ancR.top) / s,
    left: (elR.left - ancR.left) / s,
    width: elR.width / s,
    height: elR.height / s,
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
