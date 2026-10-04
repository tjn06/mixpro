/**
 * Depth field interpolation — IDW behind a narrow interface.
 */

import { IDW_EXACT_HIT_EPS_MM, IDW_POWER } from "./constants";
import { distMm } from "./polygon";
import type { PointMm } from "./types";

export type DepthFieldSample = {
  xMm: number;
  yMm: number;
  depthMm: number;
};

export type DepthInterpolator = {
  sampleAt(point: PointMm): number;
};

/**
 * Inverse Distance Weighting (power = IDW_POWER).
 * Exact hit returns the sample depth.
 */
export function createIdwInterpolator(
  samples: readonly DepthFieldSample[],
): DepthInterpolator {
  const usable = samples.filter(
    (s) => Number.isFinite(s.depthMm) && s.depthMm >= 0,
  );

  return {
    sampleAt(point: PointMm): number {
      if (usable.length === 0) return 0;
      if (usable.length === 1) return usable[0]!.depthMm;

      let num = 0;
      let den = 0;
      for (const s of usable) {
        const d = distMm(point, { xMm: s.xMm, yMm: s.yMm });
        if (d <= IDW_EXACT_HIT_EPS_MM) return s.depthMm;
        const w = 1 / d ** IDW_POWER;
        num += w * s.depthMm;
        den += w;
      }
      return den > 0 ? num / den : usable[0]!.depthMm;
    },
  };
}
