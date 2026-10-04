/**
 * Inward polygon offset for edge-cover visualization (mm model space).
 * Approximate: each vertex moves along the average inward edge normal.
 */

import type { PointMm } from "./types";

function ringCentroid(points: readonly PointMm[]): PointMm {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.xMm;
    y += p.yMm;
  }
  const n = Math.max(1, points.length);
  return { xMm: x / n, yMm: y / n };
}

function signedArea(points: readonly PointMm[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.xMm * b.yMm - b.xMm * a.yMm;
  }
  return sum * 0.5;
}

/**
 * Shrink outline by insetMm toward the interior.
 * Returns null when inset is too large / degenerate.
 */
export function insetOutlineMm(
  points: readonly PointMm[],
  insetMm: number,
): PointMm[] | null {
  if (!(insetMm > 0) || points.length < 3) return null;

  const area = signedArea(points);
  if (Math.abs(area) < 1e-6) return null;
  // Positive area → CCW; inward normal is right of edge direction for CCW.
  const inwardSign = area > 0 ? 1 : -1;
  const center = ringCentroid(points);

  const out: PointMm[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length]!;
    const curr = points[i]!;
    const next = points[(i + 1) % points.length]!;

    const e1x = curr.xMm - prev.xMm;
    const e1y = curr.yMm - prev.yMm;
    const e2x = next.xMm - curr.xMm;
    const e2y = next.yMm - curr.yMm;
    const l1 = Math.hypot(e1x, e1y) || 1;
    const l2 = Math.hypot(e2x, e2y) || 1;

    // Edge normals pointing inward
    const n1x = (-e1y / l1) * inwardSign;
    const n1y = (e1x / l1) * inwardSign;
    const n2x = (-e2y / l2) * inwardSign;
    const n2y = (e2x / l2) * inwardSign;

    let nx = n1x + n2x;
    let ny = n1y + n2y;
    const nl = Math.hypot(nx, ny);
    if (nl < 1e-9) {
      // Fallback: toward centroid
      nx = center.xMm - curr.xMm;
      ny = center.yMm - curr.yMm;
      const cl = Math.hypot(nx, ny) || 1;
      nx /= cl;
      ny /= cl;
    } else {
      nx /= nl;
      ny /= nl;
    }

    out.push({
      xMm: curr.xMm + nx * insetMm,
      yMm: curr.yMm + ny * insetMm,
    });
  }

  // Reject if inset collapsed the shape (crossed / tiny).
  const insetArea = Math.abs(signedArea(out));
  if (insetArea < Math.abs(area) * 0.02) return null;
  return out;
}
