import type { CSSProperties } from "react";

export const CARD_NAME_SIZE = 12;
export const CARD_NAME_WEIGHT = 700;
export const CARD_VALUE_SIZE = 16;
export const CARD_UNIT_SIZE = 12;
export const CARD_UNIT_WEIGHT = 600;

export const CARD_VALUE_INACTIVE = "#9a9ab4";
export const CARD_UNIT_INACTIVE = "#787898";
export const ENTITY_SURFACE_IDLE = "#0d0d1c";
export const RECIPE_RATIO_BORDER_COLOR = "rgba(255,255,255,0.14)";

const ENTITY_BORDER_W = "1.5px";
const ENTITY_BORDER_ACTIVE = "aa";

export const CARD_CHROME_TRANSITION =
  "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, transform 0.1s ease-out";

function entityCardShadow(color: string): string {
  return `0 0 14px ${color}55, 0 0 6px ${color}40`;
}

function entityActiveRing(color: string): string {
  return `0 0 0 0.5px ${color}${ENTITY_BORDER_ACTIVE}`;
}

function entitySurfaceLit(color: string): string {
  return `color-mix(in srgb, ${color} 8%, ${ENTITY_SURFACE_IDLE})`;
}

export function entityCardChrome(
  color: string,
  lit: boolean,
): { border: string; boxShadow: string; background: string } {
  const border = lit
    ? `${ENTITY_BORDER_W} solid ${color}${ENTITY_BORDER_ACTIVE}`
    : `${ENTITY_BORDER_W} solid ${RECIPE_RATIO_BORDER_COLOR}`;
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
    valueColor: lit ? "#ffffff" : CARD_VALUE_INACTIVE,
    unitColor: CARD_UNIT_INACTIVE,
    barOpacity: lit ? 1 : 0.4,
  };
}

export const cardReadoutNameStyle = (color: string): CSSProperties => ({
  fontSize: CARD_NAME_SIZE,
  letterSpacing: "0.18em",
  color,
  fontWeight: CARD_NAME_WEIGHT,
});

export const cardReadoutValueStyle = (color: string): CSSProperties => ({
  fontSize: CARD_VALUE_SIZE,
  fontWeight: 600,
  color,
  lineHeight: 1,
  marginTop: 4,
});

export const cardReadoutUnitStyle = (color: string): CSSProperties => ({
  fontSize: CARD_UNIT_SIZE,
  color,
  letterSpacing: "0.08em",
  fontWeight: CARD_UNIT_WEIGHT,
  marginTop: 2,
});
