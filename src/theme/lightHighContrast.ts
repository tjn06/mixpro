import { componentCssVarNames } from "./componentCssVars";
import { themeColorCssVars } from "./cssVars";
import type { ThemeColorKey } from "./colors";
import {
  alphaBlack,
  borderSolidBlack,
  primitiveInkText,
  primitivePaper,
} from "./primitives";
import { getLightHcBatchTotalsCssEntries } from "./batchTotalsCssVars";
import { getLightHcMixerChromeEntries } from "./mixerCssVars";

/**
 * Light high-contrast palette — bold ink text and strong borders for outdoor sunlight.
 * Applied when `data-theme="light"` and `data-contrast="high"` are set on :root.
 */
const ink = primitiveInkText;
const paper = primitivePaper;

const hcText = {
  primary: ink[90],
  secondary: ink[70],
  muted: ink[60],
  dimmed: ink[40],
  inverse: ink[100],
} as const;

const hcState = {
  warn: "#6a5018",
  error: "#901828",
  errorMuted: "#702030",
  accent: "#3828a0",
  disabled: ink[30],
} as const;

const hcPaper = {
  raised: paper[600],
  input: paper[700],
  swipe: paper[750],
  dropdown: paper[650],
} as const;

const hcBorders = {
  subtle: borderSolidBlack(0.16),
  default: borderSolidBlack(0.24, "1.5px"),
  strong: borderSolidBlack(0.34, "1.5px"),
  panel: borderSolidBlack(0.26, "1.5px"),
  input: borderSolidBlack(0.2),
  sheetButton: borderSolidBlack(0.26, "1.5px"),
  headerButton: borderSolidBlack(0.14),
  headerButtonActive: borderSolidBlack(0.24),
} as const;

const hcSurfaces = {
  raised: hcPaper.raised,
  button: alphaBlack(0.1),
  buttonActive: alphaBlack(0.14),
  buttonSolid: "#dedee4",
  buttonActiveSolid: "#d4d4dc",
  input: alphaBlack(0.06),
  headerButton: alphaBlack(0.07),
  headerButtonActive: alphaBlack(0.11),
  headerButtonSolid: "#e0e0e8",
  headerButtonActiveSolid: "#d6d6e0",
  app: paper[900],
  shell: paper[950],
  header: paper[850],
  headerSub: paper[800],
  loadSheetPanel: "rgba(250, 250, 252, 0.94)",
  loadSheetRow: "rgba(250, 250, 252, 0.98)",
  outsideDimLight: "rgba(0, 0, 0, 0.28)",
  outsideDimMedium: "rgba(0, 0, 0, 0.4)",
  tooltipLine: alphaBlack(0.24),
  longPressAction: alphaBlack(0.14),
  longPressActionActive: alphaBlack(0.18),
} as const;

const hcLegacyColors: Record<ThemeColorKey, string> = {
  appBackground: hcSurfaces.app,
  shellBackground: hcSurfaces.shell,
  headerBackground: hcSurfaces.header,
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
  entityBorderIdle: alphaBlack(0.24),
  swipeSurfaceBase: hcPaper.swipe,
  inputSurface: hcPaper.input,
  holdingSurface: hcPaper.input,
  dropdownMenuBg: hcPaper.dropdown,
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
  fillOutline: alphaBlack(0.32),
  fillEmpty: alphaBlack(0.05),
  swipeArrowIdle: hcText.muted,
  swipeStepIdle: hcText.dimmed,
  dropdownMenuText: hcText.secondary,
  dropdownMenuTextMuted: hcText.dimmed,
  dropdownMenuLockedLabel: hcText.muted,
  extraBatchAccent: hcState.accent,
  progress: hcText.secondary,
};

const fieldInputBorderError = `1.5px solid ${hcState.error}`;

/** Semantic + component + legacy CSS var overrides for light high-contrast mode. */
export function getLightHighContrastCssEntries(): [string, string][] {
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
    [componentCssVarNames.surfaceInput, hcSurfaces.input],
    [componentCssVarNames.surfaceApp, hcSurfaces.app],
  ];

  const component: [string, string][] = [
    [componentCssVarNames.sheetPanelBorder, hcBorders.panel],
    [componentCssVarNames.sheetPanelBg, hcSurfaces.loadSheetPanel],
    [componentCssVarNames.sheetPanelShadow, "0 20px 56px rgba(0, 0, 0, 0.18)"],
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

  const legacy: [string, string][] = (Object.keys(hcLegacyColors) as ThemeColorKey[]).map(
    (key) => [themeColorCssVars[key], hcLegacyColors[key]],
  );

  const chrome: [string, string][] = [
    ["--ui-border-header", hcBorders.subtle],
    ["--ui-border-header-sub", hcBorders.subtle],
    ["--ui-header-sub-bg", hcSurfaces.headerSub],
    ["--ui-header-sub-inset", "inset 0 1px 0 rgba(0, 0, 0, 0.1)"],
    ["--ui-outside-dim-blur", "12px"],
    ["--ui-outside-dim-saturate", "1.04"],
    ["--ui-sheet-panel-blur", "20px"],
    ["--ui-sheet-panel-saturate", "1.04"],
    ...getLightHcMixerChromeEntries(),
  ];

  return [...semantic, ...component, ...legacy, ...getLightHcBatchTotalsCssEntries(), ...chrome];
}
