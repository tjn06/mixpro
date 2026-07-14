/**
 * App-layer design tokens — import from here in src/app, not theme.colors/borders/surfaces.
 * Use `cv` / `themeColorVar()` for colors that must follow light/dark + contrast at runtime.
 * Use `componentTokens` only for layout constants (heights, opacities, transitions).
 */
export { componentTokens } from "../../theme/components";
export { cv } from "../../theme/componentCssVars";
export { themeColorVar } from "../../theme/cssVars";
export { semanticColors, semanticBorders, semanticSurfaces } from "../../theme/semantic";
export { recipeMetaVar } from "../presentation/recipeMetaVars";
