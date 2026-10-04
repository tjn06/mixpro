import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { computeEdgeInsetMm, resolveEdgeProfile } from "../../domain/repair/edge";
import { measuredDepthSamples } from "../../domain/repair/depthSamples";
import type { FallAxis, RepairHole } from "../../domain/repair/types";

/** Depth along the fall axis at normalized t (0=start, 1=end). */
function depthAlongFall(hole: RepairHole, t: number): number {
  const measured = measuredDepthSamples(hole.depthSamples);
  if (measured.length === 0) return 0;
  const { lengthMm, widthMm } = hole.dimensions;
  const fallAxis: FallAxis = hole.fallAxis ?? "LENGTH";
  const xMm = fallAxis === "LENGTH" ? t * lengthMm : lengthMm * 0.5;
  const yMm = fallAxis === "LENGTH" ? widthMm * 0.5 : t * widthMm;

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

/**
 * Side cross-section: floor fall + edge cover inset (visualization only).
 */
export function RepairSlopeSectionView({
  hole,
}: {
  hole: RepairHole;
}) {
  const { t } = useTranslation("common");
  const { lengthMm, widthMm } = hole.dimensions;
  const fallAxis: FallAxis = hole.fallAxis ?? "LENGTH";
  const spanMm = fallAxis === "LENGTH" ? lengthMm : widthMm;

  const edge = resolveEdgeProfile(
    hole.edgeProfile,
    hole.dimensions,
    hole.edgeInsetMm,
  );
  const edgeCoverOn = edge.resolved === "SLOPED";
  const insetMm = edgeCoverOn
    ? Math.max(0, hole.edgeInsetMm ?? edge.insetMm ?? computeEdgeInsetMm(hole.dimensions))
    : 0;

  const drawing = useMemo(() => {
    const W = 280;
    const H = 132;
    const padX = 28;
    const topY = 28;
    const maxDrawDepth = 72;
    const innerW = W - padX * 2;

    const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      t,
      depth: depthAlongFall(hole, t),
    }));
    const maxDepth = Math.max(20, ...samples.map((s) => s.depth), 1);
    const yAt = (depthMm: number) =>
      topY + (depthMm / maxDepth) * maxDrawDepth;
    const xAt = (t: number) => padX + t * innerW;

    // Edge cover: ramp from surface (0) at rim to full floor depth at inset.
    const insetT = spanMm > 0 ? Math.min(0.45, insetMm / spanMm) : 0;
    const floorPts: { x: number; y: number }[] = [];

    if (insetT > 0) {
      floorPts.push({ x: xAt(0), y: topY });
      floorPts.push({ x: xAt(insetT), y: yAt(depthAlongFall(hole, insetT)) });
    } else {
      floorPts.push({ x: xAt(0), y: yAt(depthAlongFall(hole, 0)) });
    }

    for (const s of samples) {
      if (s.t <= insetT + 1e-6 || s.t >= 1 - insetT - 1e-6) continue;
      floorPts.push({ x: xAt(s.t), y: yAt(s.depth) });
    }

    if (insetT > 0) {
      floorPts.push({
        x: xAt(1 - insetT),
        y: yAt(depthAlongFall(hole, 1 - insetT)),
      });
      floorPts.push({ x: xAt(1), y: topY });
    } else {
      floorPts.push({ x: xAt(1), y: yAt(depthAlongFall(hole, 1)) });
    }

    const cavity = [
      { x: xAt(0), y: topY },
      ...floorPts,
      { x: xAt(1), y: topY },
    ];

    const cavityD =
      cavity
        .map(
          (p, i) =>
            `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
        )
        .join(" ") + " Z";

    const floorD = floorPts
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
      )
      .join(" ");

    const startD = depthAlongFall(hole, 0);
    const endD = depthAlongFall(hole, 1);
    const hasDepth = measuredDepthSamples(hole.depthSamples).length > 0;

    return {
      W,
      H,
      topY,
      padX,
      innerW,
      insetT,
      cavityD,
      floorD,
      startD,
      endD,
      hasDepth,
      xAt,
      yAt,
      insetLabelX: xAt(insetT / 2),
      insetBracketY: topY - 10,
    };
  }, [hole, insetMm, spanMm]);

  return (
    <div className="repair-slope-section">
      <svg
        className="repair-slope-section__svg"
        viewBox={`0 0 ${drawing.W} ${drawing.H}`}
        role="img"
        aria-label={t("repair.slopeSection.aria")}
      >
        {/* Surface / existing floor */}
        <line
          className="repair-slope-section__surface"
          x1={8}
          y1={drawing.topY}
          x2={drawing.W - 8}
          y2={drawing.topY}
        />
        {/* Cavity fill */}
        <path className="repair-slope-section__cavity" d={drawing.cavityD} />
        {/* Floor line */}
        <path
          className="repair-slope-section__floor"
          d={drawing.floorD}
          fill="none"
        />

        {drawing.hasDepth ? (
          <>
            <text
              className="repair-slope-section__depth"
              x={drawing.xAt(0)}
              y={drawing.yAt(drawing.startD) + 14}
              textAnchor="start"
            >
              {Math.round(drawing.startD)} mm
            </text>
            <text
              className="repair-slope-section__depth"
              x={drawing.xAt(1)}
              y={drawing.yAt(drawing.endD) + 14}
              textAnchor="end"
            >
              {Math.round(drawing.endD)} mm
            </text>
          </>
        ) : (
          <text
            className="repair-slope-section__empty"
            x={drawing.W / 2}
            y={drawing.topY + 40}
            textAnchor="middle"
          >
            {t("repair.slopeSection.needDepth")}
          </text>
        )}

        {/* Edge cover bracket */}
        {drawing.insetT > 0.02 ? (
          <g className="repair-slope-section__inset">
            <line
              x1={drawing.xAt(0)}
              y1={drawing.insetBracketY}
              x2={drawing.xAt(drawing.insetT)}
              y2={drawing.insetBracketY}
            />
            <line
              x1={drawing.xAt(0)}
              y1={drawing.insetBracketY - 3}
              x2={drawing.xAt(0)}
              y2={drawing.insetBracketY + 3}
            />
            <line
              x1={drawing.xAt(drawing.insetT)}
              y1={drawing.insetBracketY - 3}
              x2={drawing.xAt(drawing.insetT)}
              y2={drawing.insetBracketY + 3}
            />
            <text
              x={drawing.insetLabelX}
              y={drawing.insetBracketY - 5}
              textAnchor="middle"
            >
              {t("repair.slopeSection.coverShort")}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
