import type { SavedMixSnapshot } from "./types";

/** Display name for the built-in admin/base mix config (no user save loaded). */
export const BASE_CONFIG_DISPLAY_NAME = "ADMIN CONFIG";

/** Custom label when set; otherwise the saved recipe name. */
export function savedMixDisplayName(mix: SavedMixSnapshot): string {
  const meta = mix.metaName?.trim();
  return meta || mix.recipeName;
}

/** Store metaName only when it differs from the recipe name. */
export function resolveSavedMixMetaName(
  input: string | undefined,
  recipeName: string,
): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed || trimmed === recipeName) return undefined;
  return trimmed;
}
