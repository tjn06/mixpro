import { applyThemeAppearance } from "./applyThemeAppearance";
import type { ThemeAppearance } from "./appearance";

/** @deprecated Use applyThemeAppearance(root, appearance) */
export function applyContrastMode(
  root: HTMLElement = document.documentElement,
  highContrast: boolean,
): void {
  const appearance: ThemeAppearance = {
    colorScheme: root.getAttribute("data-theme") === "light" ? "light" : "dark",
    contrast: highContrast ? "high" : "default",
  };
  applyThemeAppearance(root, appearance);
}
