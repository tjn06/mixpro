export { themeColors, type ThemeColorKey } from "./colors";
export { themeBorders } from "./borders";
export { themeSurfaces } from "./surfaces";
export { themeChrome } from "./chrome";
export { semanticColors, semanticBorders, semanticSurfaces } from "./semantic";
export type {
  SemanticColorRole,
  SemanticBorderRole,
  SemanticSurfaceRole,
} from "./semantic";
export { componentTokens } from "./components";
export { cv, componentCssVarNames, getComponentCssEntries, getExtendedSemanticCssEntries } from "./componentCssVars";
export {
  themeColorCssVars,
  semanticCssVars,
  themeColorVar,
  getThemeColorCssEntries,
  getSemanticCssEntries,
} from "./cssVars";
export { applyWebThemeColors } from "./applyWebTheme";
export { applyThemeAppearance } from "./applyThemeAppearance";
export { applyContrastMode } from "./applyContrastMode";
export {
  type ColorScheme,
  type ContrastLevel,
  type ThemeAppearance,
  THEME_SCHEME_ATTR,
  CONTRAST_MODE_ATTR,
  CONTRAST_MODE_HIGH,
  SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_VERSION,
  DEFAULT_APPEARANCE,
  isHighContrast,
  resolveThemeCssEntries,
  readPersistedAppearance,
  readPersistedHighContrast,
  migratePersistedSettings,
} from "./appearance";
export { getHighContrastCssEntries } from "./highContrast";
export { getFullLightThemeEntries } from "./lightTheme";
export { getLightHighContrastCssEntries } from "./lightHighContrast";
export {
  lightDefaultPalette,
  darkHighContrastPalette,
  lightHighContrastPalette,
} from "./themePalettes";
export { buildThemeCssEntries, buildLegacyColorMap } from "./themePaletteBuilder";
export type { ThemePalette } from "./themePaletteTypes";
export { mixerCssVarNames, mixerVar, getDarkMixerChromeEntries, getLightMixerChromeEntries } from "./mixerCssVars";

import { themeColors } from "./colors";
import { themeBorders } from "./borders";
import { themeSurfaces } from "./surfaces";
import { themeChrome } from "./chrome";
import { semanticColors, semanticBorders, semanticSurfaces } from "./semantic";
import { componentTokens } from "./components";

/**
 * Shared design tokens — source of truth for web + React Native.
 * CSS vars (--ui-*, --semantic-*) mirror tokens on web via applyWebThemeColors().
 * Responsive sizing stays in app-layout.css.
 *
 * App UI code: import { componentTokens } from "./ui/tokens" — not theme.colors/borders/surfaces.
 */
export const theme = {
  colors: themeColors,
  borders: themeBorders,
  surfaces: themeSurfaces,
  chrome: themeChrome,
  semantic: {
    colors: semanticColors,
    borders: semanticBorders,
    surfaces: semanticSurfaces,
  },
  components: componentTokens,
} as const;
