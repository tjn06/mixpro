import { useEffect, useState } from "react";
import { useThemeAppearanceSync } from "./useThemeAppearanceSync";

/** @deprecated Use useThemeAppearanceSync() */
export function useContrastModeSync(): boolean {
  const { contrast } = useThemeAppearanceSync();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated ? contrast === "high" : false;
}
