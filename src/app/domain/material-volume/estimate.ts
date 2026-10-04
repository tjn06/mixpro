import { estimatePackingCorrection } from "./packing";
import { estimateVolumeUncertainty } from "./uncertainty";
import type {
  LegacyVolumeView,
  MaterialComponentInput,
  MaterialRecipeInput,
  VolumeEstimate,
} from "./types";

function sumMass(
  components: MaterialComponentInput[],
  role: MaterialComponentInput["role"],
): number {
  return components
    .filter((c) => c.role === role)
    .reduce((s, c) => s + Math.max(0, c.massKg), 0);
}

function componentVolumeL(c: MaterialComponentInput): number {
  const m = Math.max(0, c.massKg);
  if (!(m > 0)) return 0;
  const p = c.profile;

  switch (c.role) {
    case "BINDER": {
      const d = p.liquidDensityKgPerL;
      return d && d > 0 ? m / d : 0;
    }
    case "WATER": {
      const d = p.liquidDensityKgPerL ?? 1;
      return d > 0 ? m / d : 0;
    }
    case "AGGREGATE": {
      const d = p.particleDensityKgPerL;
      return d && d > 0 ? m / d : 0;
    }
    case "TIX": {
      const d = p.particleDensityKgPerL;
      return d && d > 0 ? m / d : 0;
    }
    case "UNKNOWN":
      // No assumed density — volume contribution deferred to uncertainty.
      return 0;
    case "OTHER": {
      if (p.particleDensityKgPerL && p.particleDensityKgPerL > 0) {
        return m / p.particleDensityKgPerL;
      }
      if (p.liquidDensityKgPerL && p.liquidDensityKgPerL > 0) {
        return m / p.liquidDensityKgPerL;
      }
      return 0;
    }
    default:
      return 0;
  }
}

function looseBulkVolumeL(c: MaterialComponentInput): number {
  if (c.role !== "AGGREGATE") return 0;
  const m = Math.max(0, c.massKg);
  const bulk = c.profile.bulkDensityKgPerL;
  if (!(m > 0) || !bulk || !(bulk > 0)) return 0;
  return m / bulk;
}

/**
 * Estimate finished / resting material volume from component masses.
 * Independent of bucket geometry — safe for future repair/requirement use.
 */
export function estimateMaterialVolume(
  recipe: MaterialRecipeInput,
): VolumeEstimate {
  const components = recipe.components ?? [];

  const binderComponents = components.filter((c) => c.role === "BINDER");
  const epoxyMassKg = binderComponents.reduce(
    (s, c) => s + Math.max(0, c.massKg),
    0,
  );
  const aggregateMassKg = sumMass(components, "AGGREGATE");
  const waterMassKg = sumMass(components, "WATER");
  const tixMassKg = sumMass(components, "TIX");
  const hasUnknownCustom = components.some((c) => c.role === "UNKNOWN");

  const epoxyProfile = binderComponents[0]?.profile ?? null;
  const aggregateProfile =
    components.find((c) => c.role === "AGGREGATE")?.profile ?? null;

  let compactPhysicalVolumeL = 0;
  let initialPotentialVolumeL = 0;

  for (const c of components) {
    compactPhysicalVolumeL += componentVolumeL(c);
    if (c.role === "BINDER" || c.role === "WATER") {
      initialPotentialVolumeL += componentVolumeL(c);
    } else if (c.role === "AGGREGATE") {
      initialPotentialVolumeL += looseBulkVolumeL(c);
    }
    // Do NOT add dry tix powder bulk volume to initial potential.
  }

  const sandToEpoxyRatio =
    epoxyMassKg > 0 ? aggregateMassKg / epoxyMassKg : aggregateMassKg > 0 ? Infinity : 0;
  const tixPercentOfBinder =
    epoxyMassKg > 0 ? (100 * tixMassKg) / epoxyMassKg : 0;

  const aggregateLooseBulkVolumeL = components
    .filter((c) => c.role === "AGGREGATE")
    .reduce((s, c) => s + looseBulkVolumeL(c), 0);

  const packingCorrection = estimatePackingCorrection(
    Number.isFinite(sandToEpoxyRatio) ? sandToEpoxyRatio : 99,
    aggregateProfile,
    {
      compactPhysicalVolumeL,
      aggregateLooseBulkVolumeL,
    },
  );

  const expectedRestVolumeL = compactPhysicalVolumeL * (1 + packingCorrection);

  const { halfRangeL, confidence } = estimateVolumeUncertainty({
    epoxyMassKg,
    aggregateMassKg,
    waterMassKg,
    tixMassKg,
    sandToEpoxyRatio: Number.isFinite(sandToEpoxyRatio) ? sandToEpoxyRatio : 99,
    tixPercentOfBinder,
    expectedRestVolumeL,
    epoxyProfile,
    aggregateProfile,
    hasUnknownCustom,
    hasWaterWithAggregateOrTix:
      waterMassKg > 0 && (aggregateMassKg > 0 || tixMassKg > 0),
  });

  return {
    compactPhysicalVolumeL,
    expectedRestVolumeL,
    restVolumeLowL: Math.max(0, expectedRestVolumeL - halfRangeL),
    restVolumeHighL: expectedRestVolumeL + halfRangeL,
    initialPotentialVolumeL,
    sandToEpoxyRatio: Number.isFinite(sandToEpoxyRatio) ? sandToEpoxyRatio : 0,
    tixPercentOfBinder,
    epoxyMassKg,
    aggregateMassKg,
    waterMassKg,
    tixMassKg,
    packingCorrection,
    confidence,
  };
}

/** Map new estimate → legacy MixBucket fields for current UI consumers. */
export function toLegacyVolumeView(estimate: VolumeEstimate): LegacyVolumeView {
  const epoxyLiters =
    estimate.epoxyMassKg > 0 ? estimate.epoxyMassKg / 1.1 : 0;
  const looseSandLiters =
    estimate.aggregateMassKg > 0 ? estimate.aggregateMassKg / 1.5 : 0;

  return {
    epoxyLiters,
    looseSandLiters,
    theoreticalLiters: estimate.initialPotentialVolumeL,
    estimatedLiters: estimate.expectedRestVolumeL,
    rangeMinLiters: estimate.restVolumeLowL,
    rangeMaxLiters: estimate.restVolumeHighL,
  };
}
