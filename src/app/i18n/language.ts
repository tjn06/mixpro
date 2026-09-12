/** App UI locales — extend when more languages ship. */
export type AppLanguage = "sv" | "en";

export const APP_LANGUAGES: readonly AppLanguage[] = ["sv", "en"] as const;

/** Default UI language (Phase 0+). Share/report language stays separate. */
export const DEFAULT_UI_LANGUAGE: AppLanguage = "sv";

/**
 * @deprecated Prefer settings `uiLanguage` or `i18n.language`.
 * Kept as default for non-React helpers until callers pass language explicitly.
 */
export const APP_LANGUAGE: AppLanguage = DEFAULT_UI_LANGUAGE;

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === "sv" || value === "en";
}

export function normalizeAppLanguage(
  value: unknown,
  fallback: AppLanguage = DEFAULT_UI_LANGUAGE,
): AppLanguage {
  return isAppLanguage(value) ? value : fallback;
}
