import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_UI_LANGUAGE,
  normalizeAppLanguage,
  type AppLanguage,
} from "../i18n/language";
import { setUiLanguage } from "../i18n";
import type { ColorScheme, ContrastLevel, ThemeAppearance } from "../../theme/appearance";
import { applyThemeAppearance } from "../../theme/applyThemeAppearance";
import {
  DEFAULT_APPEARANCE,
  migratePersistedSettings,
  SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_VERSION,
} from "../../theme/appearance";

interface SettingsState extends ThemeAppearance {
  /** App chrome language — independent of share/report language. */
  uiLanguage: AppLanguage;
  setColorScheme: (scheme: ColorScheme) => void;
  setContrast: (contrast: ContrastLevel) => void;
  setAppearance: (appearance: ThemeAppearance) => void;
  setUiLanguage: (language: AppLanguage) => void;
  toggleHighContrast: () => void;
}

function applyUiLanguage(language: AppLanguage) {
  setUiLanguage(normalizeAppLanguage(language));
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_APPEARANCE,
      uiLanguage: DEFAULT_UI_LANGUAGE,
      setColorScheme: (colorScheme) => {
        set({ colorScheme });
        if (typeof document !== "undefined") {
          applyThemeAppearance(document.documentElement, {
            colorScheme,
            contrast: get().contrast,
          });
        }
      },
      setContrast: (contrast) => {
        set({ contrast });
        if (typeof document !== "undefined") {
          applyThemeAppearance(document.documentElement, {
            colorScheme: get().colorScheme,
            contrast,
          });
        }
      },
      setAppearance: (appearance) => {
        set(appearance);
        if (typeof document !== "undefined") {
          applyThemeAppearance(document.documentElement, appearance);
        }
      },
      setUiLanguage: (uiLanguage) => {
        const next = normalizeAppLanguage(uiLanguage);
        set({ uiLanguage: next });
        applyUiLanguage(next);
      },
      toggleHighContrast: () =>
        set((state) => {
          const contrast = state.contrast === "high" ? "default" : "high";
          if (typeof document !== "undefined") {
            applyThemeAppearance(document.documentElement, {
              colorScheme: state.colorScheme,
              contrast,
            });
          }
          return { contrast };
        }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_STORAGE_VERSION,
      partialize: (state) => ({
        colorScheme: state.colorScheme,
        contrast: state.contrast,
        uiLanguage: state.uiLanguage,
      }),
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...raw,
          uiLanguage: normalizeAppLanguage(
            raw.uiLanguage,
            current.uiLanguage ?? DEFAULT_UI_LANGUAGE,
          ),
        };
      },
      migrate: (persistedState, version) => {
        const appearance = migratePersistedSettings(persistedState, version);
        const raw = (persistedState ?? {}) as { uiLanguage?: unknown };
        return {
          ...appearance,
          uiLanguage: normalizeAppLanguage(
            raw.uiLanguage,
            DEFAULT_UI_LANGUAGE,
          ),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.uiLanguage) applyUiLanguage(state.uiLanguage);
      },
    },
  ),
);
