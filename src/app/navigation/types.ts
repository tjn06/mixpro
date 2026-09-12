/**
 * Top-level app destinations (hamburger menu).
 * `settings` opens an overlay sheet — it is not a navigable screen.
 * Labels come from i18n `nav.*` keys (same id).
 */
export type AppDestination =
  | "calculator"
  | "sessions"
  | "recipes"
  | "tools"
  | "consumables"
  | "settings";

export const APP_DESTINATIONS: {
  id: AppDestination;
}[] = [
  { id: "calculator" },
  { id: "sessions" },
  { id: "recipes" },
  { id: "tools" },
  { id: "consumables" },
  { id: "settings" },
];
