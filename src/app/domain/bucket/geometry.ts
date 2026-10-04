/**
 * BucketGeometryModel — maps material volumes → fill fractions / heights.
 *
 * V1 is provisional linear: heightFraction ≈ volume / capacity.
 * Isolated from material physics (MaterialVolumeModel stays bucket-agnostic).
 * SVG frustum shaping remains a presentation detail in MixBucket.
 */

export type BucketGeometryEstimate = {
  /** Expected rest volume as fraction of bucket capacity (may exceed 1). */
  expectedFillFraction: number;
  fillFractionLow: number;
  fillFractionHigh: number;
  /** Loose / initial loading potential as fraction of capacity (may exceed 1). */
  initialPotentialFillFraction: number;
  /**
   * Fraction used for the bucket SVG fill (0–1 of full capacity).
   * Not clamped to SafeFill — callers clamp for hard-cap display separately.
   */
  displayFillFraction: number;
};

/** Linear volume → fill fraction. Capacity must be > 0. */
export function volumeToFillFraction(
  volumeL: number,
  capacityL: number,
): number {
  if (!(capacityL > 0)) return 0;
  return Math.max(0, volumeL) / capacityL;
}

/**
 * Provisional linear geometry from rest / potential volumes.
 * Does not apply SafeFill — FillSafetyModel owns that.
 */
export function estimateBucketGeometry(params: {
  expectedRestVolumeL: number;
  restVolumeLowL: number;
  restVolumeHighL: number;
  initialPotentialVolumeL: number;
  capacityL: number;
}): BucketGeometryEstimate {
  const {
    expectedRestVolumeL,
    restVolumeLowL,
    restVolumeHighL,
    initialPotentialVolumeL,
    capacityL,
  } = params;

  const expectedFillFraction = volumeToFillFraction(
    expectedRestVolumeL,
    capacityL,
  );
  const fillFractionLow = volumeToFillFraction(restVolumeLowL, capacityL);
  const fillFractionHigh = volumeToFillFraction(restVolumeHighL, capacityL);
  const initialPotentialFillFraction = volumeToFillFraction(
    initialPotentialVolumeL,
    capacityL,
  );

  return {
    expectedFillFraction,
    fillFractionLow,
    fillFractionHigh,
    initialPotentialFillFraction,
    displayFillFraction: Math.min(1, expectedFillFraction),
  };
}
