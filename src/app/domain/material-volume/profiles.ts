import {
  DEFAULT_EPOXY_DENSITY_KG_PER_L,
  DEFAULT_EPOXY_DENSITY_RANGE_KG_PER_L,
  DEFAULT_QUARTZ_PARTICLE_DENSITY_KG_PER_L,
  DEFAULT_SAND_BULK_DENSITY_KG_PER_L,
  DEFAULT_SAND_BULK_DENSITY_RANGE_KG_PER_L,
  DEFAULT_TIX_SOLID_DENSITY_KG_PER_L,
  DEFAULT_WATER_DENSITY_KG_PER_L,
} from "./constants";
import type { MaterialProfile } from "./types";

export const GENERIC_EPOXY_PROFILE: MaterialProfile = {
  id: "generic-epoxy",
  category: "EPOXY_BINDER",
  sourceType: "GENERIC",
  liquidDensityKgPerL: DEFAULT_EPOXY_DENSITY_KG_PER_L,
  liquidDensityRangeKgPerL: DEFAULT_EPOXY_DENSITY_RANGE_KG_PER_L,
  packingModifier: 1,
  uncertaintyModifier: 1,
};

export const GENERIC_GRADED_QUARTZ_PROFILE: MaterialProfile = {
  id: "generic-graded-quartz",
  category: "AGGREGATE",
  sourceType: "GENERIC",
  particleDensityKgPerL: DEFAULT_QUARTZ_PARTICLE_DENSITY_KG_PER_L,
  bulkDensityKgPerL: DEFAULT_SAND_BULK_DENSITY_KG_PER_L,
  bulkDensityRangeKgPerL: DEFAULT_SAND_BULK_DENSITY_RANGE_KG_PER_L,
  gradingType: "NORMAL_GRADED",
  packingModifier: 1,
  uncertaintyModifier: 1,
  particleBandsMm: [
    { min: 0.1, max: 0.5 },
    { min: 0.4, max: 0.7 },
    { min: 0.7, max: 1.2 },
  ],
};

export const FINE_QUARTZ_PROFILE: MaterialProfile = {
  ...GENERIC_GRADED_QUARTZ_PROFILE,
  id: "fine-quartz",
  gradingType: "FINE",
  uncertaintyModifier: 1.05,
  particleBandsMm: [
    { min: 0.1, max: 0.3 },
    { min: 0.1, max: 0.5 },
  ],
};

export const COARSE_QUARTZ_PROFILE: MaterialProfile = {
  ...GENERIC_GRADED_QUARTZ_PROFILE,
  id: "coarse-quartz",
  gradingType: "COARSE",
  uncertaintyModifier: 1.08,
  particleBandsMm: [
    { min: 0.7, max: 1.2 },
    { min: 2, max: 4 },
  ],
};

export const MONO_GRAIN_QUARTZ_PROFILE: MaterialProfile = {
  ...GENERIC_GRADED_QUARTZ_PROFILE,
  id: "mono-grain-quartz",
  gradingType: "MONO_GRAIN",
  packingModifier: 1.05,
  uncertaintyModifier: 1.15,
};

export const UNKNOWN_NATURAL_SAND_PROFILE: MaterialProfile = {
  ...GENERIC_GRADED_QUARTZ_PROFILE,
  id: "unknown-natural-sand",
  gradingType: "UNKNOWN_NATURAL_SAND",
  packingModifier: 1.08,
  uncertaintyModifier: 1.35,
  particleBandsMm: undefined,
};

export const GENERIC_WATER_PROFILE: MaterialProfile = {
  id: "generic-water",
  category: "WATER",
  sourceType: "GENERIC",
  liquidDensityKgPerL: DEFAULT_WATER_DENSITY_KG_PER_L,
  packingModifier: 1,
  uncertaintyModifier: 1.1,
};

export const GENERIC_TIX_PROFILE: MaterialProfile = {
  id: "generic-tix",
  category: "TIX",
  sourceType: "GENERIC",
  particleDensityKgPerL: DEFAULT_TIX_SOLID_DENSITY_KG_PER_L,
  /** Dry bulk is extremely low — never use for finished volume. */
  bulkDensityKgPerL: 0.05,
  packingModifier: 1,
  uncertaintyModifier: 1,
};

/**
 * Unknown / custom additive — no quartz/water/epoxy assumptions.
 * Contributes negligible compact volume until a real profile exists;
 * uncertainty is elevated instead.
 */
export const UNKNOWN_CUSTOM_PROFILE: MaterialProfile = {
  id: "unknown-custom",
  category: "UNKNOWN_CUSTOM",
  sourceType: "GENERIC",
  packingModifier: 1,
  uncertaintyModifier: 1.6,
};

/** Map legacy UI sand grain picker → aggregate profile (uncertainty/metadata). */
export function aggregateProfileForSandType(
  sandType: "fine" | "medium" | "coarse" | "veryCoarse" | undefined,
): MaterialProfile {
  switch (sandType) {
    case "fine":
      return FINE_QUARTZ_PROFILE;
    case "coarse":
    case "veryCoarse":
      return COARSE_QUARTZ_PROFILE;
    case "medium":
    default:
      return GENERIC_GRADED_QUARTZ_PROFILE;
  }
}
