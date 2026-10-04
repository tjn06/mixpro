/**
 * RepairGeometryModel — plan geometry + depth field → expected cavity volume.
 * Independent of material / bucket / SafeFill.
 */

import {
  GRID_MAX_CELLS_PER_AXIS,
  GRID_MIN_CELLS_PER_AXIS,
  GRID_TARGET_CELLS_LONG_AXIS,
} from "./constants";
import { measuredDepthSamples } from "./depthSamples";
import { edgeDepthFactor, resolveEdgeProfile } from "./edge";
import { createIdwInterpolator } from "./interpolation";
import { analyticPlanAreaMm2, buildOutlineMm } from "./outline";
import { distanceToPolygonEdgeMm, pointInPolygon } from "./polygon";
import type {
  RepairGeometryAssumptions,
  RepairHole,
} from "./types";
import { mm3ToLiters } from "./units";
import { validateRepairHole } from "./validation";

export type GeometryExpectedResult = {
  expectedLiters: number;
  planAreaMm2: number;
  assumptions: RepairGeometryAssumptions;
};

function gridAxes(lengthMm: number, widthMm: number): {
  nx: number;
  ny: number;
  cellW: number;
  cellH: number;
} {
  const long = Math.max(lengthMm, widthMm);
  const short = Math.min(lengthMm, widthMm);
  const longCells = Math.max(
    GRID_MIN_CELLS_PER_AXIS,
    Math.min(GRID_MAX_CELLS_PER_AXIS, GRID_TARGET_CELLS_LONG_AXIS),
  );
  const shortCells = Math.max(
    GRID_MIN_CELLS_PER_AXIS,
    Math.min(
      GRID_MAX_CELLS_PER_AXIS,
      Math.round(longCells * (short / Math.max(long, 1e-9))),
    ),
  );
  const nx = lengthMm >= widthMm ? longCells : shortCells;
  const ny = lengthMm >= widthMm ? shortCells : longCells;
  return {
    nx,
    ny,
    cellW: lengthMm / nx,
    cellH: widthMm / ny,
  };
}

/**
 * Expected cavity volume from measured depths + edge profile.
 * Returns null when validation fails (caller maps to UI messages later).
 */
export function estimateRepairGeometryExpected(
  hole: RepairHole,
): GeometryExpectedResult | null {
  const validation = validateRepairHole(hole);
  if (!validation.ok) return null;

  const dims = hole.dimensions;
  const outlineMm = buildOutlineMm(hole.shapeType, dims, hole.outline);
  const planAreaMm2 = analyticPlanAreaMm2(hole.shapeType, dims, outlineMm);
  const edge = resolveEdgeProfile(hole.edgeProfile, dims, hole.edgeInsetMm);
  const measured = measuredDepthSamples(hole.depthSamples);
  const interpolator = createIdwInterpolator(
    measured.map((s) => ({
      xMm: s.xMm,
      yMm: s.yMm,
      depthMm: s.depthMm as number,
    })),
  );

  const { nx, ny, cellW, cellH } = gridAxes(dims.lengthMm, dims.widthMm);
  const cellArea = cellW * cellH;
  let volumeMm3 = 0;
  let cellsUsed = 0;

  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const center = {
        xMm: (ix + 0.5) * cellW,
        yMm: (iy + 0.5) * cellH,
      };
      if (!pointInPolygon(center, outlineMm)) continue;

      const rawDepth = interpolator.sampleAt(center);
      const distEdge = distanceToPolygonEdgeMm(center, outlineMm);
      const factor = edgeDepthFactor(distEdge, edge.resolved, edge.insetMm);
      const depth = Math.max(0, rawDepth * factor);
      volumeMm3 += cellArea * depth;
      cellsUsed += 1;
    }
  }

  /**
   * For UNIFORM + identical depths on analytic shapes, scale the grid volume
   * so area×depth is exact (grid staircasing would otherwise leave a tiny gap
   * on ovals / polygons). When depths vary or edge is sloped, keep raw grid sum.
   */
  const depths = measured.map((s) => s.depthMm as number);
  const allEqual = depths.every((d) => Math.abs(d - depths[0]!) < 1e-9);
  if (
    edge.resolved === "UNIFORM" &&
    allEqual &&
    (hole.shapeType === "RECTANGLE" || hole.shapeType === "OVAL")
  ) {
    volumeMm3 = planAreaMm2 * depths[0]!;
  }

  const assumptions: RepairGeometryAssumptions = {
    edgeModeRequested: edge.requested,
    edgeModeResolved: edge.resolved,
    edgeInsetMm: edge.insetMm,
    sampleCount: hole.depthSamples.length,
    measuredCount: measured.length,
    recommendedCount: hole.depthSamples.filter((s) => s.depthMm == null).length,
    gridCellsUsed: cellsUsed,
    shapeType: hole.shapeType,
    planAreaMm2,
    interpolation: "IDW",
    flatBottom: hole.flatBottom === true,
  };

  return {
    expectedLiters: mm3ToLiters(volumeMm3),
    planAreaMm2,
    assumptions,
  };
}
