import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatRepairDepthLabel } from "../../domain/repair/format";
import { measuredDepthSamples } from "../../domain/repair/depthSamples";
import { buildOutlineMm } from "../../domain/repair/outline";
import { insetOutlineMm } from "../../domain/repair/insetOutline";
import type { FallAxis, RepairHole } from "../../domain/repair/types";
import { edgeCoverInsetMm } from "./RepairEdgeCoverLayer";

type CoverSide = "FRONT" | "RIGHT" | "BACK" | "LEFT";

type Vec3 = { x: number; y: number; z: number };
type Vec2 = { x: number; y: number };

const COVER_ORDER: CoverSide[] = ["FRONT", "RIGHT", "BACK", "LEFT"];

function depthAtMm(hole: RepairHole, xMm: number, yMm: number): number {
  const measured = measuredDepthSamples(hole.depthSamples);
  if (measured.length === 0) return 0;
  if (measured.length === 1) return measured[0]!.depthMm as number;

  let wSum = 0;
  let dSum = 0;
  for (const s of measured) {
    const dist = Math.hypot(s.xMm - xMm, s.yMm - yMm);
    if (dist < 1e-6) return s.depthMm as number;
    const w = 1 / (dist * dist);
    wSum += w;
    dSum += w * (s.depthMm as number);
  }
  return dSum / wSum;
}

function rotatePlan(
  xMm: number,
  yMm: number,
  lengthMm: number,
  widthMm: number,
  cover: CoverSide,
): { x: number; z: number; spanX: number; spanZ: number } {
  switch (cover) {
    case "FRONT":
      return { x: xMm, z: yMm, spanX: lengthMm, spanZ: widthMm };
    case "RIGHT":
      return { x: yMm, z: lengthMm - xMm, spanX: widthMm, spanZ: lengthMm };
    case "BACK":
      return {
        x: lengthMm - xMm,
        z: widthMm - yMm,
        spanX: lengthMm,
        spanZ: widthMm,
      };
    case "LEFT":
      return { x: widthMm - yMm, z: xMm, spanX: widthMm, spanZ: lengthMm };
  }
}

function toIso(p: Vec3, scale: number): Vec2 {
  return {
    x: (p.x - p.z) * scale * 0.866,
    y: p.y * scale * 0.55 + (p.x + p.z) * scale * 0.5,
  };
}

function pathFrom(pts: readonly Vec2[]): string {
  if (pts.length === 0) return "";
  return (
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ") + " Z"
  );
}

/** Isometric cavity: edge-cover bevel + selectable depth points. */
export function RepairSlopeIsoView({
  hole,
  selectedId = null,
  onSelect,
  onChangeDepth,
}: {
  hole: RepairHole;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onChangeDepth?: (id: string, depthMm: number) => void;
}) {
  const { t } = useTranslation("common");
  const [cover, setCover] = useState<CoverSide>("FRONT");
  const dragRef = useRef<{
    id: string;
    startClientY: number;
    startDepth: number;
    mmPerPx: number;
  } | null>(null);

  const { lengthMm, widthMm } = hole.dimensions;
  const fallAxis: FallAxis = hole.fallAxis ?? "LENGTH";
  const coverInset = edgeCoverInsetMm(hole);

  const drawing = useMemo(() => {
    const maxPlan = Math.max(lengthMm, widthMm, 1);
    const outerPlan = buildOutlineMm(
      hole.shapeType,
      hole.dimensions,
      hole.outline,
    );
    const samplePts =
      outerPlan.length <= 8
        ? outerPlan
        : [0, 0.25, 0.5, 0.75].map((t) => {
            const i = Math.floor(t * outerPlan.length) % outerPlan.length;
            return outerPlan[i]!;
          });

    const sampleDepths = [
      ...samplePts.map((c) => depthAtMm(hole, c.xMm, c.yMm)),
      ...hole.depthSamples.map((s) => s.depthMm ?? 0),
    ];
    const maxDepth = Math.max(1, ...sampleDepths, 40);
    const depthScale = (0.35 * maxPlan) / maxDepth;
    const innerPlan =
      coverInset > 0 ? insetOutlineMm(outerPlan, coverInset) : null;

    const span = rotatePlan(0, 0, lengthMm, widthMm, cover);
    const scale = 180 / Math.max(span.spanX + span.spanZ, 1);
    const mmPerIsoY = 1 / Math.max(depthScale * scale * 0.55, 1e-6);

    const projectRing = (
      ring: readonly { xMm: number; yMm: number }[],
      depthFn: (x: number, y: number) => number,
    ): Vec2[] =>
      ring.map((c) => {
        const r = rotatePlan(c.xMm, c.yMm, lengthMm, widthMm, cover);
        const d = depthFn(c.xMm, c.yMm);
        return toIso({ x: r.x, y: d * depthScale, z: r.z }, scale);
      });

    const top2 = projectRing(outerPlan, () => 0);
    const floorRing = innerPlan ?? outerPlan;
    const bot2 = projectRing(floorRing, (x, y) => depthAtMm(hole, x, y));

    const bevelFaces: Vec2[][] = [];
    if (innerPlan && innerPlan.length === outerPlan.length) {
      for (let i = 0; i < outerPlan.length; i++) {
        const j = (i + 1) % outerPlan.length;
        const o0 = outerPlan[i]!;
        const o1 = outerPlan[j]!;
        const i0 = innerPlan[i]!;
        const i1 = innerPlan[j]!;
        const r = (p: { xMm: number; yMm: number }, d: number) => {
          const pr = rotatePlan(p.xMm, p.yMm, lengthMm, widthMm, cover);
          return toIso({ x: pr.x, y: d * depthScale, z: pr.z }, scale);
        };
        bevelFaces.push([
          r(o0, 0),
          r(o1, 0),
          r(i1, depthAtMm(hole, i1.xMm, i1.yMm)),
          r(i0, depthAtMm(hole, i0.xMm, i0.yMm)),
        ]);
      }
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const absorb = (pts: readonly Vec2[]) => {
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    };
    absorb(top2);
    absorb(bot2);
    for (const f of bevelFaces) absorb(f);

    const markers = hole.depthSamples.map((s, index) => {
      const r = rotatePlan(s.xMm, s.yMm, lengthMm, widthMm, cover);
      const depth = s.depthMm ?? 0;
      const floor = toIso({ x: r.x, y: depth * depthScale, z: r.z }, scale);
      const rim = toIso({ x: r.x, y: 0, z: r.z }, scale);
      absorb([floor, rim]);
      return { id: s.id, index, depthMm: s.depthMm, floor, rim };
    });

    const pad = 20;
    const ox = -minX + pad;
    const oy = -minY + pad;
    const shift = (p: Vec2): Vec2 => ({ x: p.x + ox, y: p.y + oy });

    const midY = widthMm * 0.5;
    const midX = lengthMm * 0.5;
    const startPlan =
      fallAxis === "LENGTH"
        ? { xMm: 0, yMm: midY }
        : { xMm: midX, yMm: 0 };
    const endPlan =
      fallAxis === "LENGTH"
        ? { xMm: lengthMm, yMm: midY }
        : { xMm: midX, yMm: widthMm };
    const sR = rotatePlan(startPlan.xMm, startPlan.yMm, lengthMm, widthMm, cover);
    const eR = rotatePlan(endPlan.xMm, endPlan.yMm, lengthMm, widthMm, cover);
    const sD = depthAtMm(hole, startPlan.xMm, startPlan.yMm) * depthScale;
    const eD = depthAtMm(hole, endPlan.xMm, endPlan.yMm) * depthScale;

    const wallCount = Math.min(top2.length, bot2.length, 4);
    return {
      viewW: Math.max(1, maxX - minX + pad * 2),
      viewH: Math.max(1, maxY - minY + pad * 2),
      top: top2.map(shift),
      bot: bot2.map(shift),
      bevels: bevelFaces.map((f) => f.map(shift)),
      walls:
        coverInset > 0
          ? []
          : Array.from({ length: wallCount }, (_, i) => [
              shift(top2[i]!),
              shift(bot2[i]!),
            ] as const),
      arrowStart: shift(toIso({ x: sR.x, y: sD, z: sR.z }, scale)),
      arrowEnd: shift(toIso({ x: eR.x, y: eD, z: eR.z }, scale)),
      markers: markers.map((m) => ({
        ...m,
        floor: shift(m.floor),
        rim: shift(m.rim),
      })),
      mmPerIsoY,
      hasCover: coverInset > 0,
      hasDepth: measuredDepthSamples(hole.depthSamples).length > 0,
      showFallArrow: hole.slopeEnabled,
    };
  }, [hole, cover, lengthMm, widthMm, fallAxis, coverInset]);

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div className="repair-slope-iso">
      <div className="repair-slope-iso__toolbar">
        <div
          className="repair-segmented repair-segmented--compact"
          role="radiogroup"
          aria-label={t("repair.slopeIso.cover")}
        >
          {COVER_ORDER.map((side) => (
            <button
              key={side}
              type="button"
              role="radio"
              aria-checked={cover === side}
              className={`repair-segmented__btn${
                cover === side ? " is-active" : ""
              }`}
              onClick={() => setCover(side)}
            >
              {t(`repair.slopeIso.side.${side.toLowerCase()}`)}
            </button>
          ))}
        </div>
      </div>

      <svg
        className="repair-slope-iso__svg"
        viewBox={`0 0 ${drawing.viewW} ${drawing.viewH}`}
        role="img"
        aria-label={t("repair.slopeIso.aria")}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          if (!drag || !onChangeDepth) return;
          const dy = e.clientY - drag.startClientY;
          const rect = e.currentTarget.getBoundingClientRect();
          const isoPerPx = drawing.viewH / Math.max(rect.height, 1);
          const next = Math.max(
            0,
            Math.round(drag.startDepth + dy * isoPerPx * drag.mmPerPx),
          );
          onChangeDepth(drag.id, next);
        }}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <path className="repair-slope-iso__floor" d={pathFrom(drawing.bot)} />
        {drawing.bevels.map((face, i) => (
          <path
            key={`b-${i}`}
            className="repair-slope-iso__bevel"
            d={pathFrom(face)}
          />
        ))}
        {drawing.walls.map(([a, b], i) => (
          <line
            key={`w-${i}`}
            className="repair-slope-iso__wall"
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
          />
        ))}
        <path className="repair-slope-iso__rim" d={pathFrom(drawing.top)} />

        {drawing.showFallArrow && drawing.hasDepth ? (
          <g className="repair-slope-iso__fall">
            <line
              x1={drawing.arrowStart.x}
              y1={drawing.arrowStart.y}
              x2={drawing.arrowEnd.x}
              y2={drawing.arrowEnd.y}
              markerEnd="url(#repair-slope-iso-arrow)"
            />
          </g>
        ) : null}

        {drawing.markers
          // Selected last so it paints above neighbors when discs overlap.
          .slice()
          .sort((a, b) => {
            if (a.id === selectedId) return 1;
            if (b.id === selectedId) return -1;
            return a.index - b.index;
          })
          .map((m) => {
          const selected = m.id === selectedId;
          const measured = m.depthMm != null;
          const r = selected ? 9 : 7;
          // Best practice: only the active point shows mm — avoids stacked labels.
          const showDepthLabel = selected && measured;
          return (
            <g
              key={m.id}
              className={`repair-slope-iso__marker${
                selected ? " is-selected" : ""
              }`}
              style={{
                cursor: onSelect || onChangeDepth ? "pointer" : "default",
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture?.(e.pointerId);
                onSelect?.(m.id);
                if (!onChangeDepth) return;
                dragRef.current = {
                  id: m.id,
                  startClientY: e.clientY,
                  startDepth: m.depthMm ?? 0,
                  mmPerPx: drawing.mmPerIsoY,
                };
              }}
            >
              <line
                className="repair-slope-iso__drop"
                x1={m.rim.x}
                y1={m.rim.y}
                x2={m.floor.x}
                y2={m.floor.y}
              />
              <circle
                className="repair-slope-iso__disc"
                cx={m.floor.x}
                cy={m.floor.y}
                r={r}
              />
              <text
                className="repair-slope-iso__index"
                x={m.floor.x}
                y={m.floor.y}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {m.index + 1}
              </text>
              {showDepthLabel ? (
                <g className="repair-slope-iso__callout">
                  <rect
                    className="repair-slope-iso__callout-bg"
                    x={m.floor.x - 22}
                    y={m.floor.y + r + 3}
                    width={44}
                    height={14}
                    rx={7}
                  />
                  <text
                    className="repair-slope-iso__depth"
                    x={m.floor.x}
                    y={m.floor.y + r + 10}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {formatRepairDepthLabel(m.depthMm as number)} mm
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}

        <defs>
          <marker
            id="repair-slope-iso-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              className="repair-slope-iso__arrow-head"
            />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
