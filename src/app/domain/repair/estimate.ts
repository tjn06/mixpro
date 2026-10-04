/**
 * Public Repair volume API — geometry + uncertainty + session totals.
 */

import { DEFAULT_WORK_MARGIN_FRACTION } from "./constants";
import { estimateRepairGeometryExpected } from "./geometry";
import {
  planRepairVolume,
  planSessionFromHoleEstimates,
} from "./planning";
import type {
  RepairConfidence,
  RepairHole,
  RepairSession,
  RepairSessionTotals,
  RepairVolumeEstimate,
} from "./types";
import { estimateGeometryUncertainty } from "./uncertainty";

const CONFIDENCE_RANK: Record<RepairConfidence, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  EXPERIMENTAL: 3,
};

function worstConfidence(
  values: readonly RepairConfidence[],
): RepairConfidence {
  if (values.length === 0) return "HIGH";
  return values.reduce((worst, c) =>
    CONFIDENCE_RANK[c] > CONFIDENCE_RANK[worst] ? c : worst,
  );
}

/**
 * Full hole estimate: expected + lower/upper + confidence + assumptions.
 * Returns null when the hole fails geometry validation.
 */
export function estimateRepairHoleVolume(
  hole: RepairHole,
): RepairVolumeEstimate | null {
  const geo = estimateRepairGeometryExpected(hole);
  if (!geo) return null;

  const unc = estimateGeometryUncertainty({
    hole,
    expectedLiters: geo.expectedLiters,
    assumptions: geo.assumptions,
  });

  const lowerLiters = Math.max(0, geo.expectedLiters - unc.halfRangeL);
  const upperLiters = geo.expectedLiters + unc.halfRangeL;

  return {
    expectedLiters: geo.expectedLiters,
    lowerLiters,
    upperLiters,
    confidence: unc.confidence,
    assumptions: geo.assumptions,
  };
}

export function estimateRepairSessionTotals(
  session: Pick<RepairSession, "holes" | "workMarginFraction">,
  opts?: { /** Sum ready holes; omit incomplete instead of nulling the whole total. */
    skipIncomplete?: boolean },
): RepairSessionTotals | null {
  const estimates: RepairVolumeEstimate[] = [];
  for (const hole of session.holes) {
    const est = estimateRepairHoleVolume(hole);
    if (!est) {
      if (opts?.skipIncomplete) continue;
      return null;
    }
    estimates.push(est);
  }
  if (estimates.length === 0) return null;

  const planning = planSessionFromHoleEstimates(
    estimates,
    session.workMarginFraction ?? DEFAULT_WORK_MARGIN_FRACTION,
  );

  return {
    holeCount: estimates.length,
    expectedLiters: estimates.reduce((s, e) => s + e.expectedLiters, 0),
    lowerLiters: estimates.reduce((s, e) => s + e.lowerLiters, 0),
    upperLiters: estimates.reduce((s, e) => s + e.upperLiters, 0),
    confidence: worstConfidence(estimates.map((e) => e.confidence)),
    planning,
  };
}

export function estimateHolePlanning(
  hole: RepairHole,
  workMarginFraction: number = DEFAULT_WORK_MARGIN_FRACTION,
) {
  const geometry = estimateRepairHoleVolume(hole);
  if (!geometry) return null;
  return {
    geometry,
    planning: planRepairVolume({ geometry, workMarginFraction }),
  };
}
