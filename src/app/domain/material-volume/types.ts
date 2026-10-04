/**
 * Material-volume domain types.
 * Bucket UI and future repair/requirement calculators consume these —
 * they must not depend on bucket geometry.
 */

/** Aggregate grading profile — V1 mostly affects uncertainty/metadata. */
export type AggregateGradingType =
  | "FINE"
  | "NORMAL_GRADED"
  | "COARSE"
  | "MONO_GRAIN"
  | "UNKNOWN_NATURAL_SAND"
  | "PRODUCT_SPECIFIC";

export type MaterialSourceType =
  | "GENERIC"
  | "MANUFACTURER"
  | "COMPANY_CALIBRATED";

export type MaterialCategory =
  | "EPOXY_BINDER"
  | "AGGREGATE"
  | "WATER"
  | "TIX"
  | "UNKNOWN_CUSTOM"
  | "OTHER";

/**
 * Model confidence — domain state only; UI maps to copy later.
 */
export type VolumeConfidence = "HIGH" | "MEDIUM" | "LOW" | "EXPERIMENTAL";

/**
 * Material contribution role for mass accounting.
 * BINDER is only assigned when metadata explicitly says so (not default for C).
 */
export type MaterialRole = "BINDER" | "AGGREGATE" | "WATER" | "TIX" | "UNKNOWN" | "OTHER";

export type MaterialProfile = {
  id: string;
  category: MaterialCategory;
  sourceType: MaterialSourceType;
  /** Liquid / bulk density for liquids (kg/L). */
  liquidDensityKgPerL?: number;
  /** True solid/particle density (kg/L), e.g. quartz 2.65. */
  particleDensityKgPerL?: number;
  /** Loose bulk density (kg/L), e.g. sand ~1.50 — not finished mortar volume. */
  bulkDensityKgPerL?: number;
  bulkDensityRangeKgPerL?: { min: number; max: number };
  liquidDensityRangeKgPerL?: { min: number; max: number };
  gradingType?: AggregateGradingType;
  packingModifier?: number;
  uncertaintyModifier?: number;
  nominalParticleRangeMm?: { min: number; max: number };
  /** Reference particle bands for later calibration (mm). */
  particleBandsMm?: Array<{ min: number; max: number }>;
};

/** One weighed component for the volume engine. */
export type MaterialComponentInput = {
  id: string;
  /** Mass in kilograms. */
  massKg: number;
  role: MaterialRole;
  profile: MaterialProfile;
};

export type MaterialRecipeInput = {
  components: MaterialComponentInput[];
  /**
   * When true, components with role BINDER beyond A/B are included in epoxyMass.
   * V1 adapter leaves this false unless metadata says so.
   */
  includeExplicitBinderExtras?: boolean;
};

export type VolumeEstimate = {
  /** Compact physical solid/liquid volume before packing correction (L). */
  compactPhysicalVolumeL: number;
  /** Expected resting / finished volume (L). */
  expectedRestVolumeL: number;
  restVolumeLowL: number;
  restVolumeHighL: number;
  /** Theoretical initial loose loading volume (L) — not a hard reject limit. */
  initialPotentialVolumeL: number;
  sandToEpoxyRatio: number;
  tixPercentOfBinder: number;
  epoxyMassKg: number;
  aggregateMassKg: number;
  waterMassKg: number;
  tixMassKg: number;
  packingCorrection: number;
  confidence: VolumeConfidence;
};

/** Legacy MixVolumeEstimate-compatible view for current MixBucket consumers. */
export type LegacyVolumeView = {
  epoxyLiters: number;
  looseSandLiters: number;
  theoreticalLiters: number;
  estimatedLiters: number;
  rangeMinLiters: number;
  rangeMaxLiters: number;
};
