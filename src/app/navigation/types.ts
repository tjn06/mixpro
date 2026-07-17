/** Top-level app destinations (hamburger menu). */
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
