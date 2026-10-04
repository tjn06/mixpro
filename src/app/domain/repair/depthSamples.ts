/**
 * Recommended depth-sample placement.
 * Interior: Quick / Standard / Detailed.
 * Slope: aligned grid — edge stations + interior stations on the same fall lines.
 */

import { DEPTH_SAMPLE_INSET_FRACTION } from "./constants";
import { buildOutlineMm } from "./outline";
import {
  distMm,
  pointInPolygon,
  safeInteriorPointMm,
} from "./polygon";
import type {
  DepthSample,
  FallAxis,
  MeasurementDetail,
  PointMm,
  RepairDimensions,
  RepairOutline,
  RepairShapeType,
} from "./types";

function makeSample(id: string, p: PointMm): DepthSample {
  return {
    id,
    xMm: p.xMm,
    yMm: p.yMm,
    depthMm: null,
    source: "RECOMMENDED",
  };
}

function clampInside(
  candidates: PointMm[],
  polygon: readonly PointMm[],
  dims: RepairDimensions,
): PointMm[] {
  const out: PointMm[] = [];
  for (const c of candidates) {
    if (pointInPolygon(c, polygon)) {
      out.push(c);
      continue;
    }
    const interior = safeInteriorPointMm(polygon, dims.lengthMm, dims.widthMm);
    let p = c;
    for (let i = 0; i < 8; i++) {
      p = {
        xMm: p.xMm * 0.55 + interior.xMm * 0.45,
        yMm: p.yMm * 0.55 + interior.yMm * 0.45,
      };
      if (pointInPolygon(p, polygon)) {
        out.push(p);
        break;
      }
    }
  }
  return out;
}

function uniquePoints(points: PointMm[], epsMm = 1): PointMm[] {
  const out: PointMm[] = [];
  for (const p of points) {
    if (
      out.some((q) => Math.hypot(q.xMm - p.xMm, q.yMm - p.yMm) < epsMm)
    ) {
      continue;
    }
    out.push(p);
  }
  return out;
}

/** Closest point on any polygon edge to `p`. */
export function nearestPointOnPolygonEdge(
  p: PointMm,
  polygon: readonly PointMm[],
): PointMm {
  if (polygon.length === 0) return p;
  if (polygon.length === 1) return polygon[0]!;

  let best = polygon[0]!;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const dx = b.xMm - a.xMm;
    const dy = b.yMm - a.yMm;
    const lenSq = dx * dx + dy * dy;
    let t =
      lenSq > 0
        ? ((p.xMm - a.xMm) * dx + (p.yMm - a.yMm) * dy) / lenSq
        : 0;
    t = Math.max(0, Math.min(1, t));
    const q = { xMm: a.xMm + t * dx, yMm: a.yMm + t * dy };
    const d = distMm(p, q);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

/** Default fall axis: along the longer plan dimension. */
export function defaultFallAxis(dims: RepairDimensions): FallAxis {
  return dims.lengthMm >= dims.widthMm ? "LENGTH" : "WIDTH";
}

/** Stations across the fall (shared by edges and interior). */
function acrossFractionsForDetail(detail: MeasurementDetail): number[] {
  switch (detail) {
    case "QUICK":
    case "EXACT":
      return [0.5];
    case "STANDARD":
      return [0.25, 0.75];
    case "DETAILED":
      return [0.2, 0.5, 0.8];
  }
}

/** Stations along the fall, including start (0) and end (1). */
function alongFractionsForDetail(detail: MeasurementDetail): number[] {
  switch (detail) {
    case "EXACT":
      // Exact fall: only start + end edge — no interior stations.
      return [0, 1];
    case "QUICK":
    case "STANDARD":
      return [0, 0.5, 1];
    case "DETAILED":
      return [0, 0.25, 0.5, 0.75, 1];
  }
}

/**
 * Slope/fall grid: every fall-line uses the same across stations;
 * start/end sit on edges, middle stations are interior on those lines.
 */
function recommendSlopeAlignedSamples(
  dims: RepairDimensions,
  polygon: readonly PointMm[],
  fallAxis: FallAxis,
  detail: MeasurementDetail,
): PointMm[] {
  const across = acrossFractionsForDetail(detail);
  const along = alongFractionsForDetail(detail);
  const resolved: PointMm[] = [];

  for (const a of along) {
    const onEdge = a <= 1e-9 || a >= 1 - 1e-9;
    for (const c of across) {
      let p: PointMm;
      if (fallAxis === "LENGTH") {
        p = {
          xMm: a * dims.lengthMm,
          yMm: c * dims.widthMm,
        };
      } else {
        p = {
          xMm: c * dims.lengthMm,
          yMm: a * dims.widthMm,
        };
      }

      if (onEdge) {
        resolved.push(nearestPointOnPolygonEdge(p, polygon));
        continue;
      }

      if (pointInPolygon(p, polygon)) {
        resolved.push(p);
      } else {
        const pulled = clampInside([p], polygon, dims)[0];
        if (pulled) resolved.push(pulled);
      }
    }
  }

  return uniquePoints(resolved, 2);
}

function recommendInteriorSamples(
  dims: RepairDimensions,
  polygon: readonly PointMm[],
  detail: MeasurementDetail,
): PointMm[] {
  const center = safeInteriorPointMm(polygon, dims.lengthMm, dims.widthMm);

  if (detail === "QUICK" || detail === "EXACT") {
    return [center];
  }

  const inset =
    DEPTH_SAMPLE_INSET_FRACTION * Math.min(dims.lengthMm, dims.widthMm);
  const x0 = inset;
  const x1 = dims.lengthMm - inset;
  const y0 = inset;
  const y1 = dims.widthMm - inset;

  if (detail === "STANDARD") {
    const raw: PointMm[] = [
      { xMm: x0, yMm: y0 },
      { xMm: x1, yMm: y0 },
      { xMm: x0, yMm: y1 },
      { xMm: x1, yMm: y1 },
      center,
    ];
    return uniquePoints(clampInside(raw, polygon, dims));
  }

  const xs = [x0, dims.lengthMm * 0.5, x1];
  const ys = [y0, dims.widthMm * 0.5, y1];
  const raw: PointMm[] = [];
  for (const y of ys) {
    for (const x of xs) {
      raw.push({ xMm: x, yMm: y });
    }
  }
  raw.push(center);
  return uniquePoints(clampInside(raw, polygon, dims)).slice(0, 9);
}

/**
 * Generate recommended (unmeasured) depth samples for a hole.
 * Without slope: classic interior layout.
 * With slope: aligned fall grid (edges + interiors on the same lines).
 */
export function recommendedDepthPointCount(
  detail: MeasurementDetail,
  slopeEnabled: boolean,
): number {
  if (!slopeEnabled) {
    switch (detail) {
      case "QUICK":
      case "EXACT":
        return 1;
      case "STANDARD":
        return 5;
      case "DETAILED":
        return 9;
    }
  }
  switch (detail) {
    case "EXACT":
      return 2;
    case "QUICK":
      return 3;
    case "STANDARD":
      return 6;
    case "DETAILED":
      return 15;
  }
}

export function recommendDepthSamples(input: {
  shapeType: RepairShapeType;
  dimensions: RepairDimensions;
  outline: RepairOutline;
  measurementDetail: MeasurementDetail;
  slopeEnabled?: boolean;
  fallAxis?: FallAxis;
  idPrefix?: string;
}): DepthSample[] {
  const dims = input.dimensions;
  const polygon = buildOutlineMm(input.shapeType, dims, input.outline);
  const prefix = input.idPrefix ?? "d";
  const detail =
    (input.measurementDetail as string) === "SLOPE"
      ? "STANDARD"
      : input.measurementDetail;
  const slopeOn =
    input.slopeEnabled === true ||
    (input.measurementDetail as string) === "SLOPE";

  const pts = slopeOn
    ? recommendSlopeAlignedSamples(
        dims,
        polygon,
        input.fallAxis ?? defaultFallAxis(dims),
        detail,
      )
    : recommendInteriorSamples(dims, polygon, detail);

  return pts.map((p, i) => makeSample(`${prefix}-${i + 1}`, p));
}

export function measuredDepthSamples(
  samples: readonly DepthSample[],
): DepthSample[] {
  return samples.filter(
    (s) => s.depthMm != null && Number.isFinite(s.depthMm) && s.depthMm >= 0,
  );
}
