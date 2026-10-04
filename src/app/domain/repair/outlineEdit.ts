/**
 * Irregular outline mutations (normalized 0…1).
 * Rejects self-intersecting results.
 */

import {
  IRREGULAR_MAX_POINTS,
  IRREGULAR_MIN_POINTS,
} from "./constants";
import { irregularOutlineMm } from "./outline";
import { polygonSelfIntersects } from "./polygon";
import type {
  NormalizedPoint,
  RepairDimensions,
  RepairOutline,
} from "./types";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function isValidOutline(
  points: readonly NormalizedPoint[],
  dims: RepairDimensions,
): boolean {
  if (points.length < IRREGULAR_MIN_POINTS) return false;
  if (points.length > IRREGULAR_MAX_POINTS) return false;
  const mm = irregularOutlineMm(dims, { points: [...points] });
  return !polygonSelfIntersects(mm);
}

export function moveOutlinePoint(
  outline: RepairOutline,
  dims: RepairDimensions,
  index: number,
  next: NormalizedPoint,
): RepairOutline | null {
  if (index < 0 || index >= outline.points.length) return null;
  const points = outline.points.map((p, i) =>
    i === index ? { x: clamp01(next.x), y: clamp01(next.y) } : p,
  );
  if (!isValidOutline(points, dims)) return null;
  return { points };
}

export function deleteOutlinePoint(
  outline: RepairOutline,
  dims: RepairDimensions,
  index: number,
): RepairOutline | null {
  if (outline.points.length <= IRREGULAR_MIN_POINTS) return null;
  if (index < 0 || index >= outline.points.length) return null;
  const points = outline.points.filter((_, i) => i !== index);
  if (!isValidOutline(points, dims)) return null;
  return { points };
}

/**
 * Insert a point on edge between index and index+1 at the given normalized position.
 */
export function insertOutlinePointOnEdge(
  outline: RepairOutline,
  dims: RepairDimensions,
  edgeIndex: number,
  at: NormalizedPoint,
): RepairOutline | null {
  if (outline.points.length >= IRREGULAR_MAX_POINTS) return null;
  const n = outline.points.length;
  if (n < 2) return null;
  const i = ((edgeIndex % n) + n) % n;
  const points = [
    ...outline.points.slice(0, i + 1),
    { x: clamp01(at.x), y: clamp01(at.y) },
    ...outline.points.slice(i + 1),
  ];
  if (!isValidOutline(points, dims)) return null;
  return { points };
}

/** Nearest edge index and projected point for a tap in normalized space. */
export function nearestOutlineEdge(
  outline: RepairOutline,
  point: NormalizedPoint,
): { edgeIndex: number; at: NormalizedPoint; dist: number } | null {
  const pts = outline.points;
  const n = pts.length;
  if (n < 2) return null;
  let best: { edgeIndex: number; at: NormalizedPoint; dist: number } | null =
    null;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq : 0;
    t = Math.max(0.05, Math.min(0.95, t));
    const at = { x: a.x + t * dx, y: a.y + t * dy };
    const dist = Math.hypot(point.x - at.x, point.y - at.y);
    if (!best || dist < best.dist) best = { edgeIndex: i, at, dist };
  }
  return best;
}
