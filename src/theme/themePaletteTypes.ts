/** Role-based palette — one object per appearance (dark/light × default/high). */

export interface ThemePaletteText {
  primary: string;
  secondary: string;
  muted: string;
  dimmed: string;
  inverse: string;
}

export interface ThemePaletteState {
  warn: string;
  error: string;
  errorMuted: string;
  disabled: string;
}

export interface ThemePaletteBorders {
  subtle: string;
  default: string;
  strong: string;
  panel: string;
  input: string;
  sheetButton: string;
  headerButton: string;
  headerButtonActive: string;
}

export interface ThemePaletteSurfaces {
  app: string;
  shell: string;
  header: string;
  headerSub: string;
  raised: string;
  /** Sticky bottom-sheet dock (handle + TOTAL + actions). */
  sheetDock: string;
  /** Expanded bottom-sheet body — same plane as sheetDock. */
  sheetBody: string;
  button: string;
  buttonActive: string;
  buttonSolid: string;
  buttonActiveSolid: string;
  input: string;
  inputSolid: string;
  swipe: string;
  dropdown: string;
  headerButton: string;
  headerButtonActive: string;
  headerButtonSolid: string;
  headerButtonActiveSolid: string;
  loadSheetPanel: string;
  loadSheetRow: string;
  outsideDimLight: string;
  outsideDimMedium: string;
  tooltipLine: string;
  longPressAction: string;
  longPressActionActive: string;
  longPressLabelIdle: string;
  longPressLabelHolding: string;
  longPressLabelDisabled: string;
  longPressDisabledOpacity: string;
  longPressProgress: string;
  longPressBeamTrack: string;
  longPressFill: string;
}

export interface ThemePaletteLegacy {
  entityBorderIdle: string;
  fillOutline: string;
  fillEmpty: string;
  actionDisabledLabel: string;
}

export interface ThemePaletteChrome {
  headerBorder?: string;
  headerSubBg?: string;
  headerSubInset?: string;
  outsideDimBlur?: string;
  outsideDimSaturate?: string;
  sheetPanelBlur?: string;
  sheetPanelSaturate?: string;
  sheetPanelShadow: string;
  recipeContextGradient?: string;
  fieldInputShadow?: string;
  fieldInputFocusBorder?: string;
  fieldInputFocusShadow?: string;
}

export interface ThemePalette {
  text: ThemePaletteText;
  state: ThemePaletteState;
  borders: ThemePaletteBorders;
  surfaces: ThemePaletteSurfaces;
  legacy: ThemePaletteLegacy;
  chrome: ThemePaletteChrome;
  /** Semantic accent — defaults to text.secondary when omitted. */
  stateAccent?: string;
  /** Share-bar idle icon background — raised card vs button fill. */
  shareIconIdleUsesRaised?: boolean;
}

export type ThemePaletteBuildExtras = {
  batchTotalsEntries: [string, string][];
  mixerChromeEntries: [string, string][];
};
