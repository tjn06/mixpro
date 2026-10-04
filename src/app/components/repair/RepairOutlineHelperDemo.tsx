import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

type HelperPhase = "move" | "add" | "delete";

const PHASES: HelperPhase[] = ["move", "add", "delete"];
/** Fast one-shot showcase — total ~2.4s then dismiss. */
const PHASE_MS = 800;

export type HelperSvgPoint = { x: number; y: number };

/**
 * One-shot coach overlay that mirrors the real outline handles.
 * Drag → add-on-edge → delete, then calls onDone. pointer-events: none.
 */
export function RepairOutlineHelperDemo({
  viewW,
  viewH,
  points,
  onDone,
}: {
  viewW: number;
  viewH: number;
  /** Live outline handles in SVG coordinates (same as the editor). */
  points: readonly HelperSvgPoint[];
  onDone: () => void;
}) {
  const { t } = useTranslation("common");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const phase = PHASES[phaseIndex] ?? "move";
  /** Freeze geometry for the one-shot so live edits don't restart it. */
  const [frozenPoints] = useState(points);

  const geometry = useMemo(() => {
    if (frozenPoints.length < 3) return null;
    const dragIndex = Math.min(1, frozenPoints.length - 1);
    const deleteIndex = Math.min(
      frozenPoints.length > 4 ? frozenPoints.length - 2 : 0,
      frozenPoints.length - 1,
    );
    const edgeIndex = Math.min(2, frozenPoints.length - 1);
    const edgeNext = (edgeIndex + 1) % frozenPoints.length;
    const dragFrom = frozenPoints[dragIndex]!;
    const edgeA = frozenPoints[edgeIndex]!;
    const edgeB = frozenPoints[edgeNext]!;
    const deletePt = frozenPoints[deleteIndex]!;

    const cx = frozenPoints.reduce((s, p) => s + p.x, 0) / frozenPoints.length;
    const cy = frozenPoints.reduce((s, p) => s + p.y, 0) / frozenPoints.length;
    const vx = dragFrom.x - cx;
    const vy = dragFrom.y - cy;
    const len = Math.hypot(vx, vy) || 1;
    const nudge = 18;
    const dragTo = {
      x: dragFrom.x + (vx / len) * nudge,
      y: dragFrom.y + (vy / len) * nudge,
    };
    const addAt = {
      x: (edgeA.x + edgeB.x) / 2,
      y: (edgeA.y + edgeB.y) / 2,
    };

    return { dragFrom, dragTo, addAt, deletePt };
  }, [frozenPoints]);

  useEffect(() => {
    if (!geometry) {
      onDone();
      return;
    }
    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      if (step >= PHASES.length) {
        window.clearInterval(id);
        setExiting(true);
        window.setTimeout(() => onDone(), 220);
        return;
      }
      setPhaseIndex(step);
    }, PHASE_MS);
    return () => window.clearInterval(id);
  }, [geometry, onDone]);

  if (!geometry) return null;

  const { dragFrom, dragTo, addAt, deletePt } = geometry;

  const captionKey =
    phase === "move"
      ? "repair.outlineHelper.phaseMove"
      : phase === "add"
        ? "repair.outlineHelper.phaseAdd"
        : "repair.outlineHelper.phaseDelete";

  return (
    <div
      className={`repair-outline-helper${exiting ? " is-exiting" : ""}`}
      aria-hidden
    >
      <svg
        className="repair-outline-helper__svg"
        viewBox={`0 0 ${viewW} ${viewH}`}
      >
        {/* Ghost drag handle — same size as real handles (r=8) */}
        {phase === "move" ? (
          <circle
            className="repair-outline-helper__point repair-outline-helper__point--drag"
            cx={dragFrom.x}
            cy={dragFrom.y}
            r={8}
            style={
              {
                ["--helper-dx" as string]: `${dragTo.x - dragFrom.x}px`,
                ["--helper-dy" as string]: `${dragTo.y - dragFrom.y}px`,
              } as CSSProperties
            }
          />
        ) : null}

        {phase === "add" ? (
          <>
            <circle
              className="repair-outline-helper__tap is-active"
              cx={addAt.x}
              cy={addAt.y}
              r={14}
            />
            <circle
              className="repair-outline-helper__point repair-outline-helper__point--add is-visible"
              cx={addAt.x}
              cy={addAt.y}
              r={8}
            />
          </>
        ) : null}

        {phase === "delete" ? (
          <circle
            className="repair-outline-helper__point repair-outline-helper__point--gone"
            cx={deletePt.x}
            cy={deletePt.y}
            r={10}
          />
        ) : null}

        <g
          className={`repair-outline-helper__cursor is-${phase}`}
          style={
            {
              ["--helper-from-x" as string]: `${dragFrom.x}px`,
              ["--helper-from-y" as string]: `${dragFrom.y}px`,
              ["--helper-to-x" as string]: `${dragTo.x}px`,
              ["--helper-to-y" as string]: `${dragTo.y}px`,
              ["--helper-add-x" as string]: `${addAt.x}px`,
              ["--helper-add-y" as string]: `${addAt.y}px`,
              ["--helper-del-x" as string]: `${deletePt.x}px`,
              ["--helper-del-y" as string]: `${deletePt.y}px`,
            } as CSSProperties
          }
        >
          <circle r={9} className="repair-outline-helper__cursor-dot" />
        </g>
      </svg>
      <p className="repair-outline-helper__caption">{t(captionKey)}</p>
    </div>
  );
}
