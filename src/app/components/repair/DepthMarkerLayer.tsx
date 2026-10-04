import { formatRepairDepthLabel } from "../../domain/repair/format";
import type { DepthSample } from "../../domain/repair/types";
import type { RepairSvgProjection } from "../../presentation/repairSvg";

/** Depth sample markers — solid disc so edge stations sit above the outline. */
export function DepthMarkerLayer({
  samples,
  projection,
  selectedId,
  onSelect,
  showDepthValues = false,
}: {
  samples: readonly DepthSample[];
  projection: RepairSvgProjection;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showDepthValues?: boolean;
}) {
  return (
    <g className="repair-depth-markers">
      {samples.map((s, index) => {
        const cx = projection.toSvgX(s.xMm);
        const cy = projection.toSvgY(s.yMm);
        const measured = s.depthMm != null;
        const selected = s.id === selectedId;
        const r = selected ? 12 : 10;
        const depthText = measured
          ? formatRepairDepthLabel(s.depthMm as number)
          : null;
        // Rough pill width for the depth callout under the disc.
        const pillW =
          depthText != null
            ? Math.max(28, depthText.length * 6.2 + 18)
            : 0;

        return (
          <g
            key={s.id}
            className={`repair-depth-marker${measured ? " is-measured" : ""}${
              selected ? " is-selected" : ""
            }`}
            transform={`translate(${cx} ${cy})`}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect?.(s.id);
            }}
            style={{ cursor: onSelect ? "pointer" : "default" }}
          >
            {/* Opaque disc matching plan frame so outline never shows through. */}
            <circle
              className="repair-depth-marker__disc"
              r={r}
              fill="var(--semantic-surface-muted, var(--semantic-surface-app, #1a1a22))"
              stroke="var(--semantic-text-primary)"
              strokeWidth={selected ? 2.25 : 1.75}
            />
            {selected ? (
              <circle
                className="repair-depth-marker__selected-fill"
                r={r - 1.1}
                fill="var(--semantic-text-primary)"
                stroke="none"
              />
            ) : null}
            <text
              className="repair-depth-marker__index"
              textAnchor="middle"
              dominantBaseline="central"
              y={showDepthValues && measured && selected ? -1 : 0}
              fill={
                selected
                  ? "var(--semantic-surface-muted, var(--semantic-surface-app, #1a1a22))"
                  : "var(--semantic-text-primary)"
              }
              style={{ pointerEvents: "none" }}
            >
              {index + 1}
            </text>
            {showDepthValues && measured && depthText != null ? (
              <g
                className="repair-depth-marker__callout"
                transform={`translate(0 ${r + 4})`}
                style={{ pointerEvents: "none" }}
              >
                <rect
                  className="repair-depth-marker__callout-bg"
                  x={-pillW / 2}
                  y={0}
                  width={pillW}
                  height={14}
                  rx={7}
                  ry={7}
                />
                <text
                  className="repair-depth-marker__value"
                  textAnchor="middle"
                  dominantBaseline="central"
                  y={7}
                >
                  <tspan className="repair-depth-marker__value-num">
                    {depthText}
                  </tspan>
                  <tspan className="repair-depth-marker__unit" dx={2}>
                    mm
                  </tspan>
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
