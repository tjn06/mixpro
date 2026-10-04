/**
 * Mix volume facade for MixBucket / bucket limits.
 *
 * Authoritative physics live in `domain/material-volume`.
 * This module keeps the legacy call shape and a dual-run helper for comparison.
 */

import {
  DEFAULT_SAND_BULK_DENSITY_KG_PER_L,
  estimateMaterialVolume,
  estimateMaterialVolumeFromMix,
  toLegacyVolumeView,
  type VolumeEstimate,
} from "../material-volume";
import {
  GENERIC_EPOXY_PROFILE,
  GENERIC_GRADED_QUARTZ_PROFILE,
  GENERIC_TIX_PROFILE,
  GENERIC_WATER_PROFILE,
  aggregateProfileForSandType,
} from "../material-volume/profiles";
import type { BlendingRecipe } from "../recipe/types";

/** Sand grain category — maps to aggregate profile metadata / uncertainty. */
export type SandType = "fine" | "medium" | "coarse" | "veryCoarse";

/** @deprecated Prefer DEFAULT_SAND_BULK_DENSITY_KG_PER_L from material-volume. */
export const DEFAULT_SAND_BULK_DENSITY = DEFAULT_SAND_BULK_DENSITY_KG_PER_L;

export interface MixVolumeEstimate {
  epoxyLiters: number;
  looseSandLiters: number;
  theoreticalLiters: number;
  estimatedLiters: number;
  rangeMinLiters: number;
  rangeMaxLiters: number;
}

export interface MixVolumeInput {
  /**
   * Binder (A+B) grams for the new model.
   * Callers that previously passed A+B+TIX should migrate to recipe-aware APIs.
   */
  epoxyGrams: number;
  sandGrams: number;
  sandType?: SandType;
  sandBulkDensity?: number;
  waterGrams?: number;
  tixGrams?: number;
}

/** Authoritative recipe-aware estimate (preferred). */
export function estimateMixVolumeForRecipe(
  recipe: BlendingRecipe,
  values: number[],
  sandType: SandType = "medium",
): MixVolumeEstimate {
  return toLegacyVolumeView(
    estimateMaterialVolumeFromMix({ recipe, values, sandType }),
  );
}

/** Full VolumeEstimate for consumers that need uncertainty / confidence. */
export function estimateMaterialVolumeForRecipe(
  recipe: BlendingRecipe,
  values: number[],
  sandType: SandType = "medium",
): VolumeEstimate {
  return estimateMaterialVolumeFromMix({ recipe, values, sandType });
}

/**
 * Simple epoxy + sand estimate via MaterialVolumeModel.
 * Water/tix optional; custom fillers need the recipe-aware path.
 */
export function estimateMixVolume({
  epoxyGrams,
  sandGrams,
  sandType = "medium",
  waterGrams = 0,
  tixGrams = 0,
}: MixVolumeInput): MixVolumeEstimate {
  const components = [];
  if (epoxyGrams > 0) {
    components.push({
      id: "binder",
      massKg: epoxyGrams / 1000,
      role: "BINDER" as const,
      profile: GENERIC_EPOXY_PROFILE,
    });
  }
  if (sandGrams > 0) {
    components.push({
      id: "aggregate",
      massKg: sandGrams / 1000,
      role: "AGGREGATE" as const,
      profile: aggregateProfileForSandType(sandType) ?? GENERIC_GRADED_QUARTZ_PROFILE,
    });
  }
  if (waterGrams > 0) {
    components.push({
      id: "water",
      massKg: waterGrams / 1000,
      role: "WATER" as const,
      profile: GENERIC_WATER_PROFILE,
    });
  }
  if (tixGrams > 0) {
    components.push({
      id: "tix",
      massKg: tixGrams / 1000,
      role: "TIX" as const,
      profile: GENERIC_TIX_PROFILE,
    });
  }

  return toLegacyVolumeView(estimateMaterialVolume({ components }));
}

/**
 * Pre-Phase-1 heuristic — kept for dual-run / regression comparison only.
 * Do not use for production fill estimates.
 */
export function estimateMixVolumeLegacy({
  epoxyGrams,
  sandGrams,
  sandType = "medium",
  sandBulkDensity = DEFAULT_SAND_BULK_DENSITY_KG_PER_L,
}: MixVolumeInput): MixVolumeEstimate {
  const VOLUME_FACTORS: Record<
    SandType,
    { min: number; max: number; mid: number }
  > = {
    fine: { min: 0.76, max: 0.82, mid: 0.79 },
    medium: { min: 0.82, max: 0.88, mid: 0.85 },
    coarse: { min: 0.88, max: 0.94, mid: 0.91 },
    veryCoarse: { min: 0.92, max: 0.97, mid: 0.945 },
  };

  const epoxyLiters = Math.max(0, epoxyGrams) / 1000;
  const sandKg = Math.max(0, sandGrams) / 1000;
  const looseSandLiters =
    sandKg > 0 && sandBulkDensity > 0 ? sandKg / sandBulkDensity : 0;

  if (epoxyLiters <= 0 && looseSandLiters <= 0) {
    return {
      epoxyLiters: 0,
      looseSandLiters: 0,
      theoreticalLiters: 0,
      estimatedLiters: 0,
      rangeMinLiters: 0,
      rangeMaxLiters: 0,
    };
  }

  if (sandGrams <= 0) {
    return {
      epoxyLiters,
      looseSandLiters: 0,
      theoreticalLiters: epoxyLiters,
      estimatedLiters: epoxyLiters,
      rangeMinLiters: epoxyLiters,
      rangeMaxLiters: epoxyLiters,
    };
  }

  if (epoxyGrams <= 0) {
    const factors = VOLUME_FACTORS[sandType];
    return {
      epoxyLiters: 0,
      looseSandLiters,
      theoreticalLiters: looseSandLiters,
      estimatedLiters: looseSandLiters * factors.mid,
      rangeMinLiters: looseSandLiters * factors.min,
      rangeMaxLiters: looseSandLiters * factors.max,
    };
  }

  const theoreticalLiters = looseSandLiters + epoxyLiters;
  const factors = VOLUME_FACTORS[sandType];

  return {
    epoxyLiters,
    looseSandLiters,
    theoreticalLiters,
    estimatedLiters: theoreticalLiters * factors.mid,
    rangeMinLiters: theoreticalLiters * factors.min,
    rangeMaxLiters: theoreticalLiters * factors.max,
  };
}
