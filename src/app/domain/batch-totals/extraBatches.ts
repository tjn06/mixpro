import { emptyComplementValues, hasComplementAmounts } from "../recipe/calc";

/** One custom extra-batch mix with its own per-batch amounts and count. */
export type ExtraBatchEntry = {
  values: number[];
  multiplier: number;
};

export function emptyExtraBatchEntry(): ExtraBatchEntry {
  return { values: emptyComplementValues(), multiplier: 1 };
}

export function hasExtraBatches(entries: readonly ExtraBatchEntry[]): boolean {
  return entries.length > 0 && entries.some((entry) => hasComplementAmounts(entry.values));
}

/** Sum of every extra-batch multiplier (e.g. ×1 + ×2 → 3 total extra batches). */
export function extraBatchTotalCount(entries: readonly ExtraBatchEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.multiplier, 0);
}

/**
 * True when totals plan is more than a single base batch (×1, no extras).
 * Used for mix-screen forward affordance.
 */
export function hasActiveBatchTotalsPlan(
  primaryMultiplier: number,
  entries: readonly ExtraBatchEntry[],
): boolean {
  return primaryMultiplier > 1 || hasExtraBatches(entries);
}

/** Primary ×N plus extra-batch counts — badge number on forward nav. */
export function batchTotalsPlanBatchCount(
  primaryMultiplier: number,
  entries: readonly ExtraBatchEntry[],
): number {
  return Math.max(1, primaryMultiplier) + extraBatchTotalCount(entries);
}

export function sumExtraBatchGrams(entries: ExtraBatchEntry[], index: number): number {
  return entries.reduce((sum, entry) => sum + entry.values[index] * entry.multiplier, 0);
}

export function extraBatchSectionLabel(index: number, _total?: number): string {
  return `Extra batch ${index + 1}`;
}
