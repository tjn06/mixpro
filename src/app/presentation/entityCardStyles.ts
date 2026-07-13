import type { CSSProperties } from "react";
import { themeColorVar } from "../../theme/cssVars";
import { componentTokens } from "../../theme/components";
import type { ColorScheme } from "../../theme/appearance";
import { entityLitValueColor } from "./entityAccent";
import { cv } from "../ui/tokens";

const chrome = componentTokens.chrome;

export const CARD_NAME_WEIGHT = 700;
export const CARD_UNIT_WEIGHT = 600;

export const CARD_VALUE_INACTIVE = themeColorVar("cardValueInactive");
export const CARD_UNIT_INACTIVE = themeColorVar("cardUnitInactive");
export const ENTITY_SURFACE_IDLE = themeColorVar("entitySurfaceIdle");
export const RECIPE_RATIO_BORDER_COLOR = themeColorVar("entityBorderIdle");

export const CARD_CHROME_TRANSITION = componentTokens.entityCard.transition;

function entityCardShadow(color: string): string {
  return `0 0 14px ${color}55, 0 0 6px ${color}40`;
}

function entityActiveRing(color: string): string {
  return `0 0 0 0.5px ${color}${chrome.entityBorderActiveSuffix}`;
}

function entitySurfaceLit(color: string): string {
  return `color-mix(in srgb, ${color} ${chrome.entityTintLitPct}%, ${ENTITY_SURFACE_IDLE})`;
}

export function entityCardChrome(
  color: string,
  lit: boolean,
): { border: string; boxShadow: string; background: string } {
  const border = lit
    ? `${chrome.entityBorderWidth} solid ${color}${chrome.entityBorderActiveSuffix}`
    : `${chrome.entityBorderWidth} solid ${RECIPE_RATIO_BORDER_COLOR}`;
  if (!lit) {
    return { border, boxShadow: "none", background: ENTITY_SURFACE_IDLE };
  }
  return {
    border,
    boxShadow: `${entityActiveRing(color)}, ${entityCardShadow(color)}`,
    background: entitySurfaceLit(color),
  };
}

export function entityValueColor(lit: boolean, scheme: ColorScheme): string {
  if (lit) return entityLitValueColor(scheme);
  return CARD_VALUE_INACTIVE;
}

export function entityUnitColor(lit: boolean, scheme: ColorScheme): string {
  if (lit) return scheme === "light" ? cv.text.secondary : CARD_UNIT_INACTIVE;
  return CARD_UNIT_INACTIVE;
}

export function entityCardReadoutStyle(
  nameColor: string,
  lit: boolean,
  scheme: ColorScheme = "dark",
): {
  nameColor: string;
  valueColor: string;
  unitColor: string;
  barOpacity: number;
} {
  return {
    nameColor,
    valueColor: entityValueColor(lit, scheme),
    unitColor: entityUnitColor(lit, scheme),
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
