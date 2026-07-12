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

function pctOptional(recipe: BlendingRecipe, id: string): number {
  return recipe.binderPercents.find((p) => p.id === id)?.percent ?? 0;
}

function totalParts(recipe: BlendingRecipe): number {
  return recipe.binderParts.reduce((sum, p) => sum + p.parts, 0);
}

/** Whether the recipe defines this mix ingredient (A/B part or percent additive). */
export function recipeHasIngredient(recipe: BlendingRecipe, id: string): boolean {
  return (
    recipe.binderParts.some((p) => p.id === id) ||
    recipe.binderPercents.some((p) => p.id === id)
  );
}

/** Param indexes for editable ingredient cards — excludes TOTAL, preserves recipe order. */
export function recipeIngredientIndexes(recipe: BlendingRecipe): number[] {
  const indexes: number[] = [];
  for (const p of recipe.binderParts) {
    const idx = MIX_VALUE_ORDER.indexOf(p.id as MixDriverId);
    if (idx > 0) indexes.push(idx);
  }
  for (const p of recipe.binderPercents) {
    const idx = MIX_VALUE_ORDER.indexOf(p.id as MixDriverId);
    if (idx > 0 && !indexes.includes(idx)) indexes.push(idx);
  }
  return indexes;
}

/** Liquid epoxy grams (A + B + optional TIX) for volume / bucket math. */
export function mixEpoxyGrams(recipe: BlendingRecipe, values: number[]): number {
  let sum = 0;
  if (recipeHasIngredient(recipe, "A")) sum += values[1];
  if (recipeHasIngredient(recipe, "B")) sum += values[2];
  if (recipeHasIngredient(recipe, "TIX")) sum += values[3];
  return sum;
}

/** Sand grams when the recipe includes SAND. */
export function mixSandGrams(recipe: BlendingRecipe, values: number[]): number {
  return recipeHasIngredient(recipe, "SAND") ? values[4] : 0;
}

/** 1 + sum(percent/100) — multiplier from binder sum to total weight. */
export function binderToTotalMultiplier(recipe: BlendingRecipe): number {
  return 1 + recipe.binderPercents.reduce((sum, p) => sum + p.percent / 100, 0);
}

function deriveFromBinderSum(recipe: BlendingRecipe, binderSum: number) {
  const tp = totalParts(recipe);
  const gramsById: Record<string, number> = {};
  for (const p of recipe.binderParts) {
    gramsById[p.id] = binderSum * (p.parts / tp);
  }
  for (const p of recipe.binderPercents) {
    gramsById[p.id] = binderSum * (p.percent / 100);
  }
  return {
    a: gramsById.A ?? 0,
    b: gramsById.B ?? 0,
    sand: gramsById.SAND ?? 0,
    tix: gramsById.TIX ?? 0,
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
    case "SAND": {
      const sandPct = pctOptional(recipe, "SAND");
      if (sandPct <= 0) return grams;
      return grams / (sandPct / 100);
    }
    case "TIX": {
      const tixPct = pctOptional(recipe, "TIX");
      if (tixPct <= 0) return grams;
      return grams / (tixPct / 100);
    }
    case "TOTAL":
      return grams / binderToTotalMultiplier(recipe);
  }
}

/**
 * Recalculate all mix weights from one driver value while keeping recipe ratios locked.
 * Returns [TOTAL, A, B, TIX, SAND] in grams — absent ingredients are 0.
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

  if (!recipeHasIngredient(recipe, "SAND")) sand = 0;
  if (!recipeHasIngredient(recipe, "TIX")) tix = 0;

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

/** Zeroed mix vector for an optional totals-screen complement batch. */
export function emptyComplementValues(): number[] {
  return MIX_VALUE_ORDER.map(() => 0);
}

export function hasComplementAmounts(complement: number[]): boolean {
  return complement.some((grams) => grams !== 0);
}

/** Binder reference for a recipe — uses recipe.initialBinderSum when set. */
export function recipeBinderSum(recipe: BlendingRecipe, defaultBinderSum = 1000): number {
  return recipe.initialBinderSum ?? defaultBinderSum;
}

export function driverIdFromIndex(index: number): MixDriverId {
  return MIX_VALUE_ORDER[index] ?? "TOTAL";
}

/** Human-readable locked recipe line for the UI. */
export function formatRecipeLine(recipe: BlendingRecipe): string {
  const parts = recipe.binderParts.map((p) => `${p.id}:${p.parts}`).join("  ·  ");
  const percents = recipe.binderPercents.map((p) => `${p.id}:${p.percent}%`).join("  ·  ");
  return percents ? `${parts}  ·  ${percents}` : parts;
}

/** Short locked-ratio label for an ingredient card back strip (e.g. `2p`, `555%`). */
export function formatLockedRatioLabel(recipe: BlendingRecipe, id: string): string {
  const partEntry = recipe.binderParts.find((p) => p.id === id);
  if (partEntry) return `${partEntry.parts}p`;
  const pctEntry = recipe.binderPercents.find((p) => p.id === id);
  if (pctEntry) return `${pctEntry.percent}%`;
  return "";
}

function formatRatioNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(2);
  return s.replace(/\.?0+$/, "");
}

/** Structured ratio for recipe ratio cards — value + unit on separate rows. */
export function getLockedRatioDisplay(
  recipe: BlendingRecipe,
  id: string,
): { value: string; unit: string } {
  const partEntry = recipe.binderParts.find((p) => p.id === id);
  if (partEntry) return { value: formatRatioNumber(partEntry.parts), unit: "PARTS" };
  const pctEntry = recipe.binderPercents.find((p) => p.id === id);
  if (pctEntry) return { value: formatRatioNumber(pctEntry.percent), unit: "%" };
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

/** Secondary line under entity id on mix cards (Epoxy, Resin, Filler, …). */
export function getEntityMetaLabel(recipe: BlendingRecipe, id: string): string | undefined {
  if (id === "TOTAL") {
    return "Total epoxymass";
  }
  const label = getIngredientLabel(recipe, id);
  if (label) return label;
  if ((id === "A" || id === "B") && recipe.nameSubline?.trim()) {
    return recipe.nameSubline.trim();
  }
  return undefined;
}

/** @deprecated Use getIngredientLabel — kept for recipe ratio cards on A/B. */
export function getBinderPartLabel(recipe: BlendingRecipe, id: string): string | undefined {
  return getIngredientLabel(recipe, id);
}
