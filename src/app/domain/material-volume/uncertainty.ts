import { NORMAL_MAX_TIX_PERCENT } from "./constants";
import type { MaterialProfile, VolumeConfidence } from "./types";

export type UncertaintyInputs = {
  epoxyMassKg: number;
  aggregateMassKg: number;
  waterMassKg: number;
  tixMassKg: number;
  sandToEpoxyRatio: number;
  tixPercentOfBinder: number;
  expectedRestVolumeL: number;
  epoxyProfile: MaterialProfile | null;
  aggregateProfile: MaterialProfile | null;
  hasUnknownCustom: boolean;
  hasWaterWithAggregateOrTix: boolean;
};

export type UncertaintyResult = {
  halfRangeL: number;
  confidence: VolumeConfidence;
};

/**
 * Relative/absolute uncertainty around expected resting volume.
 * Increases with unknowns, high R, high tix, custom fillers.
 */
export function estimateVolumeUncertainty(
  input: UncertaintyInputs,
): UncertaintyResult {
  const V = Math.max(0, input.expectedRestVolumeL);
  if (V <= 0 && input.epoxyMassKg <= 0 && input.aggregateMassKg <= 0) {
    return { halfRangeL: 0, confidence: "HIGH" };
  }

  // Base relative uncertainty for generic calibrated-ish mortar.
  let relative = 0.04;

  if (!input.epoxyProfile || input.epoxyProfile.sourceType === "GENERIC") {
    relative += 0.015;
  }
  if (input.aggregateMassKg > 0) {
    const aggU = input.aggregateProfile?.uncertaintyModifier ?? 1.2;
    relative += 0.03 * Math.max(0, aggU - 0.9);
    if (input.sandToEpoxyRatio > 12) relative += 0.025;
    if (input.sandToEpoxyRatio > 18) relative += 0.04;
  }
  if (input.tixPercentOfBinder > 0) {
    relative += 0.01;
    if (input.tixPercentOfBinder > NORMAL_MAX_TIX_PERCENT) {
      relative += 0.04 + (input.tixPercentOfBinder - NORMAL_MAX_TIX_PERCENT) * 0.008;
    } else if (input.tixPercentOfBinder > 3.5) {
      relative += 0.015;
    }
  }
  if (input.hasUnknownCustom) relative += 0.08;
  if (input.hasWaterWithAggregateOrTix) relative += 0.025;
  if (input.waterMassKg > 0 && input.epoxyMassKg > 0) relative += 0.01;

  // Absolute floor so small batches still show a visible band later.
  const halfRangeL = Math.max(0.05, V * relative);

  let confidence: VolumeConfidence = "MEDIUM";
  if (
    !input.hasUnknownCustom &&
    input.tixPercentOfBinder <= NORMAL_MAX_TIX_PERCENT &&
    input.sandToEpoxyRatio <= 12 &&
    relative < 0.07
  ) {
    confidence = input.aggregateMassKg > 0 ? "MEDIUM" : "HIGH";
  }
  if (
    input.hasUnknownCustom ||
    input.tixPercentOfBinder > NORMAL_MAX_TIX_PERCENT ||
    input.sandToEpoxyRatio > 18
  ) {
    confidence = input.sandToEpoxyRatio > 20 ? "EXPERIMENTAL" : "LOW";
  }

  return { halfRangeL, confidence };
}
