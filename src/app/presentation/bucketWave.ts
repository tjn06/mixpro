/**
 * Bucket wave-surface path helpers (Phase 3 visualization).
 * Communicates uncertainty — not fluid / splash simulation.
 */

import type { VolumeConfidence } from "../domain/material-volume/types";

/** How strongly the wave spans the low↔high band. */
export function waveBandScale(confidence: VolumeConfidence | undefined): number {
  switch (confidence) {
    case "HIGH":
      return 0.35;
    case "MEDIUM":
      return 0.55;
    case "LOW":
      return 0.78;
    case "EXPERIMENTAL":
      return 0.95;
    default:
      return 0.55;
  }
}

export type WaveSurfacePoint = { x: number; y: number };

/**
 * Build a soft sine surface between left and right.
 * centerY = expected; amplitudePx spans toward crest/trough.
 * phaseRad drifts slowly for uncertainty motion (not slosh).
 */
export function sampleWaveSurface(params: {
  leftX: number;
  rightX: number;
  centerY: number;
  /** Half-amplitude in SVG units (crest above center when Y decreases). */
  amplitudePx: number;
  phaseRad: number;
  samples?: number;
}): WaveSurfacePoint[] {
  const {
    leftX,
    rightX,
    centerY,
    amplitudePx,
    phaseRad,
    samples = 14,
  } = params;
  const n = Math.max(4, samples);
  const span = rightX - leftX;
  const points: WaveSurfacePoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = leftX + span * t;
    // Two soft harmonics — gentle, not choppy.
    const w =
      Math.sin(Math.PI * 2 * t + phaseRad) * 0.72 +
      Math.sin(Math.PI * 4 * t + phaseRad * 1.15) * 0.28;
    // Ease ends toward walls so the surface meets the rim cleanly.
    const edge = Math.sin(Math.PI * t);
    const y = centerY - amplitudePx * w * edge;
    points.push({ x, y });
  }
  return points;
}

/** Closed fill path: bucket floor + wave surface (right → left). */
export function wavedFillPath(params: {
  wallLeftBottomX: number;
  wallRightBottomX: number;
  bottomY: number;
  surface: WaveSurfacePoint[];
}): string {
  const { wallLeftBottomX, wallRightBottomX, bottomY, surface } = params;
  if (surface.length < 2) return "";
  const first = surface[0]!;
  const last = surface[surface.length - 1]!;
  const parts = [
    `M ${wallLeftBottomX} ${bottomY}`,
    `L ${wallRightBottomX} ${bottomY}`,
    `L ${last.x} ${last.y}`,
  ];
  for (let i = surface.length - 2; i >= 0; i--) {
    const p = surface[i]!;
    parts.push(`L ${p.x} ${p.y}`);
  }
  parts.push(`L ${first.x} ${first.y}`, "Z");
  return parts.join(" ");
}

/** Open polyline along the wave surface (for stroke). */
export function waveSurfacePolyline(surface: WaveSurfacePoint[]): string {
  if (surface.length === 0) return "";
  return surface.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

/** Horizontal chord across the frustum at a given fillY / fillRx. */
export function frustumChordPath(
  centerX: number,
  fillY: number,
  fillRx: number,
): string {
  const left = centerX - fillRx;
  const right = centerX + fillRx;
  return `M ${left} ${fillY} L ${right} ${fillY}`;
}
