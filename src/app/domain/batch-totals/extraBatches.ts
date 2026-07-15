import { emptyComplementValues, hasComplementAmounts } from "../recipe/calc";

/** One custom extra-batch mix with its own per-batch amounts and count. */
export type ExtraBatchEntry = {
  values: number[];
  multiplier: number;
};

export function emptyExtraBatchEntry(): ExtraBatchEntry {
  return { values: emptyComplementValues(), multiplier: 1 };
}

export function hasExtraBatches(entries: ExtraBatchEntry[]): boolean {
  return entries.length > 0 && entries.some((entry) => hasComplementAmounts(entry.values));
}

/** Sum of every extra-batch multiplier (e.g. ×1 + ×2 → 3 total extra batches). */
export function extraBatchTotalCount(entries: ExtraBatchEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.multiplier, 0);
}

export function sumExtraBatchGrams(entries: ExtraBatchEntry[], index: number): number {
  return entries.reduce((sum, entry) => sum + entry.values[index] * entry.multiplier, 0);
}

export function extraBatchSectionLabel(index: number, total: number): string {
  return total > 1 ? `Extra batch ${index + 1}` : "Extra batch";
}
