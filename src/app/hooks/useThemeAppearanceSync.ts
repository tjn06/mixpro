import { useEffect } from "react";
import { applyThemeAppearance } from "../../theme/applyThemeAppearance";
import type { ThemeAppearance } from "../../theme/appearance";
import { useSettingsStore } from "../settings/store";

/** Keeps data-theme / data-contrast + CSS vars in sync with the settings store. */
export function useThemeAppearanceSync(): ThemeAppearance {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const contrast = useSettingsStore((s) => s.contrast);
  const appearance: ThemeAppearance = { colorScheme, contrast };

  useEffect(() => {
    if (useSettingsStore.persist.hasHydrated()) return;
    return useSettingsStore.persist.onFinishHydration(() => {
      const state = useSettingsStore.getState();
      applyThemeAppearance(document.documentElement, {
        colorScheme: state.colorScheme,
        contrast: state.contrast,
      });
    });
  }, []);

  useEffect(() => {
    // Avoid flashing DEFAULT_APPEARANCE (light) before persist rehydrates.
    if (!useSettingsStore.persist.hasHydrated()) return;
    applyThemeAppearance(document.documentElement, appearance);
  }, [colorScheme, contrast]);

  return appearance;
}
