import { applyThemeAppearance } from "./applyThemeAppearance";

/** Inject default dark theme CSS variables (web rendering layer). */
export function applyWebThemeColors(root: HTMLElement = document.documentElement): void {
  applyThemeAppearance(root, { colorScheme: "dark", contrast: "default" });
}
