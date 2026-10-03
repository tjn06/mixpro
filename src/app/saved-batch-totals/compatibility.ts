import { snapshotValuesFromGrams } from "../saved-mixes/store";
import { normalizeMixSlotValues } from "../domain/mix/slotMigration";
import { primaryBatch } from "./batches";
import type { MixSlotValues, SavedBatchTotalsSnapshot } from "./types";

/** Current mixer / totals session used for open eligibility. */
export type BatchTotalsSessionContext = {
  recipeId: string;
  loadedSavedMixId: string | null;
  /** Live mix grams — TOTAL · A · B · C · THICKENER · FILLER. */
  values: number[];
};

const RATIO_EPS = 1e-3;

function entityRatios(values: MixSlotValues): number[] {
  const n = normalizeMixSlotValues(values);
  const total = n.total;
  const c = n.c ?? 0;
  if (!(total > 0)) {
    return [n.a, n.b, c, n.thickener, n.filler];
  }
  return [
    n.a / total,
    n.b / total,
    c / total,
    n.thickener / total,
    n.filler / total,
  ];
}

/** Same entity mix proportions (multiplier ignored). */
export function sameEntityRatios(
  a: MixSlotValues,
  b: MixSlotValues,
  eps = RATIO_EPS,
): boolean {
  const ra = entityRatios(a);
  const rb = entityRatios(b);
  for (let i = 0; i < ra.length; i++) {
    if (Math.abs(ra[i]! - rb[i]!) > eps) return false;
  }
  return true;
}

function sessionMatchValues(entry: SavedBatchTotalsSnapshot): MixSlotValues | null {
  const primary = primaryBatch(entry);
  if (primary) return primary.values;
  // Peer-only saves: no primary — not attachable in the current session workflow.
  return null;
}

/**
 * Compatible with the locked table-1 mix for the current workflow.
 * Prefer linked mix ids; fall back to primary-batch entity ratios.
 */
export function isBatchTotalsCompatibleWithSession(
  entry: SavedBatchTotalsSnapshot,
  session: BatchTotalsSessionContext,
): boolean {
  if (entry.recipeId !== session.recipeId) return false;

  const sessionMixId = session.loadedSavedMixId;
  const entryMixId = entry.linkedSavedMixId ?? null;

  if (sessionMixId && entryMixId) {
    return entryMixId === sessionMixId;
  }

  const matchValues = sessionMatchValues(entry);
  if (!matchValues) return false;

  return sameEntityRatios(matchValues, snapshotValuesFromGrams(session.values));
}
