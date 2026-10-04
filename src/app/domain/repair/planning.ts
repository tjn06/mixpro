/**
 * Planning target: geometry basis × (1 + work margin).
 * Work margin is explicit and separate from geometry uncertainty.
 */

import { DEFAULT_WORK_MARGIN_FRACTION } from "./constants";
import type { RepairPlanningResult, RepairVolumeEstimate } from "./types";
import { sanitizeNonNegative } from "./units";

/** Which geometry band drives the material calc target. */
export type RepairCalcBasis = "PLANNING" | "ESTIMATED";

export function clampWorkMarginFraction(fraction: number): number {
  if (!Number.isFinite(fraction)) return DEFAULT_WORK_MARGIN_FRACTION;
  return Math.max(0, Math.min(1, fraction));
}

/**
 * Material / mix target from geometry + work margin.
 * PLANNING (default): upper × (1 + margin) — covers uncertainty + practical losses.
 * ESTIMATED: expected × (1 + margin) — best-guess cavity, optional work margin only.
 */
export function materialCalcTargetLiters(input: {
  expectedLiters: number;
  upperLiters: number;
  workMarginFraction?: number;
  basis?: RepairCalcBasis;
}): number {
  const workMarginFraction = clampWorkMarginFraction(
    input.workMarginFraction ?? DEFAULT_WORK_MARGIN_FRACTION,
  );
  const basis = input.basis ?? "PLANNING";
  const base =
    basis === "ESTIMATED"
      ? sanitizeNonNegative(input.expectedLiters)
      : sanitizeNonNegative(input.upperLiters);
  return base * (1 + workMarginFraction);
}

/**
 * V1 session planning readout: always upper × (1 + workMargin).
 * Material calc may use {@link materialCalcTargetLiters} with ESTIMATED instead.
 */
export function planRepairVolume(input: {
  geometry: Pick<
    RepairVolumeEstimate,
    "expectedLiters" | "lowerLiters" | "upperLiters"
  >;
  workMarginFraction?: number;
}): RepairPlanningResult {
  const workMarginFraction = clampWorkMarginFraction(
    input.workMarginFraction ?? DEFAULT_WORK_MARGIN_FRACTION,
  );
  const geometryUpperLiters = sanitizeNonNegative(input.geometry.upperLiters);
  return {
    geometryExpectedLiters: sanitizeNonNegative(input.geometry.expectedLiters),
    geometryLowerLiters: sanitizeNonNegative(input.geometry.lowerLiters),
    geometryUpperLiters,
    workMarginFraction,
    planningTargetLiters: geometryUpperLiters * (1 + workMarginFraction),
  };
}

/**
 * Session policy: sum hole uppers (and expected/lower), then apply margin once.
 */
export function planSessionFromHoleEstimates(
  estimates: readonly RepairVolumeEstimate[],
  workMarginFraction: number = DEFAULT_WORK_MARGIN_FRACTION,
): RepairPlanningResult {
  const expected = estimates.reduce((s, e) => s + e.expectedLiters, 0);
  const lower = estimates.reduce((s, e) => s + e.lowerLiters, 0);
  const upper = estimates.reduce((s, e) => s + e.upperLiters, 0);
  return planRepairVolume({
    geometry: {
      expectedLiters: expected,
      lowerLiters: lower,
      upperLiters: upper,
    },
    workMarginFraction,
  });
}
