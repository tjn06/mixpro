import {
  CONTRAST_MODE_ATTR,
  CONTRAST_MODE_HIGH,
  resolveThemeCssEntries,
  THEME_SCHEME_ATTR,
  type ThemeAppearance,
} from "./appearance";

/** Apply scheme + contrast to :root via data attributes and CSS custom properties. */
export function applyThemeAppearance(
  root: HTMLElement = document.documentElement,
  appearance: ThemeAppearance,
): void {
  root.setAttribute(THEME_SCHEME_ATTR, appearance.colorScheme);

  if (appearance.contrast === "high") {
    root.setAttribute(CONTRAST_MODE_ATTR, CONTRAST_MODE_HIGH);
  } else {
    root.removeAttribute(CONTRAST_MODE_ATTR);
  }

  for (const [cssVar, value] of resolveThemeCssEntries(appearance)) {
    root.style.setProperty(cssVar, value);
  }
}
