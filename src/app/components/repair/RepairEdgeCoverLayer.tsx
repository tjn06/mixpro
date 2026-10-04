import { useMemo } from "react";
import { computeEdgeInsetMm, resolveEdgeProfile } from "../../domain/repair/edge";
import { insetOutlineMm } from "../../domain/repair/insetOutline";
import type { PointMm, RepairHole } from "../../domain/repair/types";
import type { RepairSvgProjection } from "../../presentation/repairSvg";

/** Resolved cover inset when edge mode is SLOPED; else 0. */
export function edgeCoverInsetMm(hole: RepairHole): number {
  const edge = resolveEdgeProfile(
    hole.edgeProfile,
    hole.dimensions,
    hole.edgeInsetMm,
  );
  if (edge.resolved !== "SLOPED") return 0;
  return Math.max(
    0,
    hole.edgeInsetMm ?? edge.insetMm ?? computeEdgeInsetMm(hole.dimensions),
  );
}

/**
 * 2D band: outer rim → inner full-depth line at cover distance.
 * Visualization only (editing via Cover distance field).
 */
export function RepairEdgeCoverLayer({
  outline,
  hole,
  projection,
}: {
  outline: readonly PointMm[];
  hole: RepairHole;
  projection: RepairSvgProjection;
}) {
  const insetMm = edgeCoverInsetMm(hole);
  const inner = useMemo(
    () => (insetMm > 0 ? insetOutlineMm(outline, insetMm) : null),
    [outline, insetMm],
  );

  if (!inner || insetMm <= 0) return null;

  const outerD = projection.outlinePath(outline);
  const innerD = projection.outlinePath(inner);
  if (!outerD || !innerD) return null;

  // Even-odd fill between outer and inner = cover band.
  const bandD = `${outerD} ${innerD}`;

  return (
    <g className="repair-edge-cover" style={{ pointerEvents: "none" }}>
      <path
        className="repair-edge-cover__band"
        d={bandD}
        fillRule="evenodd"
      />
      <path
        className="repair-edge-cover__inner"
        d={innerD}
        fill="none"
      />
      <text
        className="repair-edge-cover__label"
        x={projection.toSvgX(hole.dimensions.lengthMm * 0.5)}
        y={projection.toSvgY(Math.min(insetMm * 0.55, hole.dimensions.widthMm * 0.12))}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {Math.round(insetMm)} mm
      </text>
    </g>
  );
}
