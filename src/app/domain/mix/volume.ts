/** Sand grain category — affects how much epoxy fills void space between grains. */
export type SandType = "fine" | "medium" | "coarse" | "veryCoarse";

/** Typical loose bulk density for dry quartz sand (kg/L). */
export const DEFAULT_SAND_BULK_DENSITY = 1.6;

const VOLUME_FACTORS: Record<SandType, { min: number; max: number; mid: number }> = {
  fine: { min: 0.76, max: 0.82, mid: 0.79 },
  medium: { min: 0.82, max: 0.88, mid: 0.85 },
  coarse: { min: 0.88, max: 0.94, mid: 0.91 },
  veryCoarse: { min: 0.92, max: 0.97, mid: 0.945 },
};

export interface MixVolumeEstimate {
  /** Resin + hardener (+ liquid additives), assuming ~1 kg/L. */
  epoxyLiters: number;
  /** Sand volume if poured loose, before epoxy fills voids. */
  looseSandLiters: number;
  /** Epoxy + loose sand — upper bound if no void filling occurred. */
  theoreticalLiters: number;
  /** Best single estimate using the sand-type correction factor. */
  estimatedLiters: number;
  rangeMinLiters: number;
  rangeMaxLiters: number;
}

export interface MixVolumeInput {
  /** Combined grams of liquid epoxy components (A + B + TIX). */
  epoxyGrams: number;
  sandGrams: number;
  sandType?: SandType;
  sandBulkDensity?: number;
}

/**
 * Estimate final mixed volume — epoxy partially fills sand voids, so
 * final volume < epoxy volume + loose sand volume.
 */
export function estimateMixVolume({
  epoxyGrams,
  sandGrams,
  sandType = "medium",
  sandBulkDensity = DEFAULT_SAND_BULK_DENSITY,
}: MixVolumeInput): MixVolumeEstimate {
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
