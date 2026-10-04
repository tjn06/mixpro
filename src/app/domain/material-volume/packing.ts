import {
  OPEN_AGGREGATE_R_FULL,
  OPEN_AGGREGATE_R_START,
  PACKING_CALIBRATION_POINTS,
} from "./constants";
import type { MaterialProfile } from "./types";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Interpolate packing correction from calibration shape points.
 * Returns a dimensionless residual fraction (e.g. 0.08 = +8%).
 */
export function interpolatePackingCalibration(r: number): number {
  const points = PACKING_CALIBRATION_POINTS;
  if (points.length === 0) return 0;
  if (r <= points[0]!.r) return points[0]!.correction;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const next = points[i]!;
    if (r <= next.r) {
      const t = (r - prev.r) / (next.r - prev.r || 1);
      // Smooth the segment so R breakpoints are not cliffs.
      const s = smoothstep(0, 1, t);
      return lerp(prev.correction, next.correction, s);
    }
  }
  return points[points.length - 1]!.correction;
}

/**
 * Open-structure blend factor for extreme dry mortars (R > ~15–20).
 * 0 = still dense-mortar curve; 1 = full open aggregate.
 */
export function openAggregateBlend(r: number): number {
  return smoothstep(OPEN_AGGREGATE_R_START, OPEN_AGGREGATE_R_FULL, r);
}

/**
 * Packing correction for resting volume:
 *   expectedRest ≈ compact * (1 + packingCorrection)
 *
 * For high R, blend toward loose bulk aggregate behavior rather than
 * extrapolating the dense-mortar curve indefinitely.
 */
export function estimatePackingCorrection(
  sandToEpoxyRatio: number,
  aggregateProfile: MaterialProfile | null,
  options?: {
    /** Loose bulk aggregate volume (L). */
    aggregateLooseBulkVolumeL?: number;
    /** Compact physical volume (L). */
    compactPhysicalVolumeL?: number;
  },
): number {
  if (!(sandToEpoxyRatio > 0) || !aggregateProfile) return 0;

  const base = interpolatePackingCalibration(sandToEpoxyRatio);
  const packingMod = aggregateProfile.packingModifier ?? 1;
  let correction = base * packingMod;

  const blend = openAggregateBlend(sandToEpoxyRatio);
  if (blend > 0) {
    const compact = options?.compactPhysicalVolumeL ?? 0;
    const loose = options?.aggregateLooseBulkVolumeL ?? 0;
    // Target correction that would move compact toward loose bulk (capped).
    let openTarget = 0.25;
    if (compact > 0 && loose > compact) {
      openTarget = Math.min(0.45, (loose / compact) - 1);
    }
    correction = lerp(correction, openTarget * packingMod, blend);
  }

  return Math.max(0, correction);
}
