import { getThemeColorCssEntries } from "./cssVars";
import { themeBorders } from "./borders";

/** Inject theme color tokens as CSS variables (web rendering layer). */
export function applyWebThemeColors(root: HTMLElement = document.documentElement): void {
  for (const [cssVar, value] of getThemeColorCssEntries()) {
    root.style.setProperty(cssVar, value);
  }
  root.style.setProperty("--ui-border-header", themeBorders.header);
  root.style.setProperty("--ui-border-header-sub", themeBorders.headerSub);
}
