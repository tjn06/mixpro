/**
 * SVG presentation projection — model mm → viewBox coordinates.
 * Never alters physical volume calculations.
 */

import type { PointMm, RepairDimensions } from "../domain/repair/types";

export type RepairSvgProjection = {
  viewW: number;
  viewH: number;
  pad: number;
  scale: number;
  /** Model mm → SVG x */
  toSvgX: (xMm: number) => number;
  /** Model mm → SVG y */
  toSvgY: (yMm: number) => number;
  /** SVG → model mm */
  toModelX: (svgX: number) => number;
  toModelY: (svgY: number) => number;
  outlinePath: (points: readonly PointMm[]) => string;
};

const DEFAULT_VIEW = 320;
const DEFAULT_PAD = 18;

export function createRepairSvgProjection(
  dims: RepairDimensions,
  options?: { viewSize?: number; pad?: number },
): RepairSvgProjection {
  const viewSize = options?.viewSize ?? DEFAULT_VIEW;
  const pad = options?.pad ?? DEFAULT_PAD;
  const lengthMm = Math.max(1, dims.lengthMm);
  const widthMm = Math.max(1, dims.widthMm);
  const inner = viewSize - pad * 2;
  const scale = Math.min(inner / lengthMm, inner / widthMm);
  const contentW = lengthMm * scale;
  const contentH = widthMm * scale;
  const ox = (viewSize - contentW) / 2;
  const oy = (viewSize - contentH) / 2;

  const toSvgX = (xMm: number) => ox + xMm * scale;
  const toSvgY = (yMm: number) => oy + yMm * scale;
  const toModelX = (svgX: number) => (svgX - ox) / scale;
  const toModelY = (svgY: number) => (svgY - oy) / scale;

  return {
    viewW: viewSize,
    viewH: viewSize,
    pad,
    scale,
    toSvgX,
    toSvgY,
    toModelX,
    toModelY,
    outlinePath(points) {
      if (points.length === 0) return "";
      const parts = points.map((p, i) => {
        const x = toSvgX(p.xMm);
        const y = toSvgY(p.yMm);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      });
      return `${parts.join(" ")} Z`;
    },
  };
}
