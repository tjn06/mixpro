import { useMemo } from "react";
import { formatRepairMm } from "../../domain/repair/format";
import type { RepairHole } from "../../domain/repair/types";
import type { RepairSvgProjection } from "../../presentation/repairSvg";

/** Subtle length/width (or diameter) labels drawn around the plan outline. */
export function RepairFigureLabels({
  hole,
  projection,
}: {
  hole: RepairHole;
  projection: RepairSvgProjection;
}) {
  const isCircle = useMemo(
    () =>
      hole.shapeType === "OVAL" &&
      Math.abs(hole.dimensions.lengthMm - hole.dimensions.widthMm) < 0.5,
    [hole.dimensions.lengthMm, hole.dimensions.widthMm, hole.shapeType],
  );

  const { lengthMm, widthMm } = hole.dimensions;
  const topY = projection.toSvgY(0);
  const bottomY = projection.toSvgY(widthMm);
  const leftX = projection.toSvgX(0);
  const midX = (leftX + projection.toSvgX(lengthMm)) / 2;
  const midY = (topY + bottomY) / 2;
  // Keep labels clear of edge fall stations (markers sit on the outline).
  const sideGap = Math.max(18, projection.pad * 0.55);

  return (
    <g className="repair-figure-labels" style={{ pointerEvents: "none" }}>
      <text
        className="repair-figure-labels__side"
        x={midX}
        y={topY - sideGap}
        textAnchor="middle"
        dominantBaseline="auto"
      >
        {formatRepairMm(lengthMm)}
      </text>
      {!isCircle ? (
        <text
          className="repair-figure-labels__side"
          x={leftX - sideGap}
          y={midY}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(-90 ${leftX - sideGap} ${midY})`}
        >
          {formatRepairMm(widthMm)}
        </text>
      ) : null}
    </g>
  );
}
