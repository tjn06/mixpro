import type { ExtraBatchEntry } from "../domain/batch-totals/extraBatches";
import { gramsFromSnapshot, snapshotValuesFromGrams } from "../saved-mixes/store";
import type {
  LegacySavedBatchTotalsSnapshot,
  MixSlotValues,
  SavedBatchEntry,
  SavedBatchTotalsSnapshot,
  SaveBatchTotalsFromSessionInput,
} from "./types";

export function slotValuesFromGrams(values: number[]): MixSlotValues {
  return snapshotValuesFromGrams(values);
}

export function gramsFromSlotValues(values: MixSlotValues): number[] {
  return gramsFromSnapshot(values);
}

function normalizeMultiplier(value: number): number {
  return Math.max(1, Math.round(value) || 1);
}

function normalizeBatch(batch: SavedBatchEntry): SavedBatchEntry {
  return {
    values: batch.values,
    multiplier: normalizeMultiplier(batch.multiplier),
    role: batch.role === "primary" ? "primary" : "batch",
  };
}

/** At most one primary — first wins; extras become `"batch"`. */
export function normalizeBatches(batches: readonly SavedBatchEntry[]): SavedBatchEntry[] {
  let sawPrimary = false;
  return batches.map((batch) => {
    const next = normalizeBatch(batch);
    if (next.role === "primary") {
      if (sawPrimary) return { ...next, role: "batch" };
      sawPrimary = true;
    }
    return next;
  });
}

export function buildBatchesFromSession(
  primaryValues: MixSlotValues,
  primaryMultiplier: number,
  extraBatches: readonly ExtraBatchEntry[],
): SavedBatchEntry[] {
  return normalizeBatches([
    {
      role: "primary",
      values: primaryValues,
      multiplier: primaryMultiplier,
    },
    ...extraBatches.map((entry) => ({
      role: "batch" as const,
      values: slotValuesFromGrams(entry.values),
      multiplier: entry.multiplier,
    })),
  ]);
}

export function batchesFromSessionInput(
  input: SaveBatchTotalsFromSessionInput,
): SavedBatchEntry[] {
  return buildBatchesFromSession(
    input.primaryValues,
    input.primaryMultiplier,
    input.extraBatches,
  );
}

export function primaryBatch(
  entry: SavedBatchTotalsSnapshot,
): SavedBatchEntry | undefined {
  return entry.batches.find((batch) => batch.role === "primary");
}

/** Non-primary batches (today’s “extras”). */
export function additionalBatches(
  entry: SavedBatchTotalsSnapshot,
): SavedBatchEntry[] {
  return entry.batches.filter((batch) => batch.role !== "primary");
}

export function extraBatchesFromSnapshot(
  entry: SavedBatchTotalsSnapshot,
): ExtraBatchEntry[] {
  return additionalBatches(entry).map((batch) => ({
    values: gramsFromSlotValues(batch.values),
    multiplier: normalizeMultiplier(batch.multiplier),
  }));
}

export function isLegacyBatchTotalsEntry(
  entry: unknown,
): entry is LegacySavedBatchTotalsSnapshot {
  if (typeof entry !== "object" || entry == null) return false;
  const record = entry as { batches?: unknown; baseValues?: unknown };
  if (Array.isArray(record.batches)) return false;
  return record.baseValues != null && typeof record.baseValues === "object";
}

export function migrateLegacyBatchTotalsEntry(
  entry: LegacySavedBatchTotalsSnapshot,
): SavedBatchTotalsSnapshot {
  return {
    id: entry.id,
    savedAt: entry.savedAt,
    recipeId: entry.recipeId,
    recipeName: entry.recipeName,
    metaName: entry.metaName,
    linkedSavedMixId: entry.linkedSavedMixId,
    batches: normalizeBatches([
      {
        role: "primary",
        values: entry.baseValues,
        multiplier: entry.multiplier,
      },
      ...(entry.extraBatches ?? []).map((batch) => ({
        role: "batch" as const,
        values: batch.values,
        multiplier: batch.multiplier,
      })),
    ]),
    source: entry.source,
  };
}

export function totalBatchCount(entry: SavedBatchTotalsSnapshot): number {
  return entry.batches.reduce((sum, batch) => sum + normalizeMultiplier(batch.multiplier), 0);
}
