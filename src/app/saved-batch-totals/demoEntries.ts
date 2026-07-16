import type { SavedBatchTotalsSnapshot } from "./types";

/**
 * Static fixtures always merged into the load sheet for UI testing.
 * Intentionally incompatible with a typical default-recipe session
 * (wrong recipe and/or wrong primary ratios / mix link).
 */
export const DEMO_INCOMPATIBLE_BATCH_TOTALS: readonly SavedBatchTotalsSnapshot[] = [
  {
    id: "demo-batch-totals-primer-x3",
    savedAt: "2026-01-10T09:00:00.000Z",
    recipeId: "primer",
    recipeName: "Primer",
    metaName: "Demo · Primer",
    batches: [
      {
        role: "primary",
        values: { total: 3000, a: 2000, b: 1000, tix: 0, sand: 0 },
        multiplier: 3,
      },
    ],
    source: "batch-mixer",
  },
  {
    id: "demo-batch-totals-lack-extras",
    savedAt: "2026-01-12T14:30:00.000Z",
    recipeId: "lack",
    recipeName: "Lack",
    metaName: "Demo · Lack",
    batches: [
      {
        role: "primary",
        values: { total: 1500, a: 1000, b: 500, tix: 0, sand: 0 },
        multiplier: 2,
      },
      {
        role: "batch",
        values: { total: 600, a: 400, b: 200, tix: 0, sand: 0 },
        multiplier: 1,
      },
    ],
    source: "batch-mixer",
  },
  {
    id: "demo-batch-totals-default-other-mix",
    savedAt: "2026-01-14T11:15:00.000Z",
    recipeId: "default",
    recipeName: "Standard",
    metaName: "Demo · other mix link",
    linkedSavedMixId: "demo-nonexistent-mix-id",
    batches: [
      {
        role: "primary",
        values: { total: 9000, a: 2000, b: 1000, tix: 0, sand: 6000 },
        multiplier: 5,
      },
    ],
    source: "batch-mixer",
  },
  {
    id: "demo-batch-totals-fas-sockel",
    savedAt: "2026-01-15T16:45:00.000Z",
    recipeId: "fas-sockel",
    recipeName: "Fas/Sockel",
    metaName: "Demo · Fas/Sockel",
    batches: [
      {
        role: "primary",
        values: { total: 4500, a: 2000, b: 1000, tix: 100, sand: 1400 },
        multiplier: 4,
      },
      {
        role: "batch",
        values: { total: 900, a: 400, b: 200, tix: 20, sand: 280 },
        multiplier: 2,
      },
    ],
    source: "batch-mixer",
  },
  /** Peer-only (no primary) — not openable in the current session workflow. */
  {
    id: "demo-batch-totals-peer-only",
    savedAt: "2026-01-16T08:00:00.000Z",
    recipeId: "default",
    recipeName: "Standard",
    metaName: "Demo · peer batches",
    batches: [
      {
        role: "batch",
        values: { total: 3000, a: 2000, b: 1000, tix: 0, sand: 0 },
        multiplier: 2,
      },
      {
        role: "batch",
        values: { total: 1500, a: 1000, b: 500, tix: 0, sand: 0 },
        multiplier: 1,
      },
    ],
    source: "batch-mixer",
  },
];

export function isDemoBatchTotalsEntry(id: string): boolean {
  return id.startsWith("demo-batch-totals-");
}
