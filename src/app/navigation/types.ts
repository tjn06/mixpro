/**
 * Top-level app destinations (hamburger menu).
 * `settings` opens an overlay sheet — it is not a navigable screen.
 */
export type AppDestination = "calculator" | "sessions" | "recipes" | "settings";

export const APP_DESTINATIONS: {
  id: AppDestination;
  label: string;
}[] = [
  { id: "calculator", label: "Calculator" },
  { id: "sessions", label: "Sessions" },
  { id: "recipes", label: "Recipes" },
  { id: "settings", label: "Settings" },
];
