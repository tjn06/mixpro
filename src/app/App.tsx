import React from "react";
import { BatchMixer } from "./BatchMixer";
import { DEFAULT_RECIPE } from "./domain/recipe/types";

export type { BlendingRecipe, PartRatio, PercentOfBinder } from "./domain/recipe/types";
export { DEFAULT_RECIPE, PRESET_RECIPES } from "./domain/recipe/types";
export { BatchMixer } from "./BatchMixer";

export default function App() {
  return <BatchMixer recipe={DEFAULT_RECIPE} />;
}
