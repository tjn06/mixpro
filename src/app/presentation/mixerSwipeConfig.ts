import { themeColorVar } from "../../theme/cssVars";
import { mixerVar } from "../../theme/mixerCssVars";
import { componentTokens } from "../../theme/components";

const chrome = componentTokens.chrome;

export const MIXER_SWIPE_ZONES = [
  { step: 1000, label: "1000 g", weight: 40 },
  { step: 100, label: "100 g", weight: 26 },
  { step: 10, label: "10 g", weight: 20 },
  { step: 1, label: "1 g", weight: 18 },
] as const;

export const MIXER_ZONE_WEIGHT_TOTAL = MIXER_SWIPE_ZONES.reduce(
  (sum, z) => sum + z.weight,
  0,
);

export function mixerZoneIndexFromX(xInArea: number, width: number): number {
  const frac = xInArea / width;
  let acc = 0;
  for (let i = 0; i < MIXER_SWIPE_ZONES.length; i++) {
    acc += MIXER_SWIPE_ZONES[i].weight / MIXER_ZONE_WEIGHT_TOTAL;
    if (frac < acc) return i;
  }
  return MIXER_SWIPE_ZONES.length - 1;
}

export const MIXER_SWIPE_HEIGHT = 180;
export const MIXER_SWIPE_STEPS_PER_DRAG = 10;
export const MIXER_SWIPE_DRAG_MARGIN_PX = 24;
export const MIXER_SWIPE_MAX_DY_PER_FRAME = 48;
export const MIXER_SWIPE_ARROW_IDLE = themeColorVar("swipeArrowIdle");
export const MIXER_SWIPE_STEP_IDLE = themeColorVar("swipeStepIdle");
export const MIXER_DRAG_OVERLAY_HIDE_MS = 320;
export const MIXER_DRAG_BLOCKED_MS = 120;
export const MIXER_CARD_LIMIT_FLASH_TINT_PCT = chrome.cardLimitFlashTintPct;
export const MIXER_BUCKET_LIMIT_COLOR = themeColorVar("bucketLimit");
export const MIXER_BUCKET_LIMIT_VIBRATE_MS = [10, 28, 10] as const;
export const MIXER_DRAG_FOCUS_Z = 5;
export const MIXER_CARD_CONNECTOR_Z = 3;

export const MIXER_SWIPE_SURFACE_BASE = themeColorVar("swipeSurfaceBase");
export const MIXER_SWIPE_COLUMN_BORDER = mixerVar("columnBorder");
export const MIXER_SWIPE_STRIPE_INVERSE = mixerVar("stripeInverse");
export const MIXER_OVERLAY_HINT = mixerVar("overlayHint");
export const MIXER_SWIPE_ZONE_ACTIVE_PCT = chrome.swipeZoneActivePct;
export const MIXER_SWIPE_STRIPE_A_PCT = chrome.swipeStripeAPct;
export const MIXER_SWIPE_STRIPE_B_PCT = chrome.swipeStripeBPct;

export const MIXER_ENTITY_BORDER_W = chrome.entityBorderWidth;
export const MIXER_ENTITY_BORDER_ACTIVE = chrome.entityBorderActiveSuffix;

function surfaceTint(color: string, pct: number, base: string): string {
  return `color-mix(in srgb, ${color} ${pct}%, ${base})`;
}

export function mixerEntityActiveRing(color: string): string {
  return `0 0 0 0.5px ${color}${MIXER_ENTITY_BORDER_ACTIVE}`;
}

export function mixerEntityCardShadow(color: string): string {
  return `0 0 14px ${color}55, 0 0 6px ${color}40`;
}

export function mixerSwipeZoneActive(color: string): string {
  return surfaceTint(color, MIXER_SWIPE_ZONE_ACTIVE_PCT, MIXER_SWIPE_SURFACE_BASE);
}

export function mixerSwipeZoneStripe(even: boolean): string {
  return surfaceTint(
    MIXER_SWIPE_STRIPE_INVERSE,
    even ? MIXER_SWIPE_STRIPE_A_PCT : MIXER_SWIPE_STRIPE_B_PCT,
    MIXER_SWIPE_SURFACE_BASE,
  );
}

export function mixerCardLimitFlashBg(): string {
  return surfaceTint(
    MIXER_BUCKET_LIMIT_COLOR,
    MIXER_CARD_LIMIT_FLASH_TINT_PCT,
    "transparent",
  );
}
