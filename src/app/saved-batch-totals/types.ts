import type { ExtraBatchEntry } from "../domain/batch-totals/extraBatches";

/** Same slot map as saved mixes — TOTAL · A · B · TIX · SAND. */
export type MixSlotValues = {
  total: number;
  a: number;
  b: number;
  tix: number;
  sand: number;
};

/**
 * Role is optional for free/share workflows (all peers = `"batch"` or omit).
 * Current mixer→totals flow sets exactly one `"primary"` (session table 1).
 */
export type BatchRole = "primary" | "batch";

export type SavedBatchEntry = {
  values: MixSlotValues;
  multiplier: number;
  role: BatchRole;
};

/** Persisted batch-totals snapshot — generic list of batches. */
export interface SavedBatchTotalsSnapshot {
  id: string;
  savedAt: string;
  recipeId: string;
  /** Recipe label at save time — always kept for reference. */
  recipeName: string;
  /** Optional custom list label; shown instead of a generated fallback when set. */
  metaName?: string;
  /** Optional link to a saved mix that supplied the primary batch. */
  linkedSavedMixId?: string;
  batches: SavedBatchEntry[];
  /** Soft origin tag — not a behavior lock. */
  source?: "batch-mixer";
}

/** @deprecated Legacy persist shape — migrated to `batches`. */
export type LegacySavedBatchTotalsSnapshot = {
  id: string;
  savedAt: string;
  recipeId: string;
  recipeName: string;
  metaName?: string;
  linkedSavedMixId?: string;
  baseValues: MixSlotValues;
  multiplier: number;
  extraBatches: Array<{ values: MixSlotValues; multiplier: number }>;
  source?: "batch-mixer";
};

export type SaveBatchTotalsInput = {
  recipeId: string;
  recipeName: string;
  metaName?: string;
  linkedSavedMixId?: string;
  /** Prefer passing a built `batches` list; helpers can build from session fields. */
  batches: SavedBatchEntry[];
  source?: "batch-mixer";
};

/** Convenience for the current extras UI — converted to `batches` on save. */
export type SaveBatchTotalsFromSessionInput = {
  recipeId: string;
  recipeName: string;
  metaName?: string;
  linkedSavedMixId?: string;
  primaryValues: MixSlotValues;
  primaryMultiplier: number;
  extraBatches: ExtraBatchEntry[];
  source?: "batch-mixer";
};
