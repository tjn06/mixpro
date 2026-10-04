import { useMemo } from "react";
import { buildOutlineMm } from "../../domain/repair/outline";
import type { RepairHole } from "../../domain/repair/types";
import { createRepairSvgProjection } from "../../presentation/repairSvg";
import { DepthMarkerLayer } from "./DepthMarkerLayer";
import { RepairEdgeCoverLayer } from "./RepairEdgeCoverLayer";
import { RepairFigureLabels } from "./RepairFigureLabels";
import { RepairFigureStats } from "./RepairFigureStats";
import { RepairOutlinePath } from "./RepairOutlinePath";

/** Read-only / overview miniature of a hole plan (+ optional depth markers). */
export function RepairPlanView({
  hole,
  showDepthMarkers = false,
  selectedDepthId = null,
  onSelectDepth,
  compact = false,
  showLabels = false,
}: {
  hole: RepairHole;
  showDepthMarkers?: boolean;
  selectedDepthId?: string | null;
  onSelectDepth?: (id: string) => void;
  compact?: boolean;
  /** Side dimensions in-figure + area/volume strip below (off for compact thumbs). */
  showLabels?: boolean;
}) {
  const projection = useMemo(
    () =>
      createRepairSvgProjection(hole.dimensions, {
        viewSize: compact ? 140 : 320,
        pad: compact ? 10 : showLabels ? 40 : 18,
      }),
    [hole.dimensions, compact, showLabels],
  );

  const outline = useMemo(
    () => buildOutlineMm(hole.shapeType, hole.dimensions, hole.outline),
    [hole.shapeType, hole.dimensions, hole.outline],
  );

  const svg = (
    <svg
      className={`repair-plan-view${compact ? " repair-plan-view--compact" : ""}`}
      viewBox={`0 0 ${projection.viewW} ${projection.viewH}`}
      role="img"
      aria-hidden={compact}
    >
      <rect
        x={0}
        y={0}
        width={projection.viewW}
        height={projection.viewH}
        fill="transparent"
      />
      <RepairOutlinePath points={outline} projection={projection} />
      {!compact ? (
        <RepairEdgeCoverLayer
          outline={outline}
          hole={hole}
          projection={projection}
        />
      ) : null}
      {showLabels ? (
        <RepairFigureLabels hole={hole} projection={projection} />
      ) : null}
      {showDepthMarkers ? (
        <DepthMarkerLayer
          samples={hole.depthSamples}
          projection={projection}
          selectedId={selectedDepthId}
          onSelect={onSelectDepth}
          showDepthValues={showLabels}
        />
      ) : null}
    </svg>
  );

  if (!showLabels || compact) return svg;

  return (
    <div className="repair-plan-block">
      {svg}
      <RepairFigureStats hole={hole} />
    </div>
  );
}
