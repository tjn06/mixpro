/**
 * 2D polygon helpers in millimeter model space.
 */

import type { PointMm } from "./types";

export function distMm(a: PointMm, b: PointMm): number {
  const dx = a.xMm - b.xMm;
  const dy = a.yMm - b.yMm;
  return Math.hypot(dx, dy);
}

/** Shoelace polygon area (mm²). Absolute value; winding-independent. */
export function polygonAreaMm2(points: readonly PointMm[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.xMm * b.yMm - b.xMm * a.yMm;
  }
  return Math.abs(sum) * 0.5;
}

/** Ray-cast point-in-polygon. Boundary treated as inside. */
export function pointInPolygon(point: PointMm, polygon: readonly PointMm[]): boolean {
  if (polygon.length < 3) return false;
  if (pointOnPolygonBoundary(point, polygon)) return true;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const intersect =
      pi.yMm > point.yMm !== pj.yMm > point.yMm &&
      point.xMm <
        ((pj.xMm - pi.xMm) * (point.yMm - pi.yMm)) / (pj.yMm - pi.yMm + 0) +
          pi.xMm;
    if (intersect) inside = !inside;
  }
  return inside;
}

const BOUNDARY_EPS_MM = 1e-4;

function pointOnSegment(p: PointMm, a: PointMm, b: PointMm): boolean {
  const cross = (p.yMm - a.yMm) * (b.xMm - a.xMm) - (p.xMm - a.xMm) * (b.yMm - a.yMm);
  if (Math.abs(cross) > BOUNDARY_EPS_MM) return false;
  const dot =
    (p.xMm - a.xMm) * (b.xMm - a.xMm) + (p.yMm - a.yMm) * (b.yMm - a.yMm);
  if (dot < 0) return false;
  const lenSq = (b.xMm - a.xMm) ** 2 + (b.yMm - a.yMm) ** 2;
  return dot <= lenSq + BOUNDARY_EPS_MM;
}

export function pointOnPolygonBoundary(
  point: PointMm,
  polygon: readonly PointMm[],
): boolean {
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    if (pointOnSegment(point, a, b)) return true;
  }
  return false;
}

/** Minimum distance from point to any polygon edge (mm). */
export function distanceToPolygonEdgeMm(
  point: PointMm,
  polygon: readonly PointMm[],
): number {
  if (polygon.length < 2) return Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    min = Math.min(min, distancePointToSegmentMm(point, a, b));
  }
  return min;
}

function distancePointToSegmentMm(p: PointMm, a: PointMm, b: PointMm): number {
  const dx = b.xMm - a.xMm;
  const dy = b.yMm - a.yMm;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 1e-18) return distMm(p, a);
  let t = ((p.xMm - a.xMm) * dx + (p.yMm - a.yMm) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distMm(p, { xMm: a.xMm + t * dx, yMm: a.yMm + t * dy });
}

/**
 * Proper segment intersection (shared endpoints alone do not count).
 * Used to reject self-intersecting irregular outlines.
 */
function segmentsIntersectProper(
  a1: PointMm,
  a2: PointMm,
  b1: PointMm,
  b2: PointMm,
): boolean {
  const o1 = orient(a1, a2, b1);
  const o2 = orient(a1, a2, b2);
  const o3 = orient(b1, b2, a1);
  const o4 = orient(b1, b2, a2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function orient(a: PointMm, b: PointMm, c: PointMm): number {
  return (b.xMm - a.xMm) * (c.yMm - a.yMm) - (b.yMm - a.yMm) * (c.xMm - a.xMm);
}

export function polygonSelfIntersects(points: readonly PointMm[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a1 = points[i]!;
    const a2 = points[(i + 1) % n]!;
    for (let j = i + 1; j < n; j++) {
      // Skip adjacent edges and the closing-edge pair that shares a vertex.
      if (j === i) continue;
      if ((j + 1) % n === i) continue;
      if (i + 1 === j) continue;
      const b1 = points[j]!;
      const b2 = points[(j + 1) % n]!;
      if (segmentsIntersectProper(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

/** Average of vertices — may fall outside concave polygons. */
export function polygonCentroidMm(points: readonly PointMm[]): PointMm {
  if (points.length === 0) return { xMm: 0, yMm: 0 };
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.xMm;
    y += p.yMm;
  }
  return { xMm: x / points.length, yMm: y / points.length };
}

/**
 * Prefer polygon centroid when inside; otherwise fall back to bbox center,
 * then a coarse interior scan.
 */
export function safeInteriorPointMm(
  polygon: readonly PointMm[],
  lengthMm: number,
  widthMm: number,
): PointMm {
  const centroid = polygonCentroidMm(polygon);
  if (pointInPolygon(centroid, polygon)) return centroid;

  const bboxCenter = { xMm: lengthMm * 0.5, yMm: widthMm * 0.5 };
  if (pointInPolygon(bboxCenter, polygon)) return bboxCenter;

  const steps = 11;
  for (let iy = 1; iy < steps; iy++) {
    for (let ix = 1; ix < steps; ix++) {
      const p = {
        xMm: (lengthMm * ix) / steps,
        yMm: (widthMm * iy) / steps,
      };
      if (pointInPolygon(p, polygon)) return p;
    }
  }

  // Last resort: first vertex inset toward bbox center.
  const v0 = polygon[0] ?? bboxCenter;
  return {
    xMm: v0.xMm * 0.7 + bboxCenter.xMm * 0.3,
    yMm: v0.yMm * 0.7 + bboxCenter.yMm * 0.3,
  };
}
