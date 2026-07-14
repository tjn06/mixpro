import type { CSSProperties } from "react";
import { cv } from "../../ui/tokens";

/** Save / lock icons scale up in locked expanded overlays. */
export const LOCKED_ACTION_ICON_SIZE = 24;

/** Extra content fades out faster than the shell shrinks on unlock. */
export const CONTENT_FADE_OUT_MS = 120;
export const CONTENT_FADE_IN_MS = 140;
/** Stagger: hide detail before shrink; reveal detail after grow. */
export const EXPAND_CONTENT_DELAY_MS = 200;
export const COLLAPSE_CONTENT_DELAY_MS = 60;

export const PRIMARY_BORDER = cv.border.strong;

export function contentLayerTransition(
  expanded: boolean,
  isExpandedLayer: boolean,
  expandEase: string,
): string {
  const fadeIn = `opacity ${CONTENT_FADE_IN_MS}ms ${expandEase}`;
  const fadeOut = `opacity ${CONTENT_FADE_OUT_MS}ms ease-out`;
  if (isExpandedLayer) {
    return expanded ? `${fadeIn} ${EXPAND_CONTENT_DELAY_MS}ms` : fadeOut;
  }
  return expanded ? fadeOut : `${fadeIn} ${COLLAPSE_CONTENT_DELAY_MS}ms`;
}

export function crossfadeLayerStyles(
  expanded: boolean,
  expandEase: string,
  isExpandedLayer: boolean,
): CSSProperties {
  if (isExpandedLayer) {
    return {
      position: "absolute",
      inset: 0,
      opacity: expanded ? 1 : 0,
      transform: expanded ? "scale(1)" : "scale(0.96)",
      transition: `${contentLayerTransition(expanded, true, expandEase)}, transform ${CONTENT_FADE_OUT_MS}ms ease-out`,
      pointerEvents: expanded ? "auto" : "none",
    };
  }
  return {
    position: "absolute",
    inset: 0,
    opacity: expanded ? 0 : 1,
    transition: contentLayerTransition(expanded, false, expandEase),
    pointerEvents: expanded ? "none" : "auto",
  };
}

export const TRANSPARENT_BTN = { background: "transparent", border: "none", minHeight: 0 } as const;
