import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ColorScheme, ContrastLevel, ThemeAppearance } from "../../theme/appearance";
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
    (set) => ({
      ...DEFAULT_APPEARANCE,
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setContrast: (contrast) => set({ contrast }),
      setAppearance: (appearance) => set(appearance),
      toggleHighContrast: () =>
        set((state) => ({
          contrast: state.contrast === "high" ? "default" : "high",
        })),
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
