/**
 * Bucket capacity selection + SafeFill display helpers.
 * Composition-aware SafeFill fractions live in fillSafety.ts /
 * material-volume constants — this module keeps a shared conservative display default.
 */

import {
  PURE_EPOXY_SAFE_FILL_FRACTION,
  SAND_MIX_SAFE_FILL_FRACTION,
  TIX_EPOXY_SAFE_FILL_FRACTION,
} from "../material-volume/constants";

/** Supported mixing bucket capacities — same frustum shape, different fill denominator. */
export type BucketSize = 5 | 10 | 17;

export type BucketSelection = BucketSize | "none";

export const BUCKET_SIZES: BucketSize[] = [5, 10, 17];

export const DEFAULT_BUCKET_SIZE: BucketSize = 17;

export const DEFAULT_BUCKET_SELECTION: BucketSelection = DEFAULT_BUCKET_SIZE;

/**
 * Default SafeFill percent for display / simple caps.
 * Prefer resolveSafeFillProfile() when mix composition is known.
 */
export const RECOMMENDED_MAX_FILL_PERCENT = Math.round(
  Math.min(
    PURE_EPOXY_SAFE_FILL_FRACTION,
    TIX_EPOXY_SAFE_FILL_FRACTION,
    SAND_MIX_SAFE_FILL_FRACTION,
  ) * 100,
);

/** @deprecated Use safeFillLimitLiters from fillSafety with a resolved fraction. */
export function maxMixLitersForBucket(
  size: BucketSize,
  safeFillFraction: number = RECOMMENDED_MAX_FILL_PERCENT / 100,
): number {
  return size * safeFillFraction;
}

/** Gap below hard cap still treated as full (integer-gram volume quantization). */
export function bucketMaxFillToleranceLiters(
  capacityLiters: BucketSize,
  safeFillFraction: number = RECOMMENDED_MAX_FILL_PERCENT / 100,
): number {
  const maxLiters = maxMixLitersForBucket(capacityLiters, safeFillFraction);
  return Math.max(0.015, maxLiters * 0.004);
}

/** Actual fill % of bucket volume (0–SafeFill% at cap). */
export function displayFillPercent(
  estimatedLiters: number,
  capacityLiters: BucketSize,
  safeFillPercent: number = RECOMMENDED_MAX_FILL_PERCENT,
): number {
  if (capacityLiters <= 0) return 0;
  const raw = Math.round((estimatedLiters / capacityLiters) * 100);
  return Math.min(safeFillPercent, Math.max(0, raw));
}

export function isBucketAtMaxFill(
  estimatedLiters: number,
  capacityLiters: BucketSize,
  safeFillFraction: number = RECOMMENDED_MAX_FILL_PERCENT / 100,
): boolean {
  const maxLiters = maxMixLitersForBucket(capacityLiters, safeFillFraction);
  if (estimatedLiters > maxLiters + 1e-6) return false;
  return (
    estimatedLiters >=
    maxLiters - bucketMaxFillToleranceLiters(capacityLiters, safeFillFraction)
  );
}

/** SVG fill height as fraction of bucket (0–SafeFill at cap). */
export function fillRatioForDisplay(
  estimatedLiters: number,
  capacityLiters: BucketSize,
  safeFillFraction: number = RECOMMENDED_MAX_FILL_PERCENT / 100,
): number {
  if (capacityLiters <= 0) return 0;
  const ratio = estimatedLiters / capacityLiters;
  return Math.min(safeFillFraction, Math.max(0, ratio));
}

export function isBucketSize(value: number): value is BucketSize {
  return value === 5 || value === 10 || value === 17;
}

/** Largest bucket that fits the estimated mix volume at SafeFill cap, or none. */
export function largestFittingBucket(
  estimatedLiters: number,
  safeFillFraction: number = RECOMMENDED_MAX_FILL_PERCENT / 100,
): BucketSelection {
  const fitting = [...BUCKET_SIZES]
    .reverse()
    .find((size) => bucketFits(size, estimatedLiters, safeFillFraction));
  return fitting ?? "none";
}

/** Whether a bucket size can hold the estimated mix volume (SafeFill cap). */
export function bucketFits(
  size: BucketSize,
  estimatedLiters: number,
  safeFillFraction: number = RECOMMENDED_MAX_FILL_PERCENT / 100,
): boolean {
  return estimatedLiters <= maxMixLitersForBucket(size, safeFillFraction);
}

/** If the current selection overflows, bump to a larger fitting bucket — never auto-switch to none. */
export function reconcileBucketSelection(
  selection: BucketSelection,
  estimatedLiters: number,
  safeFillFraction: number = RECOMMENDED_MAX_FILL_PERCENT / 100,
): BucketSelection {
  if (selection === "none") return "none";
  if (bucketFits(selection, estimatedLiters, safeFillFraction)) return selection;
  const upgrade = largestFittingBucket(estimatedLiters, safeFillFraction);
  return upgrade !== "none" ? upgrade : selection;
}
