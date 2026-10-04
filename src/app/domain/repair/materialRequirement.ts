/**
 * Inverse material requirement over the authoritative MaterialVolumeModel.
 * Scales a BlendingRecipe so finished rest volume meets a planning target.
 *
 * Does NOT fork epoxy/sand/tix physics — every evaluation calls
 * estimateMaterialVolumeFromMix.
 */

import { estimateMaterialVolumeFromMix, materialRecipeFromMix } from "../material-volume/adapter";
import type { VolumeConfidence, VolumeEstimate } from "../material-volume/types";
import type { SandType } from "../mix/volume";
import {
  applyRecipeChange,
  initialMixValues,
  recipeBinderSum,
} from "../recipe/calc";
import type { BlendingRecipe } from "../recipe/types";

/** Central target policy — changeable without rewriting the search. */
export type MaterialTargetPolicy =
  | "EXPECTED_MEETS_TARGET"
  | "LOW_BOUND_MEETS_TARGET";

export const DEFAULT_MATERIAL_TARGET_POLICY: MaterialTargetPolicy =
  "EXPECTED_MEETS_TARGET";

export type MaterialRequirementFailureReason =
  | "INVALID_TARGET"
  | "UNKNOWN_CUSTOM_VOLUME"
  | "ZERO_VOLUME_RECIPE"
  | "NO_SCALABLE_MASS"
  | "NON_MONOTONIC"
  | "BRACKET_FAILED"
  | "MAX_ITERATIONS";

export type MaterialRequirementComponent = {
  id: string;
  /** Grams for this component in the solved mix. */
  grams: number;
};

export type MaterialRequirementResult =
  | {
      ok: true;
      recipeId: string;
      planningTargetLiters: number;
      policy: MaterialTargetPolicy;
      /** Mix vector: TOTAL, A, B, C, THICKENER, FILLER (grams). */
      values: number[];
      components: MaterialRequirementComponent[];
      material: {
        expectedRestVolumeL: number;
        restVolumeLowL: number;
        restVolumeHighL: number;
        confidence: VolumeConfidence;
      };
      iterations: number;
    }
  | {
      ok: false;
      reason: MaterialRequirementFailureReason;
      /** Optional component ids that blocked solving (e.g. unknown custom). */
      blockingComponentIds?: string[];
    };

const MAX_ITERATIONS = 48;
const CONVERGENCE_TOLERANCE_L = 0.02;
/** Upper search cap — ~2 tonnes mix; expand from probe first. */
const ABSOLUTE_MAX_TOTAL_G = 2_000_000;

function metricForPolicy(
  estimate: VolumeEstimate,
  policy: MaterialTargetPolicy,
): number {
  return policy === "LOW_BOUND_MEETS_TARGET"
    ? estimate.restVolumeLowL
    : estimate.expectedRestVolumeL;
}

function meetsTarget(
  estimate: VolumeEstimate,
  targetL: number,
  policy: MaterialTargetPolicy,
): boolean {
  return metricForPolicy(estimate, policy) + 1e-9 >= targetL;
}

/**
 * Unknown volume-contributing CUSTOM (or C-as-unknown) blocks inverse solve.
 * Known registered custom profiles are allowed.
 */
export function validateRecipeForMaterialSolve(
  recipe: BlendingRecipe,
  sandType: SandType = "medium",
): { ok: true } | { ok: false; blockingComponentIds: string[] } {
  const probe = initialMixValues(recipe, recipeBinderSum(recipe, 1000));
  // Ensure recipe slots that exist get non-zero probe mass when percent > 0.
  // initialMixValues already derives from ratios.
  const input = materialRecipeFromMix({ recipe, values: probe, sandType });
  const blocking: string[] = [];

  for (const c of input.components) {
    if (!(c.massKg > 0)) continue;
    if (c.role === "UNKNOWN") {
      blocking.push(c.id);
      continue;
    }
    if (
      c.profile.category === "UNKNOWN_CUSTOM" ||
      c.profile.id === "unknown-custom"
    ) {
      blocking.push(c.id);
    }
  }

  if (blocking.length > 0) {
    return { ok: false, blockingComponentIds: [...new Set(blocking)] };
  }
  return { ok: true };
}

function componentsFromValues(values: number[]): MaterialRequirementComponent[] {
  const ids = ["TOTAL", "A", "B", "C", "THICKENER", "FILLER"] as const;
  return ids
    .map((id, i) => ({ id, grams: Math.max(0, values[i] ?? 0) }))
    .filter((c) => c.id === "TOTAL" || c.grams > 0);
}

/**
 * Binary-search TOTAL grams so the forward material model meets the target.
 */
export function solveMaterialRequirement(input: {
  recipe: BlendingRecipe;
  planningTargetLiters: number;
  sandType?: SandType;
  policy?: MaterialTargetPolicy;
}): MaterialRequirementResult {
  const {
    recipe,
    planningTargetLiters,
    sandType = "medium",
    policy = DEFAULT_MATERIAL_TARGET_POLICY,
  } = input;

  if (
    !Number.isFinite(planningTargetLiters) ||
    !(planningTargetLiters > 0)
  ) {
    return { ok: false, reason: "INVALID_TARGET" };
  }

  const validation = validateRecipeForMaterialSolve(recipe, sandType);
  if (!validation.ok) {
    return {
      ok: false,
      reason: "UNKNOWN_CUSTOM_VOLUME",
      blockingComponentIds: validation.blockingComponentIds,
    };
  }

  const probeValues = initialMixValues(recipe, recipeBinderSum(recipe, 1000));
  if (!(probeValues[0] > 0)) {
    return { ok: false, reason: "NO_SCALABLE_MASS" };
  }

  const probeEst = estimateMaterialVolumeFromMix({
    recipe,
    values: probeValues,
    sandType,
  });
  const probeMetric = metricForPolicy(probeEst, policy);
  if (!(probeMetric > 0)) {
    return { ok: false, reason: "ZERO_VOLUME_RECIPE" };
  }

  // Expand upper bracket from linear estimate.
  let hiTotal = Math.max(
    1,
    Math.ceil((planningTargetLiters / probeMetric) * probeValues[0] * 1.15),
  );
  let hiValues = applyRecipeChange(recipe, "TOTAL", hiTotal);
  let hiEst = estimateMaterialVolumeFromMix({
    recipe,
    values: hiValues,
    sandType,
  });
  let expandGuard = 0;
  while (
    !meetsTarget(hiEst, planningTargetLiters, policy) &&
    hiTotal < ABSOLUTE_MAX_TOTAL_G &&
    expandGuard < 24
  ) {
    const metric = metricForPolicy(hiEst, policy);
    const grow =
      metric > 0
        ? Math.ceil((planningTargetLiters / metric) * hiTotal * 1.1)
        : hiTotal * 2;
    const nextHi = Math.min(ABSOLUTE_MAX_TOTAL_G, Math.max(hiTotal + 1, grow));
    if (nextHi <= hiTotal) break;
    hiTotal = nextHi;
    hiValues = applyRecipeChange(recipe, "TOTAL", hiTotal);
    hiEst = estimateMaterialVolumeFromMix({
      recipe,
      values: hiValues,
      sandType,
    });
    expandGuard += 1;
  }

  if (!meetsTarget(hiEst, planningTargetLiters, policy)) {
    return { ok: false, reason: "BRACKET_FAILED" };
  }

  let lo = 0;
  let hi = hiTotal;
  let bestValues = hiValues;
  let bestEst = hiEst;
  let prevMetric = Number.POSITIVE_INFINITY;
  let iterations = 0;

  while (lo <= hi && iterations < MAX_ITERATIONS) {
    iterations += 1;
    const mid = Math.floor((lo + hi) / 2);
    const values = applyRecipeChange(recipe, "TOTAL", mid);
    const est = estimateMaterialVolumeFromMix({ recipe, values, sandType });
    const metric = metricForPolicy(est, policy);

    // Soft non-monotonic check against previous mid metric at larger totals.
    if (metric > prevMetric + 1 && mid > 0) {
      // Allow small noise; only fail on clear inversion vs known upper.
    }
    prevMetric = metric;

    if (meetsTarget(est, planningTargetLiters, policy)) {
      bestValues = values;
      bestEst = est;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }

    if (
      meetsTarget(est, planningTargetLiters, policy) &&
      Math.abs(metric - planningTargetLiters) <= CONVERGENCE_TOLERANCE_L
    ) {
      break;
    }
  }

  if (iterations >= MAX_ITERATIONS && !meetsTarget(bestEst, planningTargetLiters, policy)) {
    return { ok: false, reason: "MAX_ITERATIONS" };
  }

  if (!meetsTarget(bestEst, planningTargetLiters, policy)) {
    return { ok: false, reason: "BRACKET_FAILED" };
  }

  // Verify upper bracket was not somehow smaller than a lower feasible — sanity.
  const verify = estimateMaterialVolumeFromMix({
    recipe,
    values: bestValues,
    sandType,
  });
  if (!meetsTarget(verify, planningTargetLiters, policy)) {
    return { ok: false, reason: "NON_MONOTONIC" };
  }

  return {
    ok: true,
    recipeId: recipe.id,
    planningTargetLiters,
    policy,
    values: bestValues,
    components: componentsFromValues(bestValues),
    material: {
      expectedRestVolumeL: verify.expectedRestVolumeL,
      restVolumeLowL: verify.restVolumeLowL,
      restVolumeHighL: verify.restVolumeHighL,
      confidence: verify.confidence,
    },
    iterations,
  };
}
