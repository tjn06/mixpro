import { getDarkBatchTotalsCssEntries } from "./batchTotalsCssVars";
import { getComponentCssEntries, getExtendedSemanticCssEntries } from "./componentCssVars";
import { getThemeColorCssEntries } from "./cssVars";
import { getDarkMixerChromeEntries } from "./mixerCssVars";
import { themeBorders } from "./borders";
import { themeSurfaces } from "./surfaces";

/** All default (dark) theme CSS var entries — base layer before contrast overrides. */
export function getFullDefaultThemeEntries(): [string, string][] {
  const entries: [string, string][] = [
    ...getThemeColorCssEntries(),
    ...getExtendedSemanticCssEntries(),
    ...getComponentCssEntries(),
    ...getDarkBatchTotalsCssEntries(),
    ...getDarkMixerChromeEntries(),
    ["--ui-border-header", themeBorders.header],
    ["--ui-border-header-sub", themeBorders.headerSub],
    ["--ui-header-sub-bg", themeSurfaces.headerSubBg],
    ["--ui-header-sub-inset", themeSurfaces.insetHighlight],
    ["--ui-outside-dim-blur", themeSurfaces.outsideDimBlur],
    ["--ui-outside-dim-saturate", String(themeSurfaces.outsideDimSaturate)],
    ["--ui-sheet-panel-blur", themeSurfaces.sheetPanelBlur],
    ["--ui-sheet-panel-saturate", String(themeSurfaces.sheetPanelSaturate)],
  ];
  return entries;
}
