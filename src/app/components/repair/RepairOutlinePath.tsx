import type { PointMm } from "../../domain/repair/types";
import type { RepairSvgProjection } from "../../presentation/repairSvg";

/** Closed outline path for a repair plan. */
export function RepairOutlinePath({
  points,
  projection,
  className,
  fill = "var(--semantic-surface-muted, rgba(120,120,120,0.12))",
  stroke = "var(--semantic-text-primary)",
  strokeWidth = 2,
}: {
  points: readonly PointMm[];
  projection: RepairSvgProjection;
  className?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  const d = projection.outlinePath(points);
  if (!d) return null;
  return (
    <path
      className={className}
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}
