import { useCallback, useMemo, useRef } from "react";
import { buildOutlineMm } from "../../domain/repair/outline";
import type { RepairHole } from "../../domain/repair/types";
import { createRepairSvgProjection } from "../../presentation/repairSvg";
import { DepthMarkerLayer } from "./DepthMarkerLayer";
import { RepairEdgeCoverLayer } from "./RepairEdgeCoverLayer";
import { RepairFigureLabels } from "./RepairFigureLabels";
import { RepairFigureStats } from "./RepairFigureStats";
import { RepairOutlinePath } from "./RepairOutlinePath";

/** Depth measurement SVG — select markers; optional drag to reposition. */
export function RepairDepthView({
  hole,
  selectedId,
  onSelect,
  onMoveSample,
}: {
  hole: RepairHole;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveSample?: (id: string, xMm: number, yMm: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragId = useRef<string | null>(null);

  const projection = useMemo(
    () => createRepairSvgProjection(hole.dimensions, { pad: 40 }),
    [hole.dimensions],
  );

  const outline = useMemo(
    () => buildOutlineMm(hole.shapeType, hole.dimensions, hole.outline),
    [hole.shapeType, hole.dimensions, hole.outline],
  );

  const toModel = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const svgX = ((clientX - rect.left) / rect.width) * projection.viewW;
      const svgY = ((clientY - rect.top) / rect.height) * projection.viewH;
      return {
        xMm: projection.toModelX(svgX),
        yMm: projection.toModelY(svgY),
      };
    },
    [projection],
  );

  return (
    <div className="repair-plan-block">
      <svg
        ref={svgRef}
        className="repair-plan-view"
        viewBox={`0 0 ${projection.viewW} ${projection.viewH}`}
        onPointerMove={(e) => {
          if (!dragId.current || !onMoveSample) return;
          const p = toModel(e.clientX, e.clientY);
          if (!p) return;
          onMoveSample(dragId.current, p.xMm, p.yMm);
        }}
        onPointerUp={() => {
          dragId.current = null;
        }}
        onPointerLeave={() => {
          dragId.current = null;
        }}
      >
        <RepairOutlinePath points={outline} projection={projection} />
        <RepairEdgeCoverLayer
          outline={outline}
          hole={hole}
          projection={projection}
        />
        <RepairFigureLabels hole={hole} projection={projection} />
        <DepthMarkerLayer
          samples={hole.depthSamples}
          projection={projection}
          selectedId={selectedId}
          onSelect={(id) => {
            onSelect(id);
            if (onMoveSample) dragId.current = id;
          }}
          showDepthValues
        />
      </svg>
      <RepairFigureStats hole={hole} />
    </div>
  );
}
