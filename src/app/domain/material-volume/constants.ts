/** Central V1 material / safety defaults — do not scatter these in UI code. */

export const DEFAULT_EPOXY_DENSITY_KG_PER_L = 1.1;
export const DEFAULT_EPOXY_DENSITY_RANGE_KG_PER_L = { min: 1.08, max: 1.11 };

export const DEFAULT_QUARTZ_PARTICLE_DENSITY_KG_PER_L = 2.65;

/** Generic loose sand bulk density (initial potential / uncertainty — not finished volume). */
export const DEFAULT_SAND_BULK_DENSITY_KG_PER_L = 1.5;
export const DEFAULT_SAND_BULK_DENSITY_RANGE_KG_PER_L = { min: 1.31, max: 1.55 };

export const DEFAULT_TIX_SOLID_DENSITY_KG_PER_L = 2.2;

export const DEFAULT_WATER_DENSITY_KG_PER_L = 1.0;

/** Independent SafeFill fractions by mix class (single source of truth). */
export const PURE_EPOXY_SAFE_FILL_FRACTION = 0.75;
export const TIX_EPOXY_SAFE_FILL_FRACTION = 0.75;
export const SAND_MIX_SAFE_FILL_FRACTION = 0.8;

/** Above this tix % of binder, confidence/uncertainty degrade strongly. */
export const NORMAL_MAX_TIX_PERCENT = 5;

/** Metadata only — must not drive V1 resting volume. */
export const STANDARD_MIX_TIME_REFERENCE_MINUTES = 2;
export const REAL_WORLD_SHORT_MIX_REFERENCE_MINUTES = 1;

/**
 * Packing calibration shape guide (R → residual correction fraction).
 * Interpolated smoothly; not a jagged production piecewise.
 */
export const PACKING_CALIBRATION_POINTS: ReadonlyArray<{
  r: number;
  correction: number;
}> = [
  { r: 0, correction: 0 },
  { r: 2, correction: 0.01 },
  { r: 3, correction: 0.04 },
  { r: 5, correction: 0.1 },
  { r: 7.5, correction: 0.08 },
  { r: 11, correction: 0.08 },
  { r: 15, correction: 0.09 },
];

/** Above this R, transition toward open aggregate structure. */
export const OPEN_AGGREGATE_R_START = 15;
export const OPEN_AGGREGATE_R_FULL = 25;
