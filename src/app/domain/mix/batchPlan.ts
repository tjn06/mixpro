/**
 * Partition a required recipe mix into practical SafeFill batches.
 *
 * Reuses MaterialVolumeModel + FillSafety — no Repair-specific physics.
 * Suitable for Repair Hole and later Calculator reuse.
 */

import { assessBucketFill } from "../bucket/assess";
import type { BucketFillAssessment } from "../bucket/assess";
import {
  resolveSafeFillProfile,
  safeFillLimitLiters,
} from "../bucket/fillSafety";
import { recommendedBatchForBucket } from "../bucket/limits";
import type { BucketSize } from "../bucket/types";
import { estimateMaterialVolumeFromMix } from "../material-volume/adapter";
import type { SandType } from "./volume";
import { applyRecipeChange, recipeBinderSum } from "../recipe/calc";
import type { BlendingRecipe } from "../recipe/types";

export type RecipeBatchPlanFailureReason =
  | "NO_BUCKET"
  | "INVALID_REQUIREMENT"
  | "ZERO_SAFE_BATCH"
  | "TOO_MANY_BATCHES";

export type PlannedRecipeBatch = {
  index: number;
  /** 1-based display index. */
  batchNumber: number;
  batchCount: number;
  /** Mix vector TOTAL,A,B,C,THICKENER,FILLER (grams). */
  values: number[];
  assessment: BucketFillAssessment;
};

export type RecipeBatchPlanResult =
  | {
      ok: true;
      recipeId: string;
      bucket: BucketSize;
      /** Max TOTAL grams that fits SafeFill for this composition. */
      maxSafeTotalGrams: number;
      /** Per-batch size used for partitioning (SafeFill max or Rec. batch). */
      batchSizeGrams: number;
      /** True when batches were sized to the recipe Rec. batch. */
      usedRecBatch: boolean;
      requiredTotalGrams: number;
      batches: PlannedRecipeBatch[];
    }
  | {
      ok: false;
      reason: RecipeBatchPlanFailureReason;
    };

const MAX_BATCHES = 80;

/**
 * Largest TOTAL (grams) whose expected rest volume stays within SafeFill
 * for the given recipe composition and bucket.
 */
export function maxSafeTotalGramsForRecipe(input: {
  recipe: BlendingRecipe;
  bucket: BucketSize;
  /** Seed mix for ratio / composition (any positive scale). */
  seedValues: number[];
  sandType?: SandType;
}): number {
  const { recipe, bucket, seedValues, sandType = "medium" } = input;
  const seedTotal = seedValues[0] ?? 0;
  if (!(seedTotal > 0)) return 0;

  const seedEst = estimateMaterialVolumeFromMix({
    recipe,
    values: seedValues,
    sandType,
  });
  const { fraction } = resolveSafeFillProfile(seedEst);
  const safeLimitL = safeFillLimitLiters(bucket, fraction);
  if (!(safeLimitL > 0)) return 0;

  // If seed already fits, grow upper bracket; else shrink.
  let hi = seedTotal;
  let hiValues = seedValues;
  let hiEst = seedEst;

  if (hiEst.expectedRestVolumeL <= safeLimitL + 1e-9) {
    // Expand until over limit or cap.
    let guard = 0;
    while (
      hiEst.expectedRestVolumeL <= safeLimitL + 1e-9 &&
      hi < 2_000_000 &&
      guard < 32
    ) {
      const metric = hiEst.expectedRestVolumeL;
      const grow =
        metric > 0
          ? Math.ceil((safeLimitL / metric) * hi * 1.05)
          : hi * 2;
      const next = Math.min(2_000_000, Math.max(hi + 1, grow));
      if (next <= hi) break;
      hi = next;
      hiValues = applyRecipeChange(recipe, "TOTAL", hi);
      hiEst = estimateMaterialVolumeFromMix({
        recipe,
        values: hiValues,
        sandType,
      });
      guard += 1;
    }
  }

  // Binary search largest total with expectedRest <= safeLimit.
  let lo = 0;
  let best = 0;
  let upper = hi;
  // Ensure upper is at least seed if seed fits.
  if (seedEst.expectedRestVolumeL <= safeLimitL + 1e-9) {
    best = seedTotal;
  }

  let iterations = 0;
  while (lo <= upper && iterations < 48) {
    iterations += 1;
    const mid = Math.floor((lo + upper) / 2);
    if (mid <= 0) {
      lo = mid + 1;
      continue;
    }
    const values = applyRecipeChange(recipe, "TOTAL", mid);
    const est = estimateMaterialVolumeFromMix({ recipe, values, sandType });
    if (est.expectedRestVolumeL <= safeLimitL + 1e-9) {
      best = mid;
      lo = mid + 1;
    } else {
      upper = mid - 1;
    }
  }

  return best;
}

function splitTotals(requiredTotal: number, batchCount: number): number[] {
  const n = Math.max(1, batchCount);
  const base = Math.floor(requiredTotal / n);
  const rem = requiredTotal - base * n;
  const parts: number[] = [];
  for (let i = 0; i < n; i++) {
    // Front-load remainder grams so early batches are slightly larger.
    parts.push(base + (i < rem ? 1 : 0));
  }
  return parts.filter((g) => g > 0);
}

/**
 * Plan N mixing batches so each stays within the bucket SafeFill for this recipe.
 * Default: maximize each batch to SafeFill.
 * preferRecBatch: size batches to the recipe Rec. batch (still capped by SafeFill).
 */
export function planRecipeBatches(input: {
  recipe: BlendingRecipe;
  requiredValues: number[];
  bucket: BucketSize;
  sandType?: SandType;
  preferRecBatch?: boolean;
}): RecipeBatchPlanResult {
  const {
    recipe,
    requiredValues,
    bucket,
    sandType = "medium",
    preferRecBatch = false,
  } = input;
  const requiredTotalGrams = Math.max(0, Math.round(requiredValues[0] ?? 0));
  if (!(requiredTotalGrams > 0)) {
    return { ok: false, reason: "INVALID_REQUIREMENT" };
  }

  const maxSafeTotalGrams = maxSafeTotalGramsForRecipe({
    recipe,
    bucket,
    seedValues: requiredValues,
    sandType,
  });

  if (!(maxSafeTotalGrams > 0)) {
    return { ok: false, reason: "ZERO_SAFE_BATCH" };
  }

  let batchSizeGrams = maxSafeTotalGrams;
  let usedRecBatch = false;
  if (preferRecBatch) {
    const rec = recommendedBatchForBucket(
      recipe,
      recipeBinderSum(recipe),
      bucket,
      sandType,
    );
    if (rec.totalGrams > 0) {
      batchSizeGrams = Math.min(Math.round(rec.totalGrams), maxSafeTotalGrams);
      usedRecBatch = true;
    }
  }

  if (!(batchSizeGrams > 0)) {
    return { ok: false, reason: "ZERO_SAFE_BATCH" };
  }

  const batchCount = Math.ceil(requiredTotalGrams / batchSizeGrams);
  if (batchCount > MAX_BATCHES) {
    return { ok: false, reason: "TOO_MANY_BATCHES" };
  }

  const totals = splitTotals(requiredTotalGrams, batchCount);
  const batches: PlannedRecipeBatch[] = totals.map((totalG, index) => {
    const values = applyRecipeChange(recipe, "TOTAL", totalG);
    const estimate = estimateMaterialVolumeFromMix({
      recipe,
      values,
      sandType,
    });
    const assessment = assessBucketFill({
      estimate,
      bucketSelection: bucket,
    });
    return {
      index,
      batchNumber: index + 1,
      batchCount: totals.length,
      values,
      assessment,
    };
  });

  return {
    ok: true,
    recipeId: recipe.id,
    bucket,
    maxSafeTotalGrams,
    batchSizeGrams,
    usedRecBatch,
    requiredTotalGrams,
    batches,
  };
}
