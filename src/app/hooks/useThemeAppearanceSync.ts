import { useEffect, useState } from "react";
import { applyThemeAppearance } from "../../theme/applyThemeAppearance";
import type { ThemeAppearance } from "../../theme/appearance";
import { useSettingsStore } from "../settings/store";

/** Keeps data-theme / data-contrast + CSS vars in sync with the settings store. */
export function useThemeAppearanceSync(): ThemeAppearance {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const contrast = useSettingsStore((s) => s.contrast);
  const [hydrated, setHydrated] = useState(
    () => useSettingsStore.persist.hasHydrated(),
  );

  const appearance: ThemeAppearance = { colorScheme, contrast };

  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => {
      setHydrated(true);
      const state = useSettingsStore.getState();
      applyThemeAppearance(document.documentElement, {
        colorScheme: state.colorScheme,
        contrast: state.contrast,
      });
    });
    if (useSettingsStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyThemeAppearance(document.documentElement, appearance);
  }, [colorScheme, contrast, hydrated]);

  return appearance;
}
