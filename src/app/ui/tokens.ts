/**
 * App-layer design tokens — import from here in src/app, not theme.colors/borders/surfaces.
 * Use `cv` for CSS-var-backed styles; `componentTokens` when a literal color is required (SVG, color-mix).
 */
export { componentTokens } from "../../theme/components";
export { cv } from "../../theme/componentCssVars";
export { semanticColors, semanticBorders, semanticSurfaces } from "../../theme/semantic";
