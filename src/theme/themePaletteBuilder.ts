import type { ThemeColorKey } from "./colors";
import { componentCssVarNames } from "./componentCssVars";
import { themeColorCssVars } from "./cssVars";
import type { ThemePalette, ThemePaletteBuildExtras } from "./themePaletteTypes";

function accentColor(palette: ThemePalette): string {
  return palette.stateAccent ?? palette.text.secondary;
}

/** Map palette roles → legacy --ui-* color keys. */
export function buildLegacyColorMap(
  palette: ThemePalette,
  base?: Partial<Record<ThemeColorKey, string>>,
): Record<ThemeColorKey, string> {
  const { text, state, surfaces, legacy } = palette;

  return {
    ...(base as Record<ThemeColorKey, string>),
    appBackground: surfaces.app,
    shellBackground: surfaces.shell,
    headerBackground: surfaces.header,
    title: text.primary,
    titleMuted: text.secondary,
    muted: text.muted,
    mutedDim: text.dimmed,
    mutedDimmer: text.dimmed,
    value: text.secondary,
    white: text.inverse,
    secondary: text.secondary,
    secondaryMuted: text.muted,
    actionPrimaryLabel: text.muted,
    actionSecondaryLabel: text.muted,
    actionCompactLabel: text.muted,
    actionDisabledLabel: legacy.actionDisabledLabel,
    actionHoldingLabel: text.secondary,
    headerSubline: text.muted,
    entitySurfaceIdle: surfaces.raised,
    entityBorderIdle: legacy.entityBorderIdle,
    swipeSurfaceBase: surfaces.swipe,
    inputSurface: surfaces.inputSolid,
    holdingSurface: surfaces.inputSolid,
    dropdownMenuBg: surfaces.dropdown,
    cardValueInactive: text.secondary,
    cardUnitInactive: text.muted,
    recipeId: text.muted,
    recipeIdMuted: text.dimmed,
    recipeValue: text.secondary,
    recipeValueMuted: text.muted,
    recipeUnit: text.muted,
    recipeColon: text.dimmed,
    fill: text.secondary,
    fillMuted: text.dimmed,
    bucketLimit: state.error,
    bucketFillFull: state.error,
    bucketFillFullMuted: state.errorMuted,
    fillOutline: legacy.fillOutline,
    fillEmpty: legacy.fillEmpty,
    swipeArrowIdle: text.muted,
    swipeStepIdle: text.dimmed,
    dropdownMenuText: text.secondary,
    dropdownMenuTextMuted: text.dimmed,
    dropdownMenuLockedLabel: text.muted,
    extraBatchAccent: accentColor(palette),
    progress: text.secondary,
  };
}

/** Build semantic + component + legacy + chrome CSS var entries from one palette. */
export function buildThemeCssEntries(
  palette: ThemePalette,
  extras: ThemePaletteBuildExtras,
  legacyBase?: Partial<Record<ThemeColorKey, string>>,
): [string, string][] {
  const { text, state, borders, surfaces, chrome } = palette;
  const fieldInputBorderError = `1.5px solid ${state.error}`;
  const shareIconIdleBg = palette.shareIconIdleUsesRaised
    ? surfaces.raised
    : surfaces.button;

  const semantic: [string, string][] = [
    [componentCssVarNames.textPrimary, text.primary],
    [componentCssVarNames.textSecondary, text.secondary],
    [componentCssVarNames.textMuted, text.muted],
    [componentCssVarNames.textDimmed, text.dimmed],
    [componentCssVarNames.textInverse, text.inverse],
    [componentCssVarNames.iconPrimary, text.primary],
    [componentCssVarNames.iconMuted, text.muted],
    [componentCssVarNames.stateWarn, state.warn],
    [componentCssVarNames.stateError, state.error],
    [componentCssVarNames.stateErrorMuted, state.errorMuted],
    [componentCssVarNames.stateAccent, accentColor(palette)],
    [componentCssVarNames.selectionBorder, borders.strong],
    [componentCssVarNames.selectionBg, surfaces.buttonActive],
    [componentCssVarNames.stateDisabled, state.disabled],
    [componentCssVarNames.borderDefault, borders.default],
    [componentCssVarNames.borderStrong, borders.strong],
    [componentCssVarNames.borderSubtle, borders.subtle],
    [componentCssVarNames.borderPanel, borders.panel],
    [componentCssVarNames.borderInput, borders.input],
    [componentCssVarNames.borderSheetButton, borders.sheetButton],
    [componentCssVarNames.borderHeaderButton, borders.headerButton],
    [componentCssVarNames.borderHeaderButtonActive, borders.headerButtonActive],
    [componentCssVarNames.surfaceRaised, surfaces.raised],
    [componentCssVarNames.surfaceButton, surfaces.button],
    [componentCssVarNames.surfaceButtonActive, surfaces.buttonActive],
    [componentCssVarNames.surfaceButtonSolid, surfaces.buttonSolid],
    [componentCssVarNames.surfaceButtonActiveSolid, surfaces.buttonActiveSolid],
    [componentCssVarNames.surfaceLongPress, surfaces.longPressAction],
    [componentCssVarNames.surfaceLongPressActive, surfaces.longPressActionActive],
    [componentCssVarNames.longPressLabelIdle, surfaces.longPressLabelIdle],
    [componentCssVarNames.longPressLabelHolding, surfaces.longPressLabelHolding],
    [componentCssVarNames.longPressLabelDisabled, surfaces.longPressLabelDisabled],
    [componentCssVarNames.longPressDisabledOpacity, surfaces.longPressDisabledOpacity],
    [componentCssVarNames.longPressProgress, surfaces.longPressProgress],
    [componentCssVarNames.longPressBeamTrack, surfaces.longPressBeamTrack],
    [componentCssVarNames.longPressFill, surfaces.longPressFill],
    [componentCssVarNames.surfaceInput, surfaces.input],
    [componentCssVarNames.surfaceApp, surfaces.app],
  ];

  const component: [string, string][] = [
    [componentCssVarNames.sheetPanelBorder, borders.panel],
    [componentCssVarNames.sheetPanelBg, surfaces.loadSheetPanel],
    [componentCssVarNames.sheetPanelShadow, chrome.sheetPanelShadow],
    [componentCssVarNames.sheetPanelOverlayLight, surfaces.outsideDimLight],
    [componentCssVarNames.sheetPanelOverlayMedium, surfaces.outsideDimMedium],
    [componentCssVarNames.sheetPanelListRowBg, surfaces.loadSheetRow],
    [componentCssVarNames.sheetPanelListRowBorder, borders.panel],
    [componentCssVarNames.sheetPanelFadeBg, surfaces.loadSheetPanel],
    [componentCssVarNames.sheetFooterBtnBg, surfaces.button],
    [componentCssVarNames.sheetFooterBtnBorder, borders.sheetButton],
    [componentCssVarNames.sheetFooterBtnColor, text.primary],
    [componentCssVarNames.sheetFooterTooltipColor, text.secondary],
    [componentCssVarNames.sheetFooterTooltipLine, surfaces.tooltipLine],
    [componentCssVarNames.fieldInputBg, surfaces.input],
    [componentCssVarNames.fieldInputBorder, borders.input],
    [componentCssVarNames.fieldInputBorderError, fieldInputBorderError],
    [componentCssVarNames.fieldInputColor, text.primary],
    ...(chrome.fieldInputShadow
      ? [[componentCssVarNames.fieldInputShadow, chrome.fieldInputShadow] as [string, string]]
      : []),
    ...(chrome.fieldInputFocusBorder
      ? [[componentCssVarNames.fieldInputFocusBorder, chrome.fieldInputFocusBorder] as [string, string]]
      : []),
    ...(chrome.fieldInputFocusShadow
      ? [[componentCssVarNames.fieldInputFocusShadow, chrome.fieldInputFocusShadow] as [string, string]]
      : []),
    [componentCssVarNames.headerIconBtnBg, surfaces.headerButton],
    [componentCssVarNames.headerIconBtnBgActive, surfaces.headerButtonActive],
    [componentCssVarNames.headerIconBtnBgSolid, surfaces.headerButtonSolid],
    [componentCssVarNames.headerIconBtnBgActiveSolid, surfaces.headerButtonActiveSolid],
    [componentCssVarNames.headerIconBtnBorder, borders.headerButton],
    [componentCssVarNames.headerIconBtnBorderActive, borders.headerButtonActive],
    [componentCssVarNames.headerIconBtnColor, text.muted],
    [componentCssVarNames.headerIconBtnColorActive, text.primary],
    [componentCssVarNames.shareIconIdleBg, shareIconIdleBg],
    [componentCssVarNames.shareIconActiveBg, surfaces.button],
    [componentCssVarNames.shareIconIdleBorder, borders.default],
    [componentCssVarNames.shareIconActiveBorder, borders.strong],
    [componentCssVarNames.shareIconIdleColor, text.muted],
    [componentCssVarNames.shareIconActiveColor, text.secondary],
    [componentCssVarNames.stripPanelBg, surfaces.buttonSolid],
    [componentCssVarNames.stripNeutral, surfaces.buttonSolid],
    [componentCssVarNames.stripMoreOpen, surfaces.buttonActiveSolid],
    [componentCssVarNames.stripRename, surfaces.buttonSolid],
    [componentCssVarNames.stripDelete, surfaces.buttonSolid],
    [componentCssVarNames.stripOpen, surfaces.buttonSolid],
    [componentCssVarNames.stripDivider, borders.default],
    [componentCssVarNames.stripDeleteColor, state.error],
    [componentCssVarNames.stripOpenColor, text.secondary],
    [componentCssVarNames.stripRenameColor, text.primary],
    [componentCssVarNames.stripMutedColor, text.muted],
  ];

  const legacyColors = buildLegacyColorMap(palette, legacyBase);
  const legacy: [string, string][] = (Object.keys(themeColorCssVars) as ThemeColorKey[]).map(
    (key) => [themeColorCssVars[key], legacyColors[key]],
  );

  const chromeEntries: [string, string][] = [
    ...(chrome.headerBorder
      ? [
          ["--ui-border-header", chrome.headerBorder] as [string, string],
          ["--ui-border-header-sub", chrome.headerBorder] as [string, string],
        ]
      : []),
    ...(chrome.headerSubBg ? [["--ui-header-sub-bg", chrome.headerSubBg] as [string, string]] : []),
    ...(chrome.headerSubInset
      ? [["--ui-header-sub-inset", chrome.headerSubInset] as [string, string]]
      : []),
    ...(chrome.outsideDimBlur
      ? [["--ui-outside-dim-blur", chrome.outsideDimBlur] as [string, string]]
      : []),
    ...(chrome.outsideDimSaturate
      ? [["--ui-outside-dim-saturate", chrome.outsideDimSaturate] as [string, string]]
      : []),
    ...(chrome.sheetPanelBlur
      ? [["--ui-sheet-panel-blur", chrome.sheetPanelBlur] as [string, string]]
      : []),
    ...(chrome.sheetPanelSaturate
      ? [["--ui-sheet-panel-saturate", chrome.sheetPanelSaturate] as [string, string]]
      : []),
    ...(chrome.recipeContextGradient
      ? [[componentCssVarNames.recipeContextGradient, chrome.recipeContextGradient] as [string, string]]
      : []),
    ...extras.mixerChromeEntries,
  ];

  return [
    ...semantic,
    ...component,
    ...legacy,
    ...extras.batchTotalsEntries,
    ...chromeEntries,
  ];
}
