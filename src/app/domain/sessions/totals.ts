import { MIX_PARAMS } from "../mix/entities";
import { recipeIngredientIndexes } from "../recipe/calc";
import type { BlendingRecipe } from "../recipe/types";
import { gramsFromSlotValues } from "../../saved-batch-totals/batches";
import type { SessionBatchItem } from "../../sessions/types";

/** Resolve recipe for a session batch (snapshot → session recipes → library). */
export function resolveSessionBatchRecipe(
  batch: SessionBatchItem,
  sessionRecipes: BlendingRecipe[],
  libraryRecipes: BlendingRecipe[],
): BlendingRecipe | null {
  if (batch.recipe) return batch.recipe;
  return (
    sessionRecipes.find((r) => r.id === batch.recipeId) ??
    libraryRecipes.find((r) => r.id === batch.recipeId) ??
    null
  );
}

/** Per-batch total grams (TOTAL slot × multiplier). */
export function sessionBatchTotalGrams(batch: SessionBatchItem): number {
  const values = gramsFromSlotValues(batch.values);
  return (values[0] ?? 0) * Math.max(1, batch.multiplier);
}

/** Grand total across all session mixes. */
export function sessionGrandTotalGrams(batches: readonly SessionBatchItem[]): number {
  return batches.reduce((sum, batch) => sum + sessionBatchTotalGrams(batch), 0);
}

/** Ingredient totals rolled up by slot index (TOTAL · A · B · TIX · SAND). */
export function sessionIngredientTotalsGrams(
  batches: readonly SessionBatchItem[],
): number[] {
  const totals = MIX_PARAMS.map(() => 0);
  for (const batch of batches) {
    const values = gramsFromSlotValues(batch.values);
    const mult = Math.max(1, batch.multiplier);
    for (let i = 0; i < totals.length; i++) {
      totals[i] += (values[i] ?? 0) * mult;
    }
  }
  return totals;
}

/** Union of ingredient indexes used by any batch (always includes TOTAL = 0). */
export function sessionEntityIndexes(
  batches: readonly SessionBatchItem[],
  resolveRecipe: (batch: SessionBatchItem) => BlendingRecipe | null,
): number[] {
  const seen = new Set<number>([0]);
  for (const batch of batches) {
    const recipe = resolveRecipe(batch);
    if (!recipe) continue;
    for (const idx of recipeIngredientIndexes(recipe)) {
      seen.add(idx);
    }
  }
  return MIX_PARAMS.map((_, i) => i).filter((i) => seen.has(i));
}
