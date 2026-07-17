import { alphaWhite, borderSolid, primitiveInk, primitiveSemantic, primitiveText } from "./primitives";
import { extraBatchDark } from "./extraBatchTheme";

/**
 * Semantic design tokens — role-based naming.
 * Source of truth for contrast; legacy theme keys alias here.
 */
export const semanticColors = {
  text: {
    primary: primitiveText[80],
    secondary: primitiveText[60],
    muted: primitiveText[50],
    dimmed: primitiveText[20],
    inverse: primitiveText[100],
  },
  icon: {
    primary: primitiveText[80],
    secondary: primitiveText[60],
    muted: primitiveText[50],
    dimmed: primitiveText[20],
  },
  state: {
    warn: primitiveSemantic.warn,
    error: primitiveSemantic.error,
    errorMuted: primitiveSemantic.errorMuted,
    accent: primitiveSemantic.accent,
    /** Session Mode accent — keep in sync with --session-accent. */
    session: primitiveSemantic.session,
    disabled: primitiveText[10],
  },
  surface: {
    app: primitiveInk[900],
    shell: primitiveInk[950],
    header: primitiveInk[850],
    raised: primitiveInk[650],
    /** Sticky dock chrome — modest lift above app, not full entity raised. */
    sheetDock: primitiveInk[700],
    /** Expanded swipe-panel body — matches dock for a single sheet plane. */
    sheetBody: primitiveInk[700],
    input: primitiveInk[700],
    swipe: primitiveInk[800],
    dropdown: "#3a3a4c",
  },
} as const;

export const semanticBorders = {
  subtle: borderSolid(0.16),
  default: borderSolid(0.24, "1.5px"),
  strong: borderSolid(0.32, "1.5px"),
  focus: borderSolid(0.4),
  divider: borderSolid(0.16),
  input: borderSolid(0.2),
  inputActive: borderSolid(0.28),
  button: borderSolid(0.28, "1.5px"),
  headerButton: borderSolid(0.18),
  headerButtonActive: borderSolid(0.32),
  panel: borderSolid(0.26, "1.5px"),
  search: borderSolid(0.2),
  sheetButton: borderSolid(0.28, "1.5px"),
} as const;

export const semanticSurfaces = {
  transparent: "transparent",
  raised: semanticColors.surface.raised,
  sheetDock: semanticColors.surface.sheetDock,
  sheetBody: semanticColors.surface.sheetBody,
  input: alphaWhite(0.1),
  inputSubtle: alphaWhite(0.08),
  button: alphaWhite(0.12),
  buttonActive: alphaWhite(0.16),
  /** Opaque tap fills — for overlays on scrolling/variable content (strip cells, beam hold). */
  buttonSolid: "#32323e",
  buttonActiveSolid: "#3a3a48",
  headerButton: alphaWhite(0.08),
  headerButtonActive: alphaWhite(0.14),
  headerButtonSolid: "#1a1a24",
  headerButtonActiveSolid: "#262632",
  cardHeader: alphaWhite(0.035),
  search: alphaWhite(0.1),
  sheetPanel: alphaWhite(0.06),
  loadSheetPanel: "rgba(13, 13, 28, 0.52)",
  loadSheetRow: "rgba(13, 13, 28, 0.58)",
  sheetPanelSolid: "rgba(13, 13, 28, 0.94)",
  outsideDimLight: "rgba(5, 5, 16, 0.32)",
  outsideDimMedium: "rgba(5, 5, 16, 0.48)",
  overlayHint: "rgba(5, 5, 16, 0.68)",
  headerSub: primitiveInk[800],
  actionIdle: alphaWhite(0.08),
  actionActive: alphaWhite(0.14),
  longPressTrack: alphaWhite(0.12),
  longPressFill: alphaWhite(0.06),
  longPressFillActive: alphaWhite(0.14),
  /** Neutral gray long-press actions — distinct from tap overlay and bluish raised cards. */
  longPressAction: "#2e2e34",
  longPressActionActive: "#3a3a42",
  dropdownActive: alphaWhite(0.1),
  bucketFillEmpty: alphaWhite(0.04),
  batchesCard: alphaWhite(0.05),
  emptyCard: alphaWhite(0.03),
  extraBatch: extraBatchDark.bodyBg,
  tooltipLine: alphaWhite(0.28),
} as const;

export type SemanticColorRole = keyof typeof semanticColors.text;
export type SemanticBorderRole = keyof typeof semanticBorders;
export type SemanticSurfaceRole = keyof typeof semanticSurfaces;
