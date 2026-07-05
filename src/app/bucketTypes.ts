/** Supported mixing bucket capacities — same frustum shape, different fill denominator. */
export type BucketSize = 5 | 10 | 17;

export type BucketSelection = BucketSize | "none";

export const BUCKET_SIZES: BucketSize[] = [5, 10, 17];

export const DEFAULT_BUCKET_SIZE: BucketSize = 17;

export const DEFAULT_BUCKET_SELECTION: BucketSelection = DEFAULT_BUCKET_SIZE;

/** Hard cap — stop mixing at 86% of bucket capacity. */
export const RECOMMENDED_MAX_FILL_PERCENT = 86;

export function maxMixLitersForBucket(size: BucketSize): number {
  return size * (RECOMMENDED_MAX_FILL_PERCENT / 100);
}

/** Actual fill % of bucket volume (0–86 at cap). */
export function displayFillPercent(estimatedLiters: number, capacityLiters: BucketSize): number {
  if (capacityLiters <= 0) return 0;
  const raw = Math.round((estimatedLiters / capacityLiters) * 100);
  return Math.min(RECOMMENDED_MAX_FILL_PERCENT, Math.max(0, raw));
}

export function isBucketAtMaxFill(estimatedLiters: number, capacityLiters: BucketSize): boolean {
  return estimatedLiters >= maxMixLitersForBucket(capacityLiters) - 1e-6;
}

/** SVG fill height as fraction of bucket (0–0.86 at cap). */
export function fillRatioForDisplay(estimatedLiters: number, capacityLiters: BucketSize): number {
  if (capacityLiters <= 0) return 0;
  const ratio = estimatedLiters / capacityLiters;
  return Math.min(RECOMMENDED_MAX_FILL_PERCENT / 100, Math.max(0, ratio));
}

export function isBucketSize(value: number): value is BucketSize {
  return value === 5 || value === 10 || value === 17;
}

/** Largest bucket that fits the estimated mix volume at 86% cap, or none. */
export function largestFittingBucket(estimatedLiters: number): BucketSelection {
  const fitting = [...BUCKET_SIZES].reverse().find((size) => bucketFits(size, estimatedLiters));
  return fitting ?? "none";
}

/** Whether a bucket size can hold the estimated mix volume (86% cap). */
export function bucketFits(size: BucketSize, estimatedLiters: number): boolean {
  return estimatedLiters <= maxMixLitersForBucket(size);
}

/** If the current selection overflows, bump to a larger fitting bucket — never auto-switch to none. */
export function reconcileBucketSelection(
  selection: BucketSelection,
  estimatedLiters: number,
): BucketSelection {
  if (selection === "none") return "none";
  if (bucketFits(selection, estimatedLiters)) return selection;
  const upgrade = largestFittingBucket(estimatedLiters);
  return upgrade !== "none" ? upgrade : selection;
}
