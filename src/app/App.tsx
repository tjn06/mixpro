import React from "react";
import { BatchMixer } from "./BatchMixer";
import { DEFAULT_RECIPE } from "./recipeTypes";

export type { BlendingRecipe, PartRatio, PercentOfBinder } from "./recipeTypes";
export { DEFAULT_RECIPE } from "./recipeTypes";
export { BatchMixer } from "./BatchMixer";

export default function App() {
  return <BatchMixer recipe={DEFAULT_RECIPE} />;
}
