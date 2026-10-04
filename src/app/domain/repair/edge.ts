/**
 * Edge profile resolution (Auto / Uniform / Sloped).
 * Thresholds live in constants — not in UI or interpolation.
 */

import {
  AUTO_MIN_MEANINGFUL_INSET_MM,
  AUTO_UNIFORM_MAX_MIN_DIM_MM,
  EDGE_INSET_FRACTION,
  MAX_EDGE_INSET_MM,
} from "./constants";
import type {
  EdgeProfileMode,
  RepairDimensions,
  ResolvedEdgeMode,
} from "./types";

export type ResolvedEdgeProfile = {
  requested: EdgeProfileMode;
  resolved: ResolvedEdgeMode;
  insetMm: number;
};

export function computeEdgeInsetMm(dims: RepairDimensions): number {
  const minDim = Math.min(dims.lengthMm, dims.widthMm);
  if (!(minDim > 0)) return 0;
  return Math.min(MAX_EDGE_INSET_MM, EDGE_INSET_FRACTION * minDim);
}

/**
 * Auto policy (V1 heuristic):
 * - small repair / insufficient inset space → UNIFORM
 * - otherwise → SLOPED
 */
export function resolveAutoEdgeMode(
  dims: RepairDimensions,
  insetMm: number,
): ResolvedEdgeMode {
  const minDim = Math.min(dims.lengthMm, dims.widthMm);
  if (minDim < AUTO_UNIFORM_MAX_MIN_DIM_MM) return "UNIFORM";
  if (insetMm < AUTO_MIN_MEANINGFUL_INSET_MM) return "UNIFORM";
  return "SLOPED";
}

export function resolveEdgeProfile(
  requested: EdgeProfileMode,
  dims: RepairDimensions,
  insetOverrideMm?: number | null,
): ResolvedEdgeProfile {
  const autoInset = computeEdgeInsetMm(dims);
  const insetMm =
    insetOverrideMm != null && Number.isFinite(insetOverrideMm)
      ? Math.max(0, Math.min(MAX_EDGE_INSET_MM, insetOverrideMm))
      : autoInset;
  if (requested === "UNIFORM") {
    return { requested, resolved: "UNIFORM", insetMm };
  }
  if (requested === "SLOPED") {
    return { requested, resolved: "SLOPED", insetMm };
  }
  return {
    requested: "AUTO",
    resolved: resolveAutoEdgeMode(dims, insetMm),
    insetMm,
  };
}

/**
 * Multiplier applied to interpolated interior depth near the perimeter.
 * UNIFORM → 1. SLOPED → linear ramp from 0 at edge to 1 at inset.
 */
export function edgeDepthFactor(
  distanceToEdgeMm: number,
  resolved: ResolvedEdgeMode,
  insetMm: number,
): number {
  if (resolved === "UNIFORM") return 1;
  if (!(insetMm > 0)) return 1;
  return Math.max(0, Math.min(1, distanceToEdgeMm / insetMm));
}
