import { getLightHcBatchTotalsCssEntries } from "./batchTotalsCssVars";
import { getLightHcMixerChromeEntries } from "./mixerCssVars";
import { buildThemeCssEntries } from "./themePaletteBuilder";
import { lightHighContrastPalette } from "./themePalettes";

/** Semantic + component + legacy CSS var overrides for light high-contrast mode. */
export function getLightHighContrastCssEntries(): [string, string][] {
  return buildThemeCssEntries(lightHighContrastPalette, {
    batchTotalsEntries: getLightHcBatchTotalsCssEntries(),
    mixerChromeEntries: getLightHcMixerChromeEntries(),
  });
}
