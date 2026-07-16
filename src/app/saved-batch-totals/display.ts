import { additionalBatches, primaryBatch, totalBatchCount } from "./batches";
import type { SavedBatchTotalsSnapshot } from "./types";

/** Custom label when set; otherwise a short untitled fallback (not recipe — avoids card dup). */
export function savedBatchTotalsDisplayName(entry: SavedBatchTotalsSnapshot): string {
  const meta = entry.metaName?.trim();
  if (meta) return meta;
  return "Untitled totals";
}

/** Store metaName only when it differs from the recipe name. */
export function resolveSavedBatchTotalsMetaName(
  input: string | undefined,
  recipeName: string,
): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed || trimmed === recipeName) return undefined;
  return trimmed;
}

export function formatBatchTotalsKg(grams: number): string {
  if (!(grams > 0)) return "0.000 kg";
  return `${(grams / 1000).toFixed(3)} kg`;
}

/** Card value — primary base total when present. */
export function savedBatchTotalsPrimaryKg(entry: SavedBatchTotalsSnapshot): string {
  const primary = primaryBatch(entry);
  if (!primary) return "—";
  return formatBatchTotalsKg(primary.values.total);
}

/** Card subline — recipe • plan (same bullet style as saved mixes). */
export function savedBatchTotalsCardDetail(
  entry: SavedBatchTotalsSnapshot,
  options?: { incompatible?: boolean },
): string {
  const parts = [entry.recipeName, savedBatchTotalsDetailLine(entry)];
  if (options?.incompatible) parts.push("other mix");
  return parts.join(" • ");
}

/** Plan summary — multipliers only (not in the title). */
export function savedBatchTotalsDetailLine(entry: SavedBatchTotalsSnapshot): string {
  const primary = primaryBatch(entry);
  const extras = additionalBatches(entry);
  if (primary) {
    const parts = [`×${primary.multiplier}`];
    if (extras.length > 0) {
      parts.push(`${extras.length} more`);
    }
    return parts.join(" · ");
  }
  const count = totalBatchCount(entry);
  const batchRows = entry.batches.length;
  if (batchRows <= 1) return `×${count || 1}`;
  return `${batchRows} batches · ×${count}`;
}
