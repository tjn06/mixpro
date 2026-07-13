import { alphaWhite, borderSolid, primitiveInk } from "./primitives";
import { componentCssVarNames } from "./componentCssVars";
import { getDarkHcBatchTotalsCssEntries } from "./batchTotalsCssVars";
import { getDarkHcMixerChromeEntries } from "./mixerCssVars";
import { themeColorCssVars } from "./cssVars";
import type { ThemeColorKey } from "./colors";
import { themeColors } from "./colors";
import { themeSurfaces } from "./surfaces";

/**
 * Dark high-contrast palette — optimized for bright outdoor / sunlight readability.
 * Applied when `data-theme="dark"` (or unset) and `data-contrast="high"` are set on :root.
 */
const hcText = {
  primary: "#ffffff",
  secondary: "#f0f0fa",
  muted: "#d4d4ec",
  dimmed: "#b0b0cc",
  inverse: "#ffffff",
} as const;

const hcState = {
  warn: "#f4d898",
  error: "#ff8a9a",
  errorMuted: "#d07080",
  accent: "#b8a8ff",
  disabled: "#9090b0",
} as const;

const hcInk = {
  raised: "#1e1e3c",
  input: "#161632",
  swipe: "#101028",
  dropdown: "#444460",
} as const;

const hcBorders = {
  subtle: borderSolid(0.28),
  default: borderSolid(0.36, "1.5px"),
  strong: borderSolid(0.44, "1.5px"),
  panel: borderSolid(0.38, "1.5px"),
  input: borderSolid(0.32),
  sheetButton: borderSolid(0.36, "1.5px"),
  headerButton: borderSolid(0.28),
  headerButtonActive: borderSolid(0.4),
} as const;

const hcSurfaces = {
  raised: hcInk.raised,
  button: alphaWhite(0.18),
  buttonActive: alphaWhite(0.24),
  buttonSolid: "#42424e",
  buttonActiveSolid: "#4c4c58",
  input: alphaWhite(0.14),
  headerButton: alphaWhite(0.12),
  headerButtonActive: alphaWhite(0.2),
  headerButtonSolid: "#2a2a36",
  headerButtonActiveSolid: "#363642",
  loadSheetPanel: "rgba(10, 10, 24, 0.82)",
  loadSheetRow: "rgba(10, 10, 24, 0.88)",
  outsideDimLight: "rgba(3, 3, 12, 0.48)",
  outsideDimMedium: "rgba(3, 3, 12, 0.62)",
  tooltipLine: alphaWhite(0.44),
  app: primitiveInk[900],
  longPressAction: "#44444e",
  longPressActionActive: "#50505a",
  longPressLabelIdle: hcText.primary,
  longPressLabelHolding: hcText.primary,
  longPressLabelDisabled: hcText.muted,
  longPressDisabledOpacity: "0.68",
  longPressProgress: hcText.secondary,
  longPressBeamTrack: alphaWhite(0.18),
  longPressFill: alphaWhite(0.1),
} as const;

/** Semantic + component + legacy CSS var overrides for high-contrast mode. */
export function getHighContrastCssEntries(): [string, string][] {
  const fieldInputBorderError = `1.5px solid ${hcState.error}`;

  const semantic: [string, string][] = [
    [componentCssVarNames.textPrimary, hcText.primary],
    [componentCssVarNames.textSecondary, hcText.secondary],
    [componentCssVarNames.textMuted, hcText.muted],
    [componentCssVarNames.textDimmed, hcText.dimmed],
    [componentCssVarNames.textInverse, hcText.inverse],
    [componentCssVarNames.iconPrimary, hcText.primary],
    [componentCssVarNames.iconMuted, hcText.muted],
    [componentCssVarNames.stateWarn, hcState.warn],
    [componentCssVarNames.stateError, hcState.error],
    [componentCssVarNames.stateErrorMuted, hcState.errorMuted],
    [componentCssVarNames.stateAccent, hcState.accent],
    [componentCssVarNames.stateDisabled, hcState.disabled],
    [componentCssVarNames.borderDefault, hcBorders.default],
    [componentCssVarNames.borderStrong, hcBorders.strong],
    [componentCssVarNames.borderSubtle, hcBorders.subtle],
    [componentCssVarNames.borderPanel, hcBorders.panel],
    [componentCssVarNames.borderInput, hcBorders.input],
    [componentCssVarNames.borderSheetButton, hcBorders.sheetButton],
    [componentCssVarNames.borderHeaderButton, hcBorders.headerButton],
    [componentCssVarNames.borderHeaderButtonActive, hcBorders.headerButtonActive],
    [componentCssVarNames.surfaceRaised, hcSurfaces.raised],
    [componentCssVarNames.surfaceButton, hcSurfaces.button],
    [componentCssVarNames.surfaceButtonActive, hcSurfaces.buttonActive],
    [componentCssVarNames.surfaceButtonSolid, hcSurfaces.buttonSolid],
    [componentCssVarNames.surfaceButtonActiveSolid, hcSurfaces.buttonActiveSolid],
    [componentCssVarNames.surfaceLongPress, hcSurfaces.longPressAction],
    [componentCssVarNames.surfaceLongPressActive, hcSurfaces.longPressActionActive],
    [componentCssVarNames.longPressLabelIdle, hcSurfaces.longPressLabelIdle],
    [componentCssVarNames.longPressLabelHolding, hcSurfaces.longPressLabelHolding],
    [componentCssVarNames.longPressLabelDisabled, hcSurfaces.longPressLabelDisabled],
    [componentCssVarNames.longPressDisabledOpacity, hcSurfaces.longPressDisabledOpacity],
    [componentCssVarNames.longPressProgress, hcSurfaces.longPressProgress],
    [componentCssVarNames.longPressBeamTrack, hcSurfaces.longPressBeamTrack],
    [componentCssVarNames.longPressFill, hcSurfaces.longPressFill],
    [componentCssVarNames.surfaceInput, hcSurfaces.input],
    [componentCssVarNames.surfaceApp, hcSurfaces.app],
  ];

  const component: [string, string][] = [
    [componentCssVarNames.sheetPanelBorder, hcBorders.panel],
    [componentCssVarNames.sheetPanelBg, hcSurfaces.loadSheetPanel],
    [componentCssVarNames.sheetPanelShadow, "0 20px 56px rgba(0, 0, 0, 0.48)"],
    [componentCssVarNames.sheetPanelOverlayLight, hcSurfaces.outsideDimLight],
    [componentCssVarNames.sheetPanelOverlayMedium, hcSurfaces.outsideDimMedium],
    [componentCssVarNames.sheetPanelListRowBg, hcSurfaces.loadSheetRow],
    [componentCssVarNames.sheetPanelListRowBorder, hcBorders.panel],
    [componentCssVarNames.sheetPanelFadeBg, hcSurfaces.loadSheetPanel],
    [componentCssVarNames.sheetFooterBtnBg, hcSurfaces.button],
    [componentCssVarNames.sheetFooterBtnBorder, hcBorders.sheetButton],
    [componentCssVarNames.sheetFooterBtnColor, hcText.primary],
    [componentCssVarNames.sheetFooterTooltipColor, hcText.secondary],
    [componentCssVarNames.sheetFooterTooltipLine, hcSurfaces.tooltipLine],
    [componentCssVarNames.fieldInputBg, hcSurfaces.input],
    [componentCssVarNames.fieldInputBorder, hcBorders.input],
    [componentCssVarNames.fieldInputBorderError, fieldInputBorderError],
    [componentCssVarNames.fieldInputColor, hcText.primary],
    [componentCssVarNames.headerIconBtnBg, hcSurfaces.headerButton],
    [componentCssVarNames.headerIconBtnBgActive, hcSurfaces.headerButtonActive],
    [componentCssVarNames.headerIconBtnBgSolid, hcSurfaces.headerButtonSolid],
    [componentCssVarNames.headerIconBtnBgActiveSolid, hcSurfaces.headerButtonActiveSolid],
    [componentCssVarNames.headerIconBtnBorder, hcBorders.headerButton],
    [componentCssVarNames.headerIconBtnBorderActive, hcBorders.headerButtonActive],
    [componentCssVarNames.headerIconBtnColor, hcText.muted],
    [componentCssVarNames.headerIconBtnColorActive, hcText.primary],
    [componentCssVarNames.shareIconIdleBg, hcSurfaces.button],
    [componentCssVarNames.shareIconActiveBg, hcSurfaces.button],
    [componentCssVarNames.shareIconIdleBorder, hcBorders.default],
    [componentCssVarNames.shareIconActiveBorder, hcBorders.strong],
    [componentCssVarNames.shareIconIdleColor, hcText.muted],
    [componentCssVarNames.shareIconActiveColor, hcText.secondary],
    [componentCssVarNames.stripPanelBg, hcSurfaces.buttonSolid],
    [componentCssVarNames.stripNeutral, hcSurfaces.buttonSolid],
    [componentCssVarNames.stripMoreOpen, hcSurfaces.buttonActiveSolid],
    [componentCssVarNames.stripRename, hcSurfaces.buttonSolid],
    [componentCssVarNames.stripDelete, hcSurfaces.buttonSolid],
    [componentCssVarNames.stripOpen, hcSurfaces.buttonSolid],
    [componentCssVarNames.stripDivider, hcBorders.default],
    [componentCssVarNames.stripDeleteColor, hcState.error],
    [componentCssVarNames.stripOpenColor, hcText.secondary],
    [componentCssVarNames.stripRenameColor, hcText.primary],
    [componentCssVarNames.stripMutedColor, hcText.muted],
  ];

  const legacyHcColors: Record<ThemeColorKey, string> = {
    ...themeColors,
    title: hcText.primary,
    titleMuted: hcText.secondary,
    muted: hcText.muted,
    mutedDim: hcText.dimmed,
    mutedDimmer: hcText.dimmed,
    value: hcText.secondary,
    white: hcText.inverse,
    secondary: hcText.secondary,
    secondaryMuted: hcText.muted,
    actionPrimaryLabel: hcText.muted,
    actionSecondaryLabel: hcText.muted,
    actionCompactLabel: hcText.muted,
    actionDisabledLabel: hcState.disabled,
    actionHoldingLabel: hcText.secondary,
    headerSubline: hcText.muted,
    entitySurfaceIdle: hcSurfaces.raised,
    entityBorderIdle: alphaWhite(0.36),
    swipeSurfaceBase: hcInk.swipe,
    inputSurface: hcInk.input,
    holdingSurface: hcInk.input,
    dropdownMenuBg: hcInk.dropdown,
    cardValueInactive: hcText.secondary,
    cardUnitInactive: hcText.muted,
    recipeId: hcText.muted,
    recipeIdMuted: hcText.dimmed,
    recipeValue: hcText.secondary,
    recipeValueMuted: hcText.muted,
    recipeUnit: hcText.muted,
    recipeColon: hcText.dimmed,
    fill: hcText.secondary,
    fillMuted: hcText.dimmed,
    bucketLimit: hcState.error,
    bucketFillFull: hcState.error,
    bucketFillFullMuted: hcState.errorMuted,
    fillOutline: alphaWhite(0.48),
    fillEmpty: alphaWhite(0.06),
    swipeArrowIdle: hcText.muted,
    swipeStepIdle: hcText.dimmed,
    dropdownMenuText: hcText.secondary,
    dropdownMenuTextMuted: hcText.dimmed,
    dropdownMenuLockedLabel: hcText.muted,
    extraBatchAccent: hcState.accent,
    progress: hcText.secondary,
    appBackground: hcSurfaces.app,
    shellBackground: primitiveInk[950],
    headerBackground: primitiveInk[850],
  };

  const legacy: [string, string][] = (Object.keys(themeColorCssVars) as ThemeColorKey[]).map(
    (key) => [themeColorCssVars[key], legacyHcColors[key]],
  );

  const chrome: [string, string][] = [
    ["--ui-border-header", borderSolid(0.24)],
    ["--ui-border-header-sub", borderSolid(0.24)],
    ["--ui-header-sub-inset", themeSurfaces.insetHighlight],
    ...getDarkHcMixerChromeEntries(),
  ];

  return [...semantic, ...component, ...legacy, ...getDarkHcBatchTotalsCssEntries(), ...chrome];
}
