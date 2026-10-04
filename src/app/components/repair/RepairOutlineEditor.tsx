import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IRREGULAR_MAX_POINTS,
  IRREGULAR_MIN_POINTS,
} from "../../domain/repair/constants";
import {
  deleteOutlinePoint,
  insertOutlinePointOnEdge,
  moveOutlinePoint,
  nearestOutlineEdge,
} from "../../domain/repair/outlineEdit";
import { buildOutlineMm } from "../../domain/repair/outline";
import type {
  NormalizedPoint,
  RepairDimensions,
  RepairHole,
  RepairOutline,
} from "../../domain/repair/types";
import { createRepairSvgProjection } from "../../presentation/repairSvg";
import { useSettingsStore } from "../../settings/store";
import { RepairFigureLabels } from "./RepairFigureLabels";
import { RepairFigureStats } from "./RepairFigureStats";
import { RepairOutlineHelperDemo } from "./RepairOutlineHelperDemo";
import { RepairOutlinePath } from "./RepairOutlinePath";

type OutlineHistory = RepairOutline[];

/**
 * Interactive irregular outline editor.
 * Drag points · tap edge to insert · select + delete · undo.
 */
export function RepairOutlineEditor({
  dimensions,
  outline,
  onChange,
  holeForLabels,
}: {
  dimensions: RepairDimensions;
  outline: RepairOutline;
  onChange: (next: RepairOutline) => void;
  /** When set, draws subtle side / area labels using live outline. */
  holeForLabels?: RepairHole;
}) {
  const { t } = useTranslation("common");
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<OutlineHistory>([]);
  const dragRef = useRef<{ index: number } | null>(null);
  const helperOn = useSettingsStore((s) => s.helperAnimations.outlineEdit);
  const setHelperAnimation = useSettingsStore((s) => s.setHelperAnimation);
  const [showcaseActive, setShowcaseActive] = useState(helperOn);
  const endShowcase = useCallback(() => setShowcaseActive(false), []);

  useEffect(() => {
    if (helperOn) setShowcaseActive(true);
    else setShowcaseActive(false);
  }, [helperOn]);

  const projection = useMemo(
    () => createRepairSvgProjection(dimensions, { viewSize: 320, pad: 28 }),
    [dimensions],
  );

  const handleSvgPoints = useMemo(
    () =>
      outline.points.map((p) => ({
        x: projection.toSvgX(p.x * dimensions.lengthMm),
        y: projection.toSvgY(p.y * dimensions.widthMm),
      })),
    [outline.points, projection, dimensions],
  );

  const labelHole = useMemo((): RepairHole | null => {
    if (!holeForLabels) return null;
    return { ...holeForLabels, dimensions, outline, shapeType: "IRREGULAR" };
  }, [holeForLabels, dimensions, outline]);

  const outlineMm = useMemo(
    () => buildOutlineMm("IRREGULAR", dimensions, outline),
    [dimensions, outline],
  );

  const pushHistory = useCallback((prev: RepairOutline) => {
    setHistory((h) => [...h.slice(-19), prev]);
  }, []);

  const commit = useCallback(
    (next: RepairOutline | null, prev: RepairOutline) => {
      if (!next) return;
      pushHistory(prev);
      onChange(next);
    },
    [onChange, pushHistory],
  );

  const clientToNormalized = useCallback(
    (clientX: number, clientY: number): NormalizedPoint | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const svgX =
        ((clientX - rect.left) / rect.width) * projection.viewW;
      const svgY =
        ((clientY - rect.top) / rect.height) * projection.viewH;
      const xMm = projection.toModelX(svgX);
      const yMm = projection.toModelY(svgY);
      return {
        x: dimensions.lengthMm > 0 ? xMm / dimensions.lengthMm : 0,
        y: dimensions.widthMm > 0 ? yMm / dimensions.widthMm : 0,
      };
    },
    [dimensions, projection],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const n = clientToNormalized(e.clientX, e.clientY);
      if (!n) return;
      const next = moveOutlinePoint(
        outline,
        dimensions,
        dragRef.current.index,
        n,
      );
      if (next) onChange(next);
    },
    [clientToNormalized, dimensions, onChange, outline],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const canDelete =
    selectedIndex != null && outline.points.length > IRREGULAR_MIN_POINTS;
  const canInsert = outline.points.length < IRREGULAR_MAX_POINTS;

  return (
    <div className="repair-outline-editor">
      <div className="repair-plan-block">
        <div className="repair-plan-block__canvas">
          <svg
            ref={svgRef}
            className="repair-plan-view"
            viewBox={`0 0 ${projection.viewW} ${projection.viewH}`}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            onPointerDown={(e) => {
              if (
                e.target !== e.currentTarget &&
                (e.target as Element).tagName !== "path"
              ) {
                return;
              }
              if (!canInsert) return;
              const n = clientToNormalized(e.clientX, e.clientY);
              if (!n) return;
              const nearest = nearestOutlineEdge(outline, n);
              if (!nearest || nearest.dist > 0.08) return;
              const next = insertOutlinePointOnEdge(
                outline,
                dimensions,
                nearest.edgeIndex,
                nearest.at,
              );
              if (next) {
                commit(next, outline);
                setSelectedIndex(nearest.edgeIndex + 1);
              }
            }}
          >
            <RepairOutlinePath points={outlineMm} projection={projection} />
            {labelHole ? (
              <RepairFigureLabels hole={labelHole} projection={projection} />
            ) : null}
            {outline.points.map((p, i) => {
              const x = projection.toSvgX(p.x * dimensions.lengthMm);
              const y = projection.toSvgY(p.y * dimensions.widthMm);
              const selected = i === selectedIndex;
              return (
                <circle
                  key={`pt-${i}`}
                  cx={x}
                  cy={y}
                  r={selected ? 10 : 8}
                  fill={
                    selected
                      ? "var(--semantic-text-primary)"
                      : "var(--semantic-surface-app, #fff)"
                  }
                  stroke="var(--semantic-text-primary)"
                  strokeWidth={2}
                  style={{ cursor: "grab", touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setSelectedIndex(i);
                    pushHistory(outline);
                    dragRef.current = { index: i };
                  }}
                />
              );
            })}
          </svg>
          {showcaseActive ? (
            <RepairOutlineHelperDemo
              viewW={projection.viewW}
              viewH={projection.viewH}
              points={handleSvgPoints}
              onDone={endShowcase}
            />
          ) : null}
        </div>
        {labelHole ? <RepairFigureStats hole={labelHole} /> : null}
      </div>

      <div className="repair-outline-editor__actions">
        <button
          type="button"
          className="repair-chip-btn"
          disabled={history.length === 0}
          onClick={() => {
            const prev = history[history.length - 1];
            if (!prev) return;
            setHistory((h) => h.slice(0, -1));
            onChange(prev);
            setSelectedIndex(null);
          }}
        >
          {t("repair.undo")}
        </button>
        <button
          type="button"
          className="repair-chip-btn"
          disabled={!canDelete}
          onClick={() => {
            if (selectedIndex == null) return;
            const next = deleteOutlinePoint(outline, dimensions, selectedIndex);
            if (next) {
              commit(next, outline);
              setSelectedIndex(null);
            }
          }}
        >
          {t("repair.deletePoint")}
        </button>
        <div className="repair-outline-editor__helper-toggle">
          <span className="repair-outline-editor__helper-label">
            {t("repair.outlineHelper.switchLabel")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={helperOn}
            aria-label={t("repair.outlineHelper.switchAria")}
            className={`repair-switch${helperOn ? " is-on" : ""}`}
            onClick={() => setHelperAnimation("outlineEdit", !helperOn)}
          >
            <span className="repair-switch__thumb" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
