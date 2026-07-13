/** Mixer + long-press chrome CSS vars (scheme-specific values injected on :root). */
export const mixerCssVarNames = {
  columnBorder: "--ui-swipe-column-border",
  stripeInverse: "--ui-swipe-stripe-inverse",
  overlayHint: "--ui-overlay-hint",
  longPressBorderRgb: "--ui-long-press-border-rgb",
} as const;

export type MixerCssVarKey = keyof typeof mixerCssVarNames;

export function mixerVar(key: MixerCssVarKey): string {
  return `var(${mixerCssVarNames[key]})`;
}

/** Dark default mixer chrome entries. */
export function getDarkMixerChromeEntries(): [string, string][] {
  return [
    [mixerCssVarNames.columnBorder, "1px solid rgba(255, 255, 255, 0.08)"],
    [mixerCssVarNames.stripeInverse, "#ffffff"],
    [mixerCssVarNames.overlayHint, "rgba(5, 5, 16, 0.68)"],
    [mixerCssVarNames.longPressBorderRgb, "255, 255, 255"],
  ];
}

/** Light default mixer chrome entries. */
export function getLightMixerChromeEntries(): [string, string][] {
  return [
    [mixerCssVarNames.columnBorder, "1px solid rgba(0, 0, 0, 0.08)"],
    [mixerCssVarNames.stripeInverse, "#242436"],
    [mixerCssVarNames.overlayHint, "rgba(0, 0, 0, 0.45)"],
    [mixerCssVarNames.longPressBorderRgb, "0, 0, 0"],
  ];
}

/** Dark high-contrast mixer chrome. */
export function getDarkHcMixerChromeEntries(): [string, string][] {
  return [
    [mixerCssVarNames.columnBorder, "1px solid rgba(255, 255, 255, 0.2)"],
    [mixerCssVarNames.stripeInverse, "#ffffff"],
    [mixerCssVarNames.overlayHint, "rgba(3, 3, 12, 0.72)"],
    [mixerCssVarNames.longPressBorderRgb, "255, 255, 255"],
  ];
}

/** Light high-contrast mixer chrome. */
export function getLightHcMixerChromeEntries(): [string, string][] {
  return [
    [mixerCssVarNames.columnBorder, "1px solid rgba(0, 0, 0, 0.16)"],
    [mixerCssVarNames.stripeInverse, "#1a1a28"],
    [mixerCssVarNames.overlayHint, "rgba(0, 0, 0, 0.55)"],
    [mixerCssVarNames.longPressBorderRgb, "0, 0, 0"],
  ];
}
