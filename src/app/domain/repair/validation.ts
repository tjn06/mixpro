/**
 * Repair hole input validation (geometry only).
 */

import {
  IRREGULAR_MAX_POINTS,
  IRREGULAR_MIN_POINTS,
} from "./constants";
import { measuredDepthSamples } from "./depthSamples";
import { buildOutlineMm } from "./outline";
import {
  polygonAreaMm2,
  polygonSelfIntersects,
} from "./polygon";
import type { RepairHole, RepairHoleValidation } from "./types";

export function validateRepairHole(hole: RepairHole): RepairHoleValidation {
  const issues: RepairHoleValidation["issues"] = [];
  const { lengthMm, widthMm } = hole.dimensions;

  if (!(lengthMm > 0) || !(widthMm > 0)) {
    issues.push("NON_POSITIVE_DIMENSION");
  }

  if (hole.shapeType === "IRREGULAR") {
    const n = hole.outline.points.length;
    if (n < IRREGULAR_MIN_POINTS) issues.push("TOO_FEW_OUTLINE_POINTS");
    if (n > IRREGULAR_MAX_POINTS) issues.push("TOO_MANY_OUTLINE_POINTS");
    for (const p of hole.outline.points) {
      if (
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 0 ||
        p.x > 1 ||
        p.y < 0 ||
        p.y > 1
      ) {
        issues.push("OUTLINE_POINT_OUT_OF_BOUNDS");
        break;
      }
    }
    if (issues.length === 0 || !issues.includes("TOO_FEW_OUTLINE_POINTS")) {
      const outlineMm = buildOutlineMm(
        hole.shapeType,
        hole.dimensions,
        hole.outline,
      );
      if (polygonSelfIntersects(outlineMm)) {
        issues.push("SELF_INTERSECTING_OUTLINE");
      } else if (polygonAreaMm2(outlineMm) <= 0) {
        issues.push("DEGENERATE_OUTLINE");
      }
    }
  }

  const measured = measuredDepthSamples(hole.depthSamples);
  if (measured.length === 0) {
    issues.push("NO_DEPTH_SAMPLES");
  }
  for (const s of hole.depthSamples) {
    if (s.depthMm == null) continue;
    if (!Number.isFinite(s.depthMm) || s.depthMm < 0) {
      issues.push("INVALID_DEPTH");
      break;
    }
  }

  return { ok: issues.length === 0, issues };
}
