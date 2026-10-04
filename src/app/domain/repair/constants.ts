/**
 * Central Repair geometry / planning defaults.
 * Heuristic — not calibrated physics. Keep thresholds here only.
 */

/** Default work margin applied once at session planning level. */
export const DEFAULT_WORK_MARGIN_FRACTION = 0;

/** Previous shipped default — used only when migrating persisted sessions. */
export const LEGACY_DEFAULT_WORK_MARGIN_FRACTION = 0.1;

/** Primary operator unit for Repair dimensions and depths. */
export const REPAIR_PRIMARY_UNIT = "mm" as const;

/** mm³ → liters. */
export const MM3_PER_LITER = 1_000_000;

/** V1 irregular outline point bounds. */
export const IRREGULAR_MIN_POINTS = 4;
export const IRREGULAR_MAX_POINTS = 12;
export const IRREGULAR_DEFAULT_POINTS = 6;

/** Provisional max sloped-edge inset (mm). Shrinks with hole size. */
export const MAX_EDGE_INSET_MM = 100;

/**
 * Edge inset = min(MAX_EDGE_INSET_MM, EDGE_INSET_FRACTION × min(length, width)).
 */
export const EDGE_INSET_FRACTION = 0.12;

/**
 * Auto → UNIFORM when the smaller plan dimension is below this (mm).
 * Small repairs cannot host a meaningful edge zone.
 */
export const AUTO_UNIFORM_MAX_MIN_DIM_MM = 250;

/**
 * Auto → UNIFORM when resolved inset would be below this (mm).
 */
export const AUTO_MIN_MEANINGFUL_INSET_MM = 20;

/**
 * Sampling grid: target cells along the longer axis.
 * Bounded for mobile performance; not tied to SVG pixels.
 */
export const GRID_TARGET_CELLS_LONG_AXIS = 48;
export const GRID_MIN_CELLS_PER_AXIS = 12;
export const GRID_MAX_CELLS_PER_AXIS = 64;

/** IDW power (p=2 is standard). */
export const IDW_POWER = 2;

/** Coincidence epsilon for IDW exact-hit (mm). */
export const IDW_EXACT_HIT_EPS_MM = 1e-6;

/** Depth sample inset from bbox edge as fraction of min dim (Standard/Detailed). */
export const DEPTH_SAMPLE_INSET_FRACTION = 0.22;

/** Absolute floor for geometry half-range (L). */
export const GEOMETRY_UNCERTAINTY_FLOOR_L = 0.05;

/** Empirical relative uncertainty coefficients (geometry only). */
export const GEOMETRY_UNCERTAINTY = {
  baseRelative: 0.04,
  oneSample: 0.12,
  twoSamples: 0.07,
  incompleteRecommended: 0.035,
  irregularShape: 0.025,
  autoEdge: 0.02,
  slopedEdge: 0.03,
  depthCvScale: 0.15,
  sparseCoverage: 0.04,
  deepRepairRelativeDepth: 0.015,
} as const;

/** Depth (mm) above which unusually deep repairs add a little uncertainty. */
export const UNUSUALLY_DEEP_MEAN_MM = 80;
