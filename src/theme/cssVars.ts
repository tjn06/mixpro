import type { ThemeColorKey } from "./colors";
import { themeColors } from "./colors";
import { semanticBorders, semanticColors, semanticSurfaces } from "./semantic";

/** Maps theme color keys → CSS custom property names on :root / .app-frame. */
export const themeColorCssVars: Record<ThemeColorKey, string> = {
  appBackground: "--ui-app-bg",
  shellBackground: "--ui-shell-bg",
  headerBackground: "--ui-header-bg",
  title: "--ui-title",
  titleMuted: "--ui-title-muted",
  muted: "--ui-muted",
  mutedDim: "--ui-muted-dim",
  mutedDimmer: "--ui-muted-dimmer",
  value: "--ui-value",
  white: "--ui-white",
  secondary: "--ui-secondary",
  secondaryMuted: "--ui-secondary-muted",
  actionPrimaryLabel: "--ui-action-primary-label",
  actionSecondaryLabel: "--ui-action-secondary-label",
  actionCompactLabel: "--ui-action-compact-label",
  actionDisabledLabel: "--ui-action-disabled-label",
  actionHoldingLabel: "--ui-action-holding-label",
  headerSubline: "--ui-header-subline",
  entitySurfaceIdle: "--ui-entity-surface-idle",
  entityBorderIdle: "--ui-entity-border-idle",
  swipeSurfaceBase: "--ui-swipe-surface-base",
  inputSurface: "--ui-input-surface",
  holdingSurface: "--ui-holding-surface",
  dropdownMenuBg: "--ui-dropdown-menu-bg",
  cardValueInactive: "--ui-card-value-inactive",
  cardUnitInactive: "--ui-card-unit-inactive",
  recipeId: "--ui-recipe-id",
  recipeIdMuted: "--ui-recipe-id-muted",
  recipeValue: "--ui-recipe-value",
  recipeValueMuted: "--ui-recipe-value-muted",
  recipeUnit: "--ui-recipe-unit",
  recipeColon: "--ui-recipe-colon",
  fill: "--ui-fill",
  fillMuted: "--ui-fill-muted",
  bucketLimit: "--ui-bucket-limit",
  bucketFillFull: "--ui-bucket-fill-full",
  bucketFillFullMuted: "--ui-bucket-fill-full-muted",
  fillOutline: "--ui-fill-outline",
  fillEmpty: "--ui-fill-empty",
  swipeArrowIdle: "--ui-swipe-arrow-idle",
  swipeStepIdle: "--ui-swipe-step-idle",
  dropdownMenuText: "--ui-dropdown-menu-text",
  dropdownMenuTextMuted: "--ui-dropdown-menu-text-muted",
  dropdownMenuLockedLabel: "--ui-dropdown-menu-locked-label",
  extraBatchAccent: "--ui-extra-batch-accent",
  progress: "--ui-progress",
};

/** Semantic tokens → CSS custom properties. */
export const semanticCssVars = {
  textPrimary: "--semantic-text-primary",
  textSecondary: "--semantic-text-secondary",
  textMuted: "--semantic-text-muted",
  textDimmed: "--semantic-text-dimmed",
  iconPrimary: "--semantic-icon-primary",
  iconMuted: "--semantic-icon-muted",
  stateWarn: "--semantic-state-warn",
  stateError: "--semantic-state-error",
  borderDefault: "--semantic-border-default",
  borderStrong: "--semantic-border-strong",
  borderSubtle: "--semantic-border-subtle",
  surfaceRaised: "--semantic-surface-raised",
  surfaceButton: "--semantic-surface-button",
  surfaceInput: "--semantic-surface-input",
} as const;

export function themeColorVar(key: ThemeColorKey): string {
  return `var(${themeColorCssVars[key]})`;
}

/** Flat list for applyWebThemeColors. */
export function getThemeColorCssEntries(): [string, string][] {
  return (Object.keys(themeColors) as ThemeColorKey[]).map((key) => [
    themeColorCssVars[key],
    themeColors[key],
  ]);
}

export function getSemanticCssEntries(): [string, string][] {
  return [
    [semanticCssVars.textPrimary, semanticColors.text.primary],
    [semanticCssVars.textSecondary, semanticColors.text.secondary],
    [semanticCssVars.textMuted, semanticColors.text.muted],
    [semanticCssVars.textDimmed, semanticColors.text.dimmed],
    [semanticCssVars.iconPrimary, semanticColors.icon.primary],
    [semanticCssVars.iconMuted, semanticColors.icon.muted],
    [semanticCssVars.stateWarn, semanticColors.state.warn],
    [semanticCssVars.stateError, semanticColors.state.error],
    [semanticCssVars.borderDefault, semanticBorders.default],
    [semanticCssVars.borderStrong, semanticBorders.strong],
    [semanticCssVars.borderSubtle, semanticBorders.subtle],
    [semanticCssVars.surfaceRaised, semanticSurfaces.raised],
    [semanticCssVars.surfaceButton, semanticSurfaces.button],
    [semanticCssVars.surfaceInput, semanticSurfaces.input],
  ];
}
