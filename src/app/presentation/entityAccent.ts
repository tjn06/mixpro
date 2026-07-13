import type { ColorScheme } from "../../theme/appearance";
import { themeColorVar } from "../../theme/cssVars";
import { cv } from "../ui/tokens";

/** Ingredient accent colors — bright on dark surfaces, deeper on light. */
const ENTITY_ACCENT_DARK = {
  TOTAL: "#34d399",
  A: "#a855f7",
  B: "#22d3ee",
  TIX: "#a3e635",
  SAND: "#f97316",
} as const;

const ENTITY_ACCENT_LIGHT = {
  TOTAL: "#059669",
  A: "#6d28d9",
  B: "#0e7490",
  TIX: "#4d7c0f",
  SAND: "#c2410c",
} as const;

export type EntityAccentId = keyof typeof ENTITY_ACCENT_DARK;

export function entityAccentColor(id: string, scheme: ColorScheme): string {
  const key = id as EntityAccentId;
  if (scheme === "light") {
    return ENTITY_ACCENT_LIGHT[key] ?? ENTITY_ACCENT_DARK[key] ?? id;
  }
  return ENTITY_ACCENT_DARK[key] ?? id;
}

/** Value readout on a lit entity card — bright on dark, strong ink on light. */
export function entityLitValueColor(scheme: ColorScheme): string {
  if (scheme === "light") return cv.text.primary;
  return themeColorVar("white");
}
