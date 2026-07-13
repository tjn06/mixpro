import { alphaWhite } from "./primitives";
import { semanticColors, semanticSurfaces } from "./semantic";

/**
 * Legacy color keys — alias semantic tokens for backward compatibility.
 * Prefer semantic.* or componentTokens.* in new code.
 */
export const themeColors = {
  /** App frame / body */
  appBackground: semanticColors.surface.app,
  shellBackground: semanticColors.surface.shell,
  headerBackground: semanticColors.surface.header,

  /** Primary text hierarchy */
  title: semanticColors.text.primary,
  titleMuted: semanticColors.text.secondary,
  muted: semanticColors.text.muted,
  mutedDim: semanticColors.text.dimmed,
  mutedDimmer: semanticColors.text.dimmed,
  value: semanticColors.text.secondary,
  white: semanticColors.text.inverse,

  /** Secondary / accent text */
  secondary: semanticColors.text.secondary,
  secondaryMuted: semanticColors.text.muted,
  actionPrimaryLabel: semanticColors.text.muted,
  actionSecondaryLabel: semanticColors.icon.muted,
  actionCompactLabel: semanticColors.text.muted,
  actionDisabledLabel: semanticColors.state.disabled,
  actionHoldingLabel: semanticColors.text.secondary,
  headerSubline: semanticColors.text.muted,

  /** Surfaces (solid) */
  entitySurfaceIdle: semanticColors.surface.raised,
  entityBorderIdle: alphaWhite(0.22),
  swipeSurfaceBase: semanticColors.surface.swipe,
  inputSurface: semanticColors.surface.input,
  holdingSurface: semanticColors.surface.input,
  dropdownMenuBg: semanticColors.surface.dropdown,

  /** Card readouts */
  cardValueInactive: semanticColors.text.secondary,
  cardUnitInactive: semanticColors.text.muted,

  /** Recipe block */
  recipeId: semanticColors.text.muted,
  recipeIdMuted: semanticColors.text.dimmed,
  recipeValue: semanticColors.text.secondary,
  recipeValueMuted: semanticColors.text.muted,
  recipeUnit: semanticColors.text.muted,
  recipeColon: semanticColors.text.dimmed,

  /** Bucket / fill */
  fill: semanticColors.text.secondary,
  fillMuted: semanticColors.text.dimmed,
  bucketLimit: semanticColors.state.error,
  bucketFillFull: semanticColors.state.error,
  bucketFillFullMuted: semanticColors.state.errorMuted,
  fillOutline: alphaWhite(0.36),
  fillEmpty: semanticSurfaces.bucketFillEmpty,

  /** Swipe zone */
  swipeArrowIdle: semanticColors.text.muted,
  swipeStepIdle: semanticColors.text.dimmed,

  /** Dropdown menus */
  dropdownMenuText: semanticColors.text.secondary,
  dropdownMenuTextMuted: semanticColors.text.dimmed,
  dropdownMenuLockedLabel: semanticColors.text.muted,

  /** Semantic accents */
  extraBatchAccent: semanticColors.state.accent,
  progress: semanticColors.text.secondary,
} as const;

export type ThemeColorKey = keyof typeof themeColors;
