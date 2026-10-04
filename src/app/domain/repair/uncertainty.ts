/**
 * Geometry uncertainty around expected cavity volume.
 * Separate from work margin / material uncertainty.
 */

import {
  GEOMETRY_UNCERTAINTY,
  GEOMETRY_UNCERTAINTY_FLOOR_L,
  UNUSUALLY_DEEP_MEAN_MM,
} from "./constants";
import { measuredDepthSamples } from "./depthSamples";
import { buildOutlineMm } from "./outline";
import { distMm, pointInPolygon, safeInteriorPointMm } from "./polygon";
import type {
  RepairConfidence,
  RepairGeometryAssumptions,
  RepairHole,
} from "./types";

export type GeometryUncertaintyResult = {
  halfRangeL: number;
  confidence: RepairConfidence;
};

function depthStats(depths: number[]): { mean: number; cv: number } {
  if (depths.length === 0) return { mean: 0, cv: 0 };
  const mean = depths.reduce((a, b) => a + b, 0) / depths.length;
  if (mean <= 1e-9) return { mean: 0, cv: 0 };
  const variance =
    depths.reduce((a, d) => a + (d - mean) ** 2, 0) / depths.length;
  return { mean, cv: Math.sqrt(variance) / mean };
}

/**
 * Rough coverage score: measured points vs bbox diagonals / interior.
 * Low score → add sparseCoverage uncertainty.
 */
function coverageSparse(hole: RepairHole): boolean {
  const measured = measuredDepthSamples(hole.depthSamples);
  if (measured.length <= 1) return true;
  if (measured.length >= 5) return false;

  const dims = hole.dimensions;
  const outline = buildOutlineMm(hole.shapeType, dims, hole.outline);
  const center = safeInteriorPointMm(outline, dims.lengthMm, dims.widthMm);
  const diag = Math.hypot(dims.lengthMm, dims.widthMm);
  const nearCenter = measured.some(
    (s) => distMm({ xMm: s.xMm, yMm: s.yMm }, center) < diag * 0.2,
  );
  const inCorners = measured.filter((s) => {
    const p = { xMm: s.xMm, yMm: s.yMm };
    if (!pointInPolygon(p, outline)) return false;
    const nx = s.xMm / Math.max(dims.lengthMm, 1);
    const ny = s.yMm / Math.max(dims.widthMm, 1);
    return nx < 0.35 || nx > 0.65 || ny < 0.35 || ny > 0.65;
  }).length;

  return !(nearCenter && inCorners >= 2);
}

export function estimateGeometryUncertainty(input: {
  hole: RepairHole;
  expectedLiters: number;
  assumptions: RepairGeometryAssumptions;
}): GeometryUncertaintyResult {
  const { hole, expectedLiters, assumptions } = input;
  const V = Math.max(0, expectedLiters);
  const measured = measuredDepthSamples(hole.depthSamples);
  const depths = measured.map((s) => s.depthMm as number);

  // Exact: flat floor (1 depth) or measured start/end fall (2 depths) → HIGH.
  if (hole.measurementDetail === "EXACT") {
    const need = hole.slopeEnabled ? 2 : 1;
    if (measured.length >= need) {
      return {
        halfRangeL: Math.max(GEOMETRY_UNCERTAINTY_FLOOR_L, V * 0.02),
        confidence: "HIGH",
      };
    }
  }

  const { mean, cv } = depthStats(depths);
  const U = GEOMETRY_UNCERTAINTY;

  let relative = U.baseRelative;

  if (measured.length <= 1) relative += U.oneSample;
  else if (measured.length === 2) relative += U.twoSamples;
  else if (measured.length === 3) relative += 0.04;
  else if (measured.length === 4) relative += 0.02;

  const incomplete =
    assumptions.recommendedCount > 0 &&
    measured.length < hole.depthSamples.length;
  if (incomplete) relative += U.incompleteRecommended;

  if (hole.shapeType === "IRREGULAR") relative += U.irregularShape;

  if (assumptions.edgeModeRequested === "AUTO") relative += U.autoEdge;
  if (assumptions.edgeModeResolved === "SLOPED") relative += U.slopedEdge;

  relative += Math.min(0.2, cv * U.depthCvScale);

  if (coverageSparse(hole)) relative += U.sparseCoverage;

  if (mean > UNUSUALLY_DEEP_MEAN_MM) relative += U.deepRepairRelativeDepth;

  const halfRangeL = Math.max(GEOMETRY_UNCERTAINTY_FLOOR_L, V * relative);

  let confidence: RepairConfidence = "MEDIUM";
  if (
    measured.length >= 5 &&
    cv < 0.15 &&
    hole.shapeType !== "IRREGULAR" &&
    assumptions.edgeModeRequested !== "AUTO" &&
    !incomplete &&
    relative < 0.1
  ) {
    confidence = "HIGH";
  }
  if (
    measured.length <= 1 ||
    cv > 0.45 ||
    relative > 0.22 ||
    (hole.shapeType === "IRREGULAR" && measured.length < 3)
  ) {
    confidence = "LOW";
  }
  if (measured.length <= 1 && (cv > 0.5 || hole.shapeType === "IRREGULAR")) {
    confidence = "EXPERIMENTAL";
  }

  // Preset must not grant HIGH when only one measurement completed.
  if (measured.length <= 1 && confidence === "HIGH") {
    confidence = "LOW";
  }

  return { halfRangeL, confidence };
}
