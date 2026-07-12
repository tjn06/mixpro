import type { CSSProperties } from "react";
import { theme } from "../../theme";

export const CARD_NAME_WEIGHT = 700;
export const CARD_UNIT_WEIGHT = 600;

/** @deprecated Prefer theme.colors.* — kept for existing imports. */
export const CARD_VALUE_INACTIVE = theme.colors.cardValueInactive;
/** @deprecated Prefer theme.colors.* — kept for existing imports. */
export const CARD_UNIT_INACTIVE = theme.colors.cardUnitInactive;
/** @deprecated Prefer theme.colors.* — kept for existing imports. */
export const ENTITY_SURFACE_IDLE = theme.colors.entitySurfaceIdle;
/** @deprecated Prefer theme.borders.* — kept for existing imports. */
export const RECIPE_RATIO_BORDER_COLOR = theme.borders.recipeRatio;

export const CARD_CHROME_TRANSITION = theme.chrome.cardChromeTransition;

function entityCardShadow(color: string): string {
  return `0 0 14px ${color}55, 0 0 6px ${color}40`;
}

function entityActiveRing(color: string): string {
  return `0 0 0 0.5px ${color}${theme.chrome.entityBorderActiveSuffix}`;
}

function entitySurfaceLit(color: string): string {
  return `color-mix(in srgb, ${color} ${theme.chrome.entityTintLitPct}%, ${ENTITY_SURFACE_IDLE})`;
}

export function entityCardChrome(
  color: string,
  lit: boolean,
): { border: string; boxShadow: string; background: string } {
  const border = lit
    ? `${theme.chrome.entityBorderWidth} solid ${color}${theme.chrome.entityBorderActiveSuffix}`
    : `${theme.chrome.entityBorderWidth} solid ${RECIPE_RATIO_BORDER_COLOR}`;
  if (!lit) {
    return { border, boxShadow: "none", background: ENTITY_SURFACE_IDLE };
  }
  return {
    border,
    boxShadow: `${entityActiveRing(color)}, ${entityCardShadow(color)}`,
    background: entitySurfaceLit(color),
  };
}

export function entityCardReadoutStyle(nameColor: string, lit: boolean): {
  nameColor: string;
  valueColor: string;
  unitColor: string;
  barOpacity: number;
} {
  return {
    nameColor,
    valueColor: lit ? theme.colors.white : CARD_VALUE_INACTIVE,
    unitColor: CARD_UNIT_INACTIVE,
    barOpacity: lit ? 1 : 0.4,
  };
}

export const cardReadoutNameStyle = (color: string): CSSProperties => ({
  fontSize: "var(--text-card-name)",
  letterSpacing: "0.18em",
  color,
  fontWeight: CARD_NAME_WEIGHT,
});

export const cardReadoutValueStyle = (color: string): CSSProperties => ({
  fontSize: "var(--text-card-value)",
  fontWeight: 600,
  color,
  lineHeight: 1,
  marginTop: "var(--entity-card-readout-mt)",
});

export const cardReadoutUnitStyle = (color: string): CSSProperties => ({
  fontSize: "var(--text-card-unit)",
  color,
  letterSpacing: "0.08em",
  fontWeight: CARD_UNIT_WEIGHT,
  marginTop: "var(--entity-card-unit-mt)",
});
