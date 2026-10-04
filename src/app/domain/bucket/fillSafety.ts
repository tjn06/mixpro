/**
 * FillSafetyModel — SafeFill limit + operator-facing domain states.
 *
 * Domain returns states only; UI/i18n owns wording.
 * InitialPotential over SafeFill with sand is NOT a hard failure
 * (GRADUAL_AGGREGATE_ADDITION_RECOMMENDED).
 */

import {
  PURE_EPOXY_SAFE_FILL_FRACTION,
  SAND_MIX_SAFE_FILL_FRACTION,
  TIX_EPOXY_SAFE_FILL_FRACTION,
} from "../material-volume/constants";
import type { VolumeEstimate } from "../material-volume/types";

/**
 * Domain fill-safety states — map to copy in i18n, never English hard-coded here.
 */
export type FillSafetyState =
  | "NO_BUCKET"
  | "COMFORTABLE"
  | "APPROACHING_LIMIT"
  | "GRADUAL_AGGREGATE_ADDITION_RECOMMENDED"
  | "AT_LIMIT"
  | "OVER_LIMIT";

export type SafeFillProfileKind = "PURE_EPOXY" | "TIX_EPOXY" | "SAND_MIX";

/** Relative band where upper uncertainty is “approaching” SafeFill (tunable). */
export const APPROACHING_SAFE_FILL_FRACTION_OF_LIMIT = 0.92;

export type FillSafetyAssessment = {
  state: FillSafetyState;
  profileKind: SafeFillProfileKind;
  /** Configured SafeFill fraction for this mix class (e.g. 0.75 / 0.80). */
  safeFillFraction: number;
  /** Absolute SafeFill limit in liters for the selected bucket. */
  safeFillLimitL: number;
  capacityL: number;
};

/**
 * Pick the independent SafeFill config key from mix composition.
 * Pure epoxy / tix-epoxy: 75%. Sand mix: 80%.
 */
export function resolveSafeFillProfile(
  estimate: Pick<
    VolumeEstimate,
    "aggregateMassKg" | "tixMassKg" | "epoxyMassKg"
  >,
): { kind: SafeFillProfileKind; fraction: number } {
  if (estimate.aggregateMassKg > 0) {
    return { kind: "SAND_MIX", fraction: SAND_MIX_SAFE_FILL_FRACTION };
  }
  if (estimate.tixMassKg > 0) {
    return { kind: "TIX_EPOXY", fraction: TIX_EPOXY_SAFE_FILL_FRACTION };
  }
  return { kind: "PURE_EPOXY", fraction: PURE_EPOXY_SAFE_FILL_FRACTION };
}

export function safeFillLimitLiters(
  capacityL: number,
  safeFillFraction: number,
): number {
  if (!(capacityL > 0) || !(safeFillFraction > 0)) return 0;
  return capacityL * safeFillFraction;
}

/**
 * Assess fill safety from material volumes + bucket capacity.
 * Does not reject sand mixes solely for InitialPotential > SafeFill.
 */
export function assessFillSafety(params: {
  estimate: VolumeEstimate;
  capacityL: number | null;
}): FillSafetyAssessment {
  const { estimate, capacityL } = params;
  const profile = resolveSafeFillProfile(estimate);

  if (capacityL == null || !(capacityL > 0)) {
    return {
      state: "NO_BUCKET",
      profileKind: profile.kind,
      safeFillFraction: profile.fraction,
      safeFillLimitL: 0,
      capacityL: 0,
    };
  }

  const safeFillLimitL = safeFillLimitLiters(capacityL, profile.fraction);
  const expected = Math.max(0, estimate.expectedRestVolumeL);
  const high = Math.max(expected, estimate.restVolumeHighL);
  const initial = Math.max(0, estimate.initialPotentialVolumeL);
  const approachingBand =
    safeFillLimitL * APPROACHING_SAFE_FILL_FRACTION_OF_LIMIT;

  let state: FillSafetyState = "COMFORTABLE";

  if (expected > safeFillLimitL + 1e-9) {
    state = "OVER_LIMIT";
  } else if (high >= safeFillLimitL - 1e-9) {
    // Upper uncertainty (or expected) reaches SafeFill — still within clamp band.
    state = "AT_LIMIT";
  } else if (
    estimate.aggregateMassKg > 0 &&
    initial >= safeFillLimitL - 1e-9 &&
    high < safeFillLimitL
  ) {
    // Finished volume OK; loose sand load may briefly exceed — add gradually.
    state = "GRADUAL_AGGREGATE_ADDITION_RECOMMENDED";
  } else if (high >= approachingBand) {
    state = "APPROACHING_LIMIT";
  }

  return {
    state,
    profileKind: profile.kind,
    safeFillFraction: profile.fraction,
    safeFillLimitL,
    capacityL,
  };
}

/** True when hard clamp / “full” UI should treat the mix as at SafeFill. */
export function isAtOrOverSafeFill(state: FillSafetyState): boolean {
  return state === "AT_LIMIT" || state === "OVER_LIMIT";
}
