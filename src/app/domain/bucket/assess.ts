/**
 * Combine MaterialVolumeModel + BucketGeometry + FillSafety for UI consumers.
 */

import { toLegacyVolumeView } from "../material-volume/estimate";
import type {
  LegacyVolumeView,
  VolumeEstimate,
} from "../material-volume/types";
import { estimateBucketGeometry, type BucketGeometryEstimate } from "./geometry";
import {
  assessFillSafety,
  isAtOrOverSafeFill,
  type FillSafetyAssessment,
  type FillSafetyState,
} from "./fillSafety";
import type { BucketSelection, BucketSize } from "./types";

export type BucketFillAssessment = {
  volume: VolumeEstimate;
  /** Legacy MixBucket liters view. */
  legacy: LegacyVolumeView;
  geometry: BucketGeometryEstimate | null;
  safety: FillSafetyAssessment;
  /** Display fill % of capacity (0–100), clamped to SafeFill percent for readout. */
  displayFillPercent: number;
  /** SVG fill ratio 0–safeFillFraction at cap (expected rest). */
  displayFillRatio: number;
  /** Unclamped-to-SafeFill ratios for wave band (still capped at full capacity). */
  displayFillRatioLow: number;
  displayFillRatioHigh: number;
  /** SafeFill line as fraction of capacity. */
  safeFillDisplayRatio: number;
  /** Initial potential as fraction of capacity (capped at 1 for SVG). */
  initialPotentialDisplayRatio: number;
  bucketFull: boolean;
  fillSafetyState: FillSafetyState;
};

function capacityFromSelection(
  selection: BucketSelection,
): BucketSize | null {
  return selection === "none" ? null : selection;
}

/**
 * Full bucket fill assessment for calculator MixBucket / limits.
 */
export function assessBucketFill(params: {
  estimate: VolumeEstimate;
  bucketSelection: BucketSelection;
}): BucketFillAssessment {
  const { estimate, bucketSelection } = params;
  const capacityL = capacityFromSelection(bucketSelection);
  const safety = assessFillSafety({ estimate, capacityL });
  const legacy = toLegacyVolumeView(estimate);

  if (capacityL == null) {
    return {
      volume: estimate,
      legacy,
      geometry: null,
      safety,
      displayFillPercent: 0,
      displayFillRatio: 0,
      displayFillRatioLow: 0,
      displayFillRatioHigh: 0,
      safeFillDisplayRatio: 0,
      initialPotentialDisplayRatio: 0,
      bucketFull: false,
      fillSafetyState: "NO_BUCKET",
    };
  }

  const geometry = estimateBucketGeometry({
    expectedRestVolumeL: estimate.expectedRestVolumeL,
    restVolumeLowL: estimate.restVolumeLowL,
    restVolumeHighL: estimate.restVolumeHighL,
    initialPotentialVolumeL: estimate.initialPotentialVolumeL,
    capacityL,
  });

  const safeFrac = safety.safeFillFraction;
  const rawRatio = geometry.expectedFillFraction;
  const displayFillRatio = Math.min(safeFrac, Math.max(0, rawRatio));
  const displayFillPercent = Math.round(
    Math.min(safeFrac * 100, Math.max(0, rawRatio * 100)),
  );
  const cap1 = (v: number) => Math.min(1, Math.max(0, v));

  return {
    volume: estimate,
    legacy,
    geometry,
    safety,
    displayFillPercent,
    displayFillRatio,
    displayFillRatioLow: cap1(geometry.fillFractionLow),
    displayFillRatioHigh: cap1(geometry.fillFractionHigh),
    safeFillDisplayRatio: safeFrac,
    initialPotentialDisplayRatio: cap1(geometry.initialPotentialFillFraction),
    bucketFull: isAtOrOverSafeFill(safety.state),
    fillSafetyState: safety.state,
  };
}
