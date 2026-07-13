import type { BlendingRecipe } from "../../domain/recipe/types";
import type { BucketSelection } from "../../domain/bucket/types";
import { maxMixLitersForBucket } from "../../domain/bucket/types";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import type { BatchNameInput, RecipePart } from "../types";

/** Map live mixer state → pure batch-name input. */
export function batchNameInputFromMixer(params: {
  recipeName: string;
  recipe: BlendingRecipe;
  totalGrams: number;
  recommendedTotalGrams: number;
  bucketSelection: BucketSelection;
  mixVolumeLiters: number;
  id?: string;
  createdAt?: Date | string;
}): BatchNameInput {
  const parts = recipePartsFromBlendingRecipe(params.recipe);
  let estimatedFillRatio: number | undefined;

  if (params.bucketSelection !== "none") {
    const cap = maxMixLitersForBucket(params.bucketSelection);
    if (cap > 0) {
      estimatedFillRatio = Math.min(1, params.mixVolumeLiters / cap);
    }
  }

  return {
    id: params.id,
    recipeName: params.recipeName,
    targetWeightKg: params.totalGrams / 1000,
    recommendedWeightKg: params.recommendedTotalGrams / 1000,
    bucketSizeLiters:
      params.bucketSelection === "none" ? undefined : params.bucketSelection,
    estimatedFillRatio,
    parts,
    createdAt: params.createdAt ?? new Date(),
  };
}

/** Map a saved snapshot → batch-name input (rename / reload). */
export function batchNameInputFromSavedMix(
  mix: SavedMixSnapshot,
  options?: {
    recommendedTotalGrams?: number;
    mixVolumeLiters?: number;
  },
): BatchNameInput {
  const totalGrams = mix.values.total;
  let estimatedFillRatio: number | undefined;

  if (mix.bucketSelection !== "none" && options?.mixVolumeLiters != null) {
    const cap = maxMixLitersForBucket(mix.bucketSelection);
    if (cap > 0) {
      estimatedFillRatio = Math.min(1, options.mixVolumeLiters / cap);
    }
  }

  return {
    id: mix.id,
    recipeName: mix.recipeName,
    targetWeightKg: totalGrams / 1000,
    recommendedWeightKg: options?.recommendedTotalGrams
      ? options.recommendedTotalGrams / 1000
      : undefined,
    bucketSizeLiters:
      mix.bucketSelection === "none" ? undefined : mix.bucketSelection,
    estimatedFillRatio,
    createdAt: mix.savedAt,
  };
}

function recipePartsFromBlendingRecipe(recipe: BlendingRecipe): RecipePart[] {
  const parts: RecipePart[] = [];

  for (const part of recipe.binderParts) {
    parts.push({
      name: part.label?.trim() || part.id,
      ratio: part.parts,
    });
  }

  for (const pct of recipe.binderPercents) {
    parts.push({
      name: pct.label?.trim() || pct.id,
      ratio: pct.percent,
    });
  }

  return parts;
}
