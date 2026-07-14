import { getDarkBatchTotalsCssEntries } from "./batchTotalsCssVars";
import { getComponentCssEntries, getExtendedSemanticCssEntries, componentCssVarNames } from "./componentCssVars";
import { getThemeColorCssEntries } from "./cssVars";
import { getDarkMixerChromeEntries } from "./mixerCssVars";
import { themeBorders } from "./borders";
import { themeSurfaces } from "./surfaces";

const darkDefaultSchemeChrome: [string, string][] = [
  [
    componentCssVarNames.recipeContextGradient,
    "linear-gradient(180deg, rgba(255, 255, 255, 0.045) 0, rgba(220, 220, 238, 0.025) calc(var(--recipe-zone-pt) + 2.75rem), rgba(180, 180, 204, 0.016) calc(var(--recipe-zone-pt) + var(--recipe-card-h) + 1.5rem), rgba(255, 255, 255, 0.006) 78%, transparent 94%)",
  ],
  [componentCssVarNames.fieldInputShadow, "inset 0 1px 3px rgba(0, 0, 0, 0.22)"],
  [componentCssVarNames.fieldInputFocusBorder, "rgba(255, 255, 255, 0.18)"],
  [
    componentCssVarNames.fieldInputFocusShadow,
    "inset 0 1px 3px rgba(0, 0, 0, 0.22), 0 0 0 2px rgba(255, 255, 255, 0.06)",
  ],
];

/** All default (dark) theme CSS var entries — base layer before contrast overrides. */
export function getFullDefaultThemeEntries(): [string, string][] {
  const entries: [string, string][] = [
    ...getThemeColorCssEntries(),
    ...getExtendedSemanticCssEntries(),
    ...getComponentCssEntries(),
    ...getDarkBatchTotalsCssEntries(),
    ...getDarkMixerChromeEntries(),
    ...darkDefaultSchemeChrome,
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
