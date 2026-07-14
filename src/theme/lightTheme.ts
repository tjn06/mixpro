import { getLightBatchTotalsCssEntries } from "./batchTotalsCssVars";
import { getLightMixerChromeEntries } from "./mixerCssVars";
import { buildThemeCssEntries } from "./themePaletteBuilder";
import { lightDefaultPalette } from "./themePalettes";

/** All light-mode CSS var entries — mirrors dark default + component layers. */
export function getFullLightThemeEntries(): [string, string][] {
  return buildThemeCssEntries(lightDefaultPalette, {
    batchTotalsEntries: getLightBatchTotalsCssEntries(),
    mixerChromeEntries: getLightMixerChromeEntries(),
  });
}
