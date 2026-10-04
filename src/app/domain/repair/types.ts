/**
 * Repair Hole domain types.
 * Geometry-only: no material, bucket, or SafeFill knowledge.
 */

import type { VolumeConfidence } from "../material-volume/types";

export type RepairShapeType = "RECTANGLE" | "OVAL" | "IRREGULAR";

/**
 * How many interior depth points the UI recommends.
 * EXACT = flat homogeneous floor → one depth, high confidence (not an estimate band).
 */
export type MeasurementDetail = "QUICK" | "STANDARD" | "DETAILED" | "EXACT";

/** Direction of slope/fall when slopeEnabled is on. */
export type FallAxis = "LENGTH" | "WIDTH";

/** Operator-facing edge mode. AUTO resolves to a concrete mode. */
export type EdgeProfileMode = "AUTO" | "UNIFORM" | "SLOPED";

export type ResolvedEdgeMode = "UNIFORM" | "SLOPED";

/** Reuse material-volume confidence labels for geometry uncertainty presentation. */
export type RepairConfidence = VolumeConfidence;

/** Model-space point in millimeters within the hole bounding box. */
export type PointMm = {
  xMm: number;
  yMm: number;
};

/** Normalized outline point in the hole bounding box (0…1). */
export type NormalizedPoint = {
  x: number;
  y: number;
};

export type RepairDimensions = {
  /** Bounding-box length (mm). */
  lengthMm: number;
  /** Bounding-box width (mm). */
  widthMm: number;
};

export type RepairOutline = {
  /**
   * Normalized contour for IRREGULAR shapes.
   * RECTANGLE / OVAL ignore this and derive outline from dimensions.
   */
  points: NormalizedPoint[];
};

export type DepthSample = {
  id: string;
  xMm: number;
  yMm: number;
  /** null = recommended / waiting; finite number = measured. */
  depthMm: number | null;
  source: "RECOMMENDED" | "USER";
};

export type RepairHole = {
  id: string;
  name: string;
  shapeType: RepairShapeType;
  dimensions: RepairDimensions;
  outline: RepairOutline;
  depthSamples: DepthSample[];
  measurementDetail: MeasurementDetail;
  /**
   * When true, also recommend start/end edge samples for fall.
   * Interior layout still follows measurementDetail.
   */
  slopeEnabled: boolean;
  /** Fall direction when slopeEnabled. */
  fallAxis: FallAxis;
  /**
   * True when EXACT detail without slope — flat homogeneous floor; one measured
   * depth treated as real (high confidence). EXACT + slope uses two edge points.
   */
  flatBottom: boolean;
  edgeProfile: EdgeProfileMode;
  /**
   * How far in from the rim the edge cover slopes (mm).
   * null = auto from hole size when edgeProfile is SLOPED; ignored when UNIFORM.
   */
  edgeInsetMm: number | null;
  createdAt: number;
  updatedAt: number;
};

export type RepairGeometryAssumptions = {
  edgeModeRequested: EdgeProfileMode;
  edgeModeResolved: ResolvedEdgeMode;
  edgeInsetMm: number;
  sampleCount: number;
  measuredCount: number;
  recommendedCount: number;
  gridCellsUsed: number;
  shapeType: RepairShapeType;
  planAreaMm2: number;
  interpolation: "IDW";
  /** True when operator asserted a flat homogeneous floor. */
  flatBottom: boolean;
};

export type RepairVolumeEstimate = {
  expectedLiters: number;
  lowerLiters: number;
  upperLiters: number;
  confidence: RepairConfidence;
  assumptions: RepairGeometryAssumptions;
};

/**
 * Planning target from geometry upper + explicit work margin.
 * Work margin is NOT geometry uncertainty.
 */
export type RepairPlanningResult = {
  geometryExpectedLiters: number;
  geometryLowerLiters: number;
  geometryUpperLiters: number;
  workMarginFraction: number;
  planningTargetLiters: number;
};

export type RepairSessionTotals = {
  holeCount: number;
  expectedLiters: number;
  lowerLiters: number;
  upperLiters: number;
  /** Worst (lowest) confidence across holes; empty → HIGH. */
  confidence: RepairConfidence;
  planning: RepairPlanningResult;
};

export type RepairHoleValidationIssue =
  | "NON_POSITIVE_DIMENSION"
  | "NO_DEPTH_SAMPLES"
  | "INVALID_DEPTH"
  | "SELF_INTERSECTING_OUTLINE"
  | "DEGENERATE_OUTLINE"
  | "TOO_FEW_OUTLINE_POINTS"
  | "TOO_MANY_OUTLINE_POINTS"
  | "OUTLINE_POINT_OUT_OF_BOUNDS";

export type RepairHoleValidation = {
  ok: boolean;
  issues: RepairHoleValidationIssue[];
};

export type RepairSession = {
  id: string;
  holes: RepairHole[];
  /** Session-level work margin (fraction, e.g. 0.10). */
  workMarginFraction: number;
  /** Selected recipe id for the combined repair requirement. */
  recipeId: string | null;
  /**
   * Mixing bucket for batch planning (persisted).
   * Concrete size only — "none" is not used in Repair V1.
   */
  bucketSize: 5 | 10 | 17;
  createdAt: number;
  updatedAt: number;
};