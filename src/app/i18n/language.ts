/** App UI locales — extend when more languages ship. */
export type AppLanguage = "sv" | "en";

/**
 * Active UI language. Swedish copy is authored in phrase tables;
 * switch to `"sv"` when the app locale toggle ships.
 */
export const APP_LANGUAGE: AppLanguage = "en";
