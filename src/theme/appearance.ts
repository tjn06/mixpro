import { getFullDefaultThemeEntries } from "./defaultThemeEntries";
import { getHighContrastCssEntries } from "./highContrast";
import { getFullLightThemeEntries } from "./lightTheme";
import { getLightHighContrastCssEntries } from "./lightHighContrast";

export type ColorScheme = "dark" | "light";
export type ContrastLevel = "default" | "high";

export interface ThemeAppearance {
  colorScheme: ColorScheme;
  contrast: ContrastLevel;
}

export const THEME_SCHEME_ATTR = "data-theme";
export const CONTRAST_MODE_ATTR = "data-contrast";
export const CONTRAST_MODE_HIGH = "high";

export const SETTINGS_STORAGE_KEY = "mixpro-settings";
export const SETTINGS_STORAGE_VERSION = 2;

export const DEFAULT_APPEARANCE: ThemeAppearance = {
  colorScheme: "light",
  contrast: "default",
};

export function isHighContrast(appearance: ThemeAppearance): boolean {
  return appearance.contrast === "high";
}

/** Resolve CSS var entries for a scheme + contrast combination. */
export function resolveThemeCssEntries(appearance: ThemeAppearance): [string, string][] {
  const { colorScheme, contrast } = appearance;

  if (colorScheme === "light") {
    if (contrast === "high") {
      return getLightHighContrastCssEntries();
    }
    return getFullLightThemeEntries();
  }

  if (contrast === "high") {
    return getHighContrastCssEntries();
  }

  return getFullDefaultThemeEntries();
}

interface PersistedSettingsV0 {
  highContrast?: boolean;
  colorScheme?: ColorScheme;
  contrast?: ContrastLevel;
}

/** Read persisted appearance before React hydrates (avoids FOUC). */
export function readPersistedAppearance(): ThemeAppearance {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as {
      state?: PersistedSettingsV0;
      version?: number;
    };
    const state = parsed.state;
    if (!state) return DEFAULT_APPEARANCE;

    const version = parsed.version ?? 0;

    if (version >= SETTINGS_STORAGE_VERSION && state.colorScheme && state.contrast) {
      return {
        colorScheme: state.colorScheme,
        contrast: state.contrast,
      };
    }

    return {
      ...DEFAULT_APPEARANCE,
      ...migratePersistedSettings(state, version),
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

/** @deprecated Use readPersistedAppearance().contrast === 'high' */
export function readPersistedHighContrast(): boolean {
  return readPersistedAppearance().contrast === "high";
}

export function migratePersistedSettings(
  persistedState: unknown,
  version: number,
): Pick<ThemeAppearance, "colorScheme" | "contrast"> {
  if (version === 0) {
    const old = persistedState as PersistedSettingsV0;
    if (old.colorScheme && old.contrast) {
      return { colorScheme: old.colorScheme, contrast: old.contrast };
    }
    return {
      colorScheme: "light",
      contrast: old.highContrast ? "high" : "default",
    };
  }
  if (version === 1) {
    const prev = persistedState as ThemeAppearance;
    return {
      colorScheme: "light",
      contrast: prev.contrast ?? "default",
    };
  }
  const current = persistedState as ThemeAppearance;
  return {
    colorScheme: current.colorScheme ?? "light",
    contrast: current.contrast ?? "default",
  };
}
