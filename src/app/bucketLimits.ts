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

  let lo = 0;
  let hi = values[0];
  let best = applyRecipeChange(recipe, "TOTAL", 0);

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = applyRecipeChange(recipe, "TOTAL", mid);
    if (mixLitersFromValues(candidate, sandType) <= maxLiters + 1e-9) {
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

  const maxLiters = maxMixLitersForBucket(bucket as BucketSize);
  const nextLiters = mixLitersFromValues(next, sandType);
  if (nextLiters <= maxLiters) return next;

  const curLiters = mixLitersFromValues(current, sandType);
  if (nextLiters > curLiters) {
    return clampMixValuesToBucketMax(next, recipe, bucket, sandType);
  }

  return clampMixValuesToBucketMax(next, recipe, bucket, sandType);
}
