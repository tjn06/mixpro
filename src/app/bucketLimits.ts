import {
  maxMixLitersForBucket,
  type BucketSelection,
  type BucketSize,
} from "./bucketTypes";
import { estimateMixVolume, type SandType } from "./mixVolume";
import { applyRecipeChange, type BlendingRecipe } from "./recipe";

export function mixLitersFromValues(values: number[], sandType: SandType): number {
  return estimateMixVolume({
    epoxyGrams: values[1] + values[2] + values[3],
    sandGrams: values[4],
    sandType,
  }).estimatedLiters;
}

/** Scale mix down to the 86% bucket cap when over limit. */
export function clampMixValuesToBucketMax(
  values: number[],
  recipe: BlendingRecipe,
  bucket: BucketSelection,
  sandType: SandType,
): number[] {
  if (bucket === "none") return values;

  const maxLiters = maxMixLitersForBucket(bucket as BucketSize);
  const liters = mixLitersFromValues(values, sandType);
  if (liters <= maxLiters || liters <= 0 || values[0] <= 0) return values;

  const scale = maxLiters / liters;
  return applyRecipeChange(recipe, "TOTAL", Math.max(0, Math.round(values[0] * scale)));
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

  const maxLiters = maxMixLitersForBucket(bucket as BucketSize);
  const nextLiters = mixLitersFromValues(next, sandType);
  if (nextLiters <= maxLiters) return next;

  const curLiters = mixLitersFromValues(current, sandType);
  if (nextLiters > curLiters) {
    return clampMixValuesToBucketMax(next, recipe, bucket, sandType);
  }

  return clampMixValuesToBucketMax(next, recipe, bucket, sandType);
}
