import { formatMixAmount, MIX_PARAMS } from "../mix/entities";
import type { ExtraBatchEntry } from "./extraBatches";
import { sumExtraBatchGrams } from "./extraBatches";

/** Combined total for one ingredient: N identical batches + optional extra batches. */
export function batchIngredientTotalGrams(
  batchValues: number[],
  extraBatches: ExtraBatchEntry[],
  index: number,
  multiplier: number,
): number {
  return batchValues[index] * multiplier + sumExtraBatchGrams(extraBatches, index);
}

export function complementSummaryLine(
  entityIndexes: number[],
  complementValues: number[],
): string {
  const parts = entityIndexes
    .filter((i) => i !== 0 && complementValues[i] !== 0)
    .map((pi) => {
      const p = MIX_PARAMS[pi];
      return `${p.id} ${formatMixAmount(complementValues[pi], p.isKg)}${p.isKg ? " kg" : " g"}`;
    });

  return parts.length > 0 ? parts.join(" · ") : "";
}
