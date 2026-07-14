/** Short placeholder copy for recipe picker cards — truncated in UI. */
export const RECIPE_PLACEHOLDER_DESCRIPTIONS: Record<string, string> = {
  default: "General epoxy with sand filler for everyday repairs.",
  "standard-blot": "Standard mix tuned for wetter, blöt applications.",
  "fas-sockel": "Facade and sockel blend with sand and thickener.",
  primer: "Thin primer coat — binder only, no fillers.",
  lack: "Topcoat finish — binder only, no fillers.",
  tixblandning: "Small batch with thickener for tixotropic mixes.",
};

export function recipePlaceholderDescription(recipeId: string): string {
  if (recipeId.startsWith("picker-demo-")) {
    return "Scroll demo row — preview only.";
  }
  return (
    RECIPE_PLACEHOLDER_DESCRIPTIONS[recipeId] ??
    "Locked-ratio epoxy recipe preset for this mixer."
  );
}
