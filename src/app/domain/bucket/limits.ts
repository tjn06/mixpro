import { assessBucketFill } from "./assess";
import { resolveSafeFillProfile, safeFillLimitLiters } from "./fillSafety";
import {
  maxMixLitersForBucket,
  type BucketSelection,
  type BucketSize,
} from "./types";
import {
  estimateMaterialVolumeForRecipe,
  estimateMixVolumeForRecipe,
  type SandType,
} from "../mix/volume";
import {
  applyRecipeChange,
  initialMixValues,
  recipeBinderSum,
} from "../recipe/calc";
import type { BlendingRecipe } from "../recipe/types";

export function mixLitersFromValues(
  values: number[],
  sandType: SandType,
  recipe: BlendingRecipe,
): number {
  return estimateMixVolumeForRecipe(recipe, values, sandType).estimatedLiters;
}

/** Composition-aware SafeFill liters for the current mix + bucket. */
export function safeFillLitersForRecipeMix(
  recipe: BlendingRecipe,
  values: number[],
  bucket: BucketSize,
  sandType: SandType,
): number {
  const estimate = estimateMaterialVolumeForRecipe(recipe, values, sandType);
  const { fraction } = resolveSafeFillProfile(estimate);
  return safeFillLimitLiters(bucket, fraction);
}

/** Scale mix down to the SafeFill bucket cap when over limit. */
export function clampMixValuesToBucketMax(
  values: number[],
  recipe: BlendingRecipe,
  bucket: BucketSelection,
  sandType: SandType,
): number[] {
  if (bucket === "none") return values;

  const maxLiters = safeFillLitersForRecipeMix(
    recipe,
    values,
    bucket as BucketSize,
    sandType,
  );
  const liters = mixLitersFromValues(values, sandType, recipe);
  if (liters <= maxLiters || liters <= 0 || values[0] <= 0) return values;

  let lo = 0;
  let hi = values[0];
  let best = applyRecipeChange(recipe, "TOTAL", 0);

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = applyRecipeChange(recipe, "TOTAL", mid);
    const candMax = safeFillLitersForRecipeMix(
      recipe,
      candidate,
      bucket as BucketSize,
      sandType,
    );
    if (mixLitersFromValues(candidate, sandType, recipe) <= candMax + 1e-9) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

/** Block increases past the bucket cap; allow decreases freely. */
export function enforceBucketLimitOnChange(
  next: number[],
  current: number[],
  recipe: BlendingRecipe,
  bucket: BucketSelection,
  sandType: SandType,
): number[] {
  if (bucket === "none") return next;

  const nextMax = safeFillLitersForRecipeMix(
    recipe,
    next,
    bucket as BucketSize,
    sandType,
  );
  const nextLiters = mixLitersFromValues(next, sandType, recipe);
  if (nextLiters <= nextMax) return next;

  const curLiters = mixLitersFromValues(current, sandType, recipe);
  if (nextLiters > curLiters) {
    return clampMixValuesToBucketMax(next, recipe, bucket, sandType);
  }

  return clampMixValuesToBucketMax(next, recipe, bucket, sandType);
}

/** Whether halving (÷2) is allowed — total mix weight must be above zero. */
export function canHalveMix(values: number[]): boolean {
  return values[0] > 0;
}

/** Whether doubling (×2) would reach the full scaled total without bucket clamping. */
export function canDoubleMix(
  values: number[],
  recipe: BlendingRecipe,
  bucket: BucketSelection,
  sandType: SandType,
): boolean {
  const total = values[0];
  if (total <= 0) return false;

  const idealTotal = Math.round(total * 2);
  if (idealTotal <= total) return false;

  const next = enforceBucketLimitOnChange(
    applyRecipeChange(recipe, "TOTAL", idealTotal),
    values,
    recipe,
    bucket,
    sandType,
  );
  return next[0] >= idealTotal;
}

/** Recommended mix for a recipe, scaled to fit the selected bucket SafeFill cap. */
export function recommendedBatchForBucket(
  recipe: BlendingRecipe,
  binderSum: number,
  bucket: BucketSelection,
  sandType: SandType,
): { totalGrams: number; fillLiters: number } {
  const baseValues = initialMixValues(
    recipe,
    recipeBinderSum(recipe, binderSum),
  );
  const values = clampMixValuesToBucketMax(
    baseValues,
    recipe,
    bucket,
    sandType,
  );
  return {
    totalGrams: values[0] ?? 0,
    fillLiters: mixLitersFromValues(values, sandType, recipe),
  };
}

/** Full fill assessment for MixBucket / RecBatch UI. */
export function assessBucketFillForRecipe(
  recipe: BlendingRecipe,
  values: number[],
  bucketSelection: BucketSelection,
  sandType: SandType,
) {
  const estimate = estimateMaterialVolumeForRecipe(recipe, values, sandType);
  return assessBucketFill({ estimate, bucketSelection });
}

/** Fallback when only liters are known (legacy paths). */
export function legacyMaxMixLiters(size: BucketSize): number {
  return maxMixLitersForBucket(size);
}
