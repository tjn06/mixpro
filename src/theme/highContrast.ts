import { getDarkHcBatchTotalsCssEntries } from "./batchTotalsCssVars";
import { themeColors } from "./colors";
import { getDarkHcMixerChromeEntries } from "./mixerCssVars";
import { themeSurfaces } from "./surfaces";
import { buildThemeCssEntries } from "./themePaletteBuilder";
import { darkHighContrastPalette } from "./themePalettes";

/** Semantic + component + legacy CSS var overrides for dark high-contrast mode. */
export function getHighContrastCssEntries(): [string, string][] {
  const palette = {
    ...darkHighContrastPalette,
    chrome: {
      ...darkHighContrastPalette.chrome,
      headerSubInset: themeSurfaces.insetHighlight,
    },
  };

  return buildThemeCssEntries(
    palette,
    {
      batchTotalsEntries: getDarkHcBatchTotalsCssEntries(),
      mixerChromeEntries: getDarkHcMixerChromeEntries(),
    },
    themeColors,
  );
}
