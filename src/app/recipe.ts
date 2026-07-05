import type { BlendingRecipe } from "./recipeTypes";

/** Param ids that can drive a locked-ratio recalculation. */
export type MixDriverId = "TOTAL" | "A" | "B" | "TIX" | "SAND";

/** Index order: TOTAL, A, B, TIX, SAND — matches PARAMS in BatchMixer. */
export const MIX_VALUE_ORDER: MixDriverId[] = ["TOTAL", "A", "B", "TIX", "SAND"];

function part(recipe: BlendingRecipe, id: string): number {
  const entry = recipe.binderParts.find((p) => p.id === id);
  if (!entry) throw new Error(`Recipe missing binder part: ${id}`);
  return entry.parts;
}

function pct(recipe: BlendingRecipe, id: string): number {
  const entry = recipe.binderPercents.find((p) => p.id === id);
  if (!entry) throw new Error(`Recipe missing binder percent: ${id}`);
  return entry.percent;
}

function totalParts(recipe: BlendingRecipe): number {
  return recipe.binderParts.reduce((sum, p) => sum + p.parts, 0);
}

/** 1 + sum(percent/100) — multiplier from binder sum to total weight. */
export function binderToTotalMultiplier(recipe: BlendingRecipe): number {
  return 1 + recipe.binderPercents.reduce((sum, p) => sum + p.percent / 100, 0);
}

function deriveFromBinderSum(recipe: BlendingRecipe, binderSum: number) {
  const tp = totalParts(recipe);
  return {
    a: binderSum * (part(recipe, "A") / tp),
    b: binderSum * (part(recipe, "B") / tp),
    sand: binderSum * (pct(recipe, "SAND") / 100),
    tix: binderSum * (pct(recipe, "TIX") / 100),
  };
}

function binderSumFromDriver(recipe: BlendingRecipe, driver: MixDriverId, grams: number): number {
  const aParts = part(recipe, "A");
  const bParts = part(recipe, "B");

  switch (driver) {
    case "A":
      return grams * (1 + bParts / aParts);
    case "B":
      return grams * (1 + aParts / bParts);
    case "SAND":
      return grams / (pct(recipe, "SAND") / 100);
    case "TIX":
      return grams / (pct(recipe, "TIX") / 100);
    case "TOTAL":
      return grams / binderToTotalMultiplier(recipe);
  }
}

/**
 * Recalculate all mix weights from one driver value while keeping recipe ratios locked.
 * Returns [TOTAL, A, B, TIX, SAND] in grams.
 */
export function applyRecipeChange(
  recipe: BlendingRecipe,
  driver: MixDriverId,
  driverGrams: number,
): number[] {
  const g = Math.max(0, Math.round(driverGrams));
  const binderSum = binderSumFromDriver(recipe, driver, g);
  const raw = deriveFromBinderSum(recipe, binderSum);

  let a = raw.a;
  let b = raw.b;
  let sand = raw.sand;
  let tix = raw.tix;

  switch (driver) {
    case "A":
      a = g;
      b = Math.round(b);
      sand = Math.round(sand);
      tix = Math.round(tix);
      break;
    case "B":
      b = g;
      a = Math.round(a);
      sand = Math.round(sand);
      tix = Math.round(tix);
      break;
    case "SAND":
      sand = g;
      a = Math.round(a);
      b = Math.round(b);
      tix = Math.round(tix);
      break;
    case "TIX":
      tix = g;
      a = Math.round(a);
      b = Math.round(b);
      sand = Math.round(sand);
      break;
    case "TOTAL":
      a = Math.round(a);
      b = Math.round(b);
      sand = Math.round(sand);
      tix = Math.round(tix);
      return [g, a, b, tix, sand];
  }

  const total = a + b + sand + tix;
  return [total, a, b, tix, sand];
}

/** Initial mix from a binder base (A + B), default 1000 g. */
export function initialMixValues(recipe: BlendingRecipe, binderSum = 1000): number[] {
  return applyRecipeChange(recipe, "A", deriveFromBinderSum(recipe, binderSum).a);
}

export function driverIdFromIndex(index: number): MixDriverId {
  return MIX_VALUE_ORDER[index] ?? "TOTAL";
}

/** Human-readable locked recipe line for the UI. */
export function formatRecipeLine(recipe: BlendingRecipe): string {
  const parts = recipe.binderParts.map((p) => `${p.id}:${p.parts}`).join("  ·  ");
  const percents = recipe.binderPercents.map((p) => `${p.id}:${p.percent}%`).join("  ·  ");
  return `${parts}  ·  ${percents}`;
}

/** Short locked-ratio label for an ingredient card back strip (e.g. `2p`, `555%`). */
export function formatLockedRatioLabel(recipe: BlendingRecipe, id: string): string {
  const partEntry = recipe.binderParts.find((p) => p.id === id);
  if (partEntry) return `${partEntry.parts}p`;
  const pctEntry = recipe.binderPercents.find((p) => p.id === id);
  if (pctEntry) return `${pctEntry.percent}%`;
  return "";
}

/** Structured ratio for recipe ratio cards — value + unit on separate rows. */
export function getLockedRatioDisplay(
  recipe: BlendingRecipe,
  id: string,
): { value: string; unit: string } {
  const partEntry = recipe.binderParts.find((p) => p.id === id);
  if (partEntry) return { value: String(partEntry.parts), unit: "PARTS" };
  const pctEntry = recipe.binderPercents.find((p) => p.id === id);
  if (pctEntry) return { value: String(pctEntry.percent), unit: "%" };
  return { value: "", unit: "" };
}

/** Display label for any mix ingredient (Resin, Hardener, Filler, Thickener, …). */
export function getIngredientLabel(recipe: BlendingRecipe, id: string): string | undefined {
  const partLabel = recipe.binderParts.find((p) => p.id === id)?.label?.trim();
  if (partLabel) return partLabel;
  const pctLabel = recipe.binderPercents.find((p) => p.id === id)?.label?.trim();
  if (pctLabel) return pctLabel;
  return undefined;
}

/** @deprecated Use getIngredientLabel — kept for recipe ratio cards on A/B. */
export function getBinderPartLabel(recipe: BlendingRecipe, id: string): string | undefined {
  return getIngredientLabel(recipe, id);
}
