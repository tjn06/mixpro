/**
 * UI chrome colors — source of truth for web + future React Native.
 * Entity ingredient colors stay in mixEntities.ts (domain data).
 */
export const themeColors = {
  /** App frame / body */
  appBackground: "#07070f",
  shellBackground: "#030308",
  headerBackground: "#0a0a14",

  /** Primary text hierarchy */
  title: "#c0c0e0",
  titleMuted: "#9898b4",
  muted: "#8888a8",
  mutedDim: "#686878",
  mutedDimmer: "#686880",
  value: "#c4c4dc",
  white: "#ffffff",

  /** Secondary / accent text */
  secondary: "#a0a0c0",
  secondaryMuted: "#a8a8c4",
  actionPrimaryLabel: "#8888a8",
  actionSecondaryLabel: "#707090",
  actionCompactLabel: "#747494",
  actionDisabledLabel: "#404058",
  actionHoldingLabel: "#9090b8",
  headerSubline: "#a8a8c4",

  /** Surfaces (solid) */
  entitySurfaceIdle: "#0d0d1c",
  /** Neutral entity card / connector chrome when not selected */
  entityBorderIdle: "rgba(255,255,255,0.14)",
  swipeSurfaceBase: "#09091a",
  inputSurface: "#10101e",
  holdingSurface: "#10101e",
  dropdownMenuBg: "#3a3a4c",

  /** Card readouts */
  cardValueInactive: "#9a9ab4",
  cardUnitInactive: "#787898",

  /** Recipe block */
  recipeId: "#8888a8",
  recipeIdMuted: "#686878",
  recipeValue: "#c4c4dc",
  recipeValueMuted: "#9898b4",
  recipeUnit: "#707088",
  recipeColon: "#484860",

  /** Bucket / fill */
  fill: "#9090b8",
  fillMuted: "#686880",
  bucketLimit: "#c95868",
  bucketFillFull: "#c95868",
  bucketFillFullMuted: "#8a4558",
  fillOutline: "rgba(255,255,255,0.32)",

  /** Swipe zone */
  swipeArrowIdle: "#585878",
  swipeStepIdle: "#424260",

  /** Dropdown menus */
  dropdownMenuText: "#b8b8d0",
  dropdownMenuTextMuted: "#686878",
  dropdownMenuLockedLabel: "#787898",

  /** Semantic accents */
  extraBatchAccent: "#9b8cff",
  progress: "#9090b8",
} as const;

export type ThemeColorKey = keyof typeof themeColors;
