export { themeColors, type ThemeColorKey } from "./colors";
export { themeBorders } from "./borders";
export { themeSurfaces } from "./surfaces";
export { themeChrome } from "./chrome";
export { themeColorCssVars, themeColorVar, getThemeColorCssEntries } from "./cssVars";
export { applyWebThemeColors } from "./applyWebTheme";

import { themeColors } from "./colors";
import { themeBorders } from "./borders";
import { themeSurfaces } from "./surfaces";
import { themeChrome } from "./chrome";

/**
 * Shared design tokens — source of truth for web + React Native.
 * CSS vars (--ui-*) mirror colors on web via applyWebThemeColors().
 * Responsive sizing stays in app-layout.css.
 */
export const theme = {
  colors: themeColors,
  borders: themeBorders,
  surfaces: themeSurfaces,
  chrome: themeChrome,
} as const;
