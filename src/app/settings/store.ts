import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ColorScheme, ContrastLevel, ThemeAppearance } from "../../theme/appearance";
import { applyThemeAppearance } from "../../theme/applyThemeAppearance";
import {
  DEFAULT_APPEARANCE,
  migratePersistedSettings,
  SETTINGS_STORAGE_KEY,
  SETTINGS_STORAGE_VERSION,
} from "../../theme/appearance";

interface SettingsState extends ThemeAppearance {
  setColorScheme: (scheme: ColorScheme) => void;
  setContrast: (contrast: ContrastLevel) => void;
  setAppearance: (appearance: ThemeAppearance) => void;
  toggleHighContrast: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_APPEARANCE,
      setColorScheme: (colorScheme) => {
        set({ colorScheme });
        if (typeof document !== "undefined") {
          applyThemeAppearance(document.documentElement, { ...get(), colorScheme });
        }
      },
      setContrast: (contrast) => {
        set({ contrast });
        if (typeof document !== "undefined") {
          applyThemeAppearance(document.documentElement, { ...get(), contrast });
        }
      },
      setAppearance: (appearance) => {
        set(appearance);
        if (typeof document !== "undefined") {
          applyThemeAppearance(document.documentElement, appearance);
        }
      },
      toggleHighContrast: () =>
        set((state) => {
          const contrast = state.contrast === "high" ? "default" : "high";
          if (typeof document !== "undefined") {
            applyThemeAppearance(document.documentElement, { colorScheme: state.colorScheme, contrast });
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
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as ThemeAppearance),
      }),
      migrate: (persistedState, version) =>
        migratePersistedSettings(persistedState, version),
    },
  ),
);
