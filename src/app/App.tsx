import React from "react";
import { AppShell } from "./components/shell/AppShell";

export type { BlendingRecipe, PartRatio, PercentOfBinder } from "./domain/recipe/types";
export { DEFAULT_RECIPE, PRESET_RECIPES } from "./domain/recipe/types";
export { BatchMixer } from "./BatchMixer";

export default function App() {
  return <AppShell />;
}
