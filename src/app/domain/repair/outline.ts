/**
 * Build physical (mm) outlines from shape + dimensions + normalized contour.
 */

import { IRREGULAR_DEFAULT_POINTS } from "./constants";
import { polygonAreaMm2 } from "./polygon";
import type {
  NormalizedPoint,
  PointMm,
  RepairDimensions,
  RepairOutline,
  RepairShapeType,
} from "./types";

const OVAL_SEGMENTS = 48;

export function defaultIrregularOutline(): RepairOutline {
  const pts: NormalizedPoint[] = [];
  const n = IRREGULAR_DEFAULT_POINTS;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    pts.push({
      x: 0.5 + 0.42 * Math.cos(a),
      y: 0.5 + 0.42 * Math.sin(a),
    });
  }
  return { points: pts };
}

export function rectangleOutlineMm(dims: RepairDimensions): PointMm[] {
  const { lengthMm, widthMm } = dims;
  return [
    { xMm: 0, yMm: 0 },
    { xMm: lengthMm, yMm: 0 },
    { xMm: lengthMm, yMm: widthMm },
    { xMm: 0, yMm: widthMm },
  ];
}

export function ovalOutlineMm(dims: RepairDimensions): PointMm[] {
  const { lengthMm, widthMm } = dims;
  const cx = lengthMm * 0.5;
  const cy = widthMm * 0.5;
  const rx = lengthMm * 0.5;
  const ry = widthMm * 0.5;
  const pts: PointMm[] = [];
  for (let i = 0; i < OVAL_SEGMENTS; i++) {
    const a = (Math.PI * 2 * i) / OVAL_SEGMENTS;
    pts.push({
      xMm: cx + rx * Math.cos(a),
      yMm: cy + ry * Math.sin(a),
    });
  }
  return pts;
}

export function irregularOutlineMm(
  dims: RepairDimensions,
  outline: RepairOutline,
): PointMm[] {
  return outline.points.map((p) => ({
    xMm: p.x * dims.lengthMm,
    yMm: p.y * dims.widthMm,
  }));
}

export function buildOutlineMm(
  shapeType: RepairShapeType,
  dims: RepairDimensions,
  outline: RepairOutline,
): PointMm[] {
  switch (shapeType) {
    case "RECTANGLE":
      return rectangleOutlineMm(dims);
    case "OVAL":
      return ovalOutlineMm(dims);
    case "IRREGULAR":
      return irregularOutlineMm(dims, outline);
  }
}

/** Exact analytic plan area for rect/oval; polygon area for irregular. */
export function analyticPlanAreaMm2(
  shapeType: RepairShapeType,
  dims: RepairDimensions,
  outlineMm: readonly PointMm[],
): number {
  const { lengthMm, widthMm } = dims;
  if (shapeType === "RECTANGLE") return lengthMm * widthMm;
  if (shapeType === "OVAL") return Math.PI * (lengthMm * 0.5) * (widthMm * 0.5);
  return polygonAreaMm2(outlineMm);
}

export function normalizedToMm(
  p: NormalizedPoint,
  dims: RepairDimensions,
): PointMm {
  return { xMm: p.x * dims.lengthMm, yMm: p.y * dims.widthMm };
}

export function mmToNormalized(
  p: PointMm,
  dims: RepairDimensions,
): NormalizedPoint {
  return {
    x: dims.lengthMm > 0 ? p.xMm / dims.lengthMm : 0,
    y: dims.widthMm > 0 ? p.yMm / dims.widthMm : 0,
  };
}
