import { formatMixAmount, MIX_PARAMS } from "./mixEntities";

/** Combined total for one ingredient: N identical batches + optional complement. */
export function batchIngredientTotalGrams(
  batchValues: number[],
  complementValues: number[],
  index: number,
  multiplier: number,
): number {
  return batchValues[index] * multiplier + complementValues[index];
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
