import type { AppLanguage } from "../../i18n/language";
import { DEFAULT_UI_LANGUAGE } from "../../i18n/language";
import { displayLabel } from "../../i18n/localizedLabel";
import {
  FILLER_SLOT_ID,
  THICKENER_SLOT_ID,
  isFillerSlotId,
  isThickenerSlotId,
  normalizeRecipeAdditiveSlots,
} from "../mix/slotMigration";
import { MAX_MIX_INGREDIENT_ENTITIES } from "../mix/entities";
import { isLegacyRoleLabel } from "./additiveMaterials";
import {
  partsUnitLabel,
  standardIngredientLabel,
  totalMetaLabel,
} from "./ingredientLabels";
import type { BlendingRecipe } from "./types";

/** Param ids that can drive a locked-ratio recalculation. */
export type MixDriverId =
  | "TOTAL"
  | "A"
  | "B"
  | "C"
  | "THICKENER"
  | "FILLER";

/** Index order: TOTAL, A, B, C, THICKENER, FILLER — matches PARAMS in BatchMixer. */
export const MIX_VALUE_ORDER: MixDriverId[] = [
  "TOTAL",
  "A",
  "B",
  "C",
  "THICKENER",
  "FILLER",
];

function part(recipe: BlendingRecipe, id: string): number {
  const entry = recipe.binderParts.find((p) => p.id === id);
  if (!entry) throw new Error(`Recipe missing binder part: ${id}`);
  return entry.parts;
}

function pctOptional(recipe: BlendingRecipe, id: string): number {
  const canonical =
    id === FILLER_SLOT_ID || id === THICKENER_SLOT_ID
      ? id
      : id;
  return (
    recipe.binderPercents.find((p) => {
      if (p.id === canonical) return true;
      if (canonical === FILLER_SLOT_ID && isFillerSlotId(p.id)) return true;
      if (canonical === THICKENER_SLOT_ID && isThickenerSlotId(p.id)) return true;
      return false;
    })?.percent ?? 0
  );
}

function totalParts(recipe: BlendingRecipe): number {
  return recipe.binderParts.reduce((sum, p) => sum + p.parts, 0);
}

/** Whether the recipe defines this mix ingredient (binder part or additive). */
export function recipeHasIngredient(recipe: BlendingRecipe, id: string): boolean {
  if (recipe.binderParts.some((p) => p.id === id)) return true;
  return recipe.binderPercents.some((p) => {
    if (p.id === id) return true;
    if (isFillerSlotId(id) && isFillerSlotId(p.id)) return true;
    if (isThickenerSlotId(id) && isThickenerSlotId(p.id)) return true;
    return false;
  });
}

/** Param indexes for editable ingredient cards — excludes TOTAL, preserves recipe order. */
export function recipeIngredientIndexes(recipe: BlendingRecipe): number[] {
  const normalized = normalizeRecipeAdditiveSlots(recipe);
  const indexes: number[] = [];
  for (const p of normalized.binderParts) {
    const idx = MIX_VALUE_ORDER.indexOf(p.id as MixDriverId);
    if (idx > 0) indexes.push(idx);
  }
  for (const p of normalized.binderPercents) {
    const idx = MIX_VALUE_ORDER.indexOf(p.id as MixDriverId);
    if (idx > 0 && !indexes.includes(idx)) indexes.push(idx);
  }
  return indexes.slice(0, MAX_MIX_INGREDIENT_ENTITIES);
}

/** Liquid epoxy grams (A + B + C + optional thickener) for volume / bucket math. */
export function mixEpoxyGrams(recipe: BlendingRecipe, values: number[]): number {
  let sum = 0;
  if (recipeHasIngredient(recipe, "A")) sum += values[1] ?? 0;
  if (recipeHasIngredient(recipe, "B")) sum += values[2] ?? 0;
  if (recipeHasIngredient(recipe, "C")) sum += values[3] ?? 0;
  if (recipeHasIngredient(recipe, THICKENER_SLOT_ID)) sum += values[4] ?? 0;
  return sum;
}

/** Filler grams when the recipe includes a filler additive. */
export function mixFillerGrams(recipe: BlendingRecipe, values: number[]): number {
  return recipeHasIngredient(recipe, FILLER_SLOT_ID) ? (values[5] ?? 0) : 0;
}

/** @deprecated Use mixFillerGrams */
export function mixSandGrams(recipe: BlendingRecipe, values: number[]): number {
  return mixFillerGrams(recipe, values);
}

/** 1 + sum(percent/100) — multiplier from binder sum to total weight. */
export function binderToTotalMultiplier(recipe: BlendingRecipe): number {
  return 1 + recipe.binderPercents.reduce((sum, p) => sum + p.percent / 100, 0);
}

function deriveFromBinderSum(recipe: BlendingRecipe, binderSum: number) {
  const normalized = normalizeRecipeAdditiveSlots(recipe);
  const tp = totalParts(normalized);
  const gramsById: Record<string, number> = {};
  for (const p of normalized.binderParts) {
    gramsById[p.id] = binderSum * (p.parts / tp);
  }
  for (const p of normalized.binderPercents) {
    gramsById[p.id] = binderSum * (p.percent / 100);
  }
  return {
    a: gramsById.A ?? 0,
    b: gramsById.B ?? 0,
    c: gramsById.C ?? 0,
    filler: gramsById[FILLER_SLOT_ID] ?? 0,
    thickener: gramsById[THICKENER_SLOT_ID] ?? 0,
  };
}

function binderSumFromDriver(
  recipe: BlendingRecipe,
  driver: MixDriverId,
  grams: number,
): number {
  const tp = totalParts(recipe);

  switch (driver) {
    case "A":
    case "B":
    case "C": {
      const driverParts = part(recipe, driver);
      if (!(driverParts > 0) || !(tp > 0)) return grams;
      return grams * (tp / driverParts);
    }
    case "FILLER": {
      const fillerPct = pctOptional(recipe, FILLER_SLOT_ID);
      if (fillerPct <= 0) return grams;
      return grams / (fillerPct / 100);
    }
    case "THICKENER": {
      const thickenerPct = pctOptional(recipe, THICKENER_SLOT_ID);
      if (thickenerPct <= 0) return grams;
      return grams / (thickenerPct / 100);
    }
    case "TOTAL":
      return grams / binderToTotalMultiplier(recipe);
  }
}

/**
 * Recalculate all mix weights from one driver value while keeping recipe ratios locked.
 * Returns [TOTAL, A, B, C, THICKENER, FILLER] in grams — absent ingredients are 0.
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
  let c = raw.c;
  let filler = raw.filler;
  let thickener = raw.thickener;

  if (!recipeHasIngredient(recipe, "C")) c = 0;
  if (!recipeHasIngredient(recipe, FILLER_SLOT_ID)) filler = 0;
  if (!recipeHasIngredient(recipe, THICKENER_SLOT_ID)) thickener = 0;

  switch (driver) {
    case "A":
      a = g;
      b = Math.round(b);
      c = Math.round(c);
      filler = Math.round(filler);
      thickener = Math.round(thickener);
      break;
    case "B":
      b = g;
      a = Math.round(a);
      c = Math.round(c);
      filler = Math.round(filler);
      thickener = Math.round(thickener);
      break;
    case "C":
      c = g;
      a = Math.round(a);
      b = Math.round(b);
      filler = Math.round(filler);
      thickener = Math.round(thickener);
      break;
    case "FILLER":
      filler = g;
      a = Math.round(a);
      b = Math.round(b);
      c = Math.round(c);
      thickener = Math.round(thickener);
      break;
    case "THICKENER":
      thickener = g;
      a = Math.round(a);
      b = Math.round(b);
      c = Math.round(c);
      filler = Math.round(filler);
      break;
    case "TOTAL":
      a = Math.round(a);
      b = Math.round(b);
      c = Math.round(c);
      filler = Math.round(filler);
      thickener = Math.round(thickener);
      return [g, a, b, c, thickener, filler];
  }

  const total = a + b + c + filler + thickener;
  return [total, a, b, c, thickener, filler];
}

/** Initial mix from a binder base (A + B [+ C]), default 1000 g. */
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

/** Live binder grams from a mix vector (A + B + optional C). */
export function mixBinderGrams(recipe: BlendingRecipe, values: number[]): number {
  let sum = 0;
  if (recipeHasIngredient(recipe, "A")) sum += values[1] ?? 0;
  if (recipeHasIngredient(recipe, "B")) sum += values[2] ?? 0;
  if (recipeHasIngredient(recipe, "C")) sum += values[3] ?? 0;
  return sum;
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
  const pctEntry = recipe.binderPercents.find(
    (p) =>
      p.id === id ||
      (isFillerSlotId(id) && isFillerSlotId(p.id)) ||
      (isThickenerSlotId(id) && isThickenerSlotId(p.id)),
  );
  if (pctEntry) return `${pctEntry.percent}%`;
  return "";
}

function formatRatioNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(2);
  return s.replace(/\.?0+$/, "");
}

function formatRecipeIngredientId(id: string): string {
  if (id.length <= 1) return id.toUpperCase();
  return id.charAt(0).toUpperCase() + id.slice(1).toLowerCase();
}

/** Compact ingredient line, e.g. "2:1 Resin/Hardener + 533.33% Sand Filler." */
export function formatRecipeSummary(
  recipe: BlendingRecipe,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): string {
  const ratio = recipe.binderParts.map((p) => formatRatioNumber(p.parts)).join(":");
  const binderLabels = recipe.binderParts
    .map((p) => getIngredientLabel(recipe, p.id, language) ?? p.id)
    .join("/");

  let summary = "";
  if (ratio && binderLabels) summary += `${ratio} ${binderLabels}`;
  else if (ratio) summary += ratio;
  else if (binderLabels) summary += binderLabels;

  for (const entry of recipe.binderPercents) {
    const label = getIngredientLabel(recipe, entry.id, language);
    const name = label
      ? `${formatRecipeIngredientId(entry.id)} ${label}`
      : formatRecipeIngredientId(entry.id);
    summary += ` + ${formatRatioNumber(entry.percent)}% ${name}`;
  }

  return summary ? `${summary}.` : "";
}

/** Ratio prefix vs remainder for compact displays. */
export function getRecipeSummaryParts(
  recipe: BlendingRecipe,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): {
  ratio: string;
  detail: string;
} {
  const ratio = recipe.binderParts.map((p) => formatRatioNumber(p.parts)).join(":");
  const full = formatRecipeSummary(recipe, language);
  if (!ratio) return { ratio: "", detail: full };
  if (full.startsWith(ratio)) {
    return { ratio, detail: full.slice(ratio.length).trimStart() };
  }
  return { ratio: "", detail: full };
}

/** Structured ratio for recipe ratio cards — value + unit on separate rows. */
export function getLockedRatioDisplay(
  recipe: BlendingRecipe,
  id: string,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): { value: string; unit: string } {
  const partEntry = recipe.binderParts.find((p) => p.id === id);
  if (partEntry) {
    return {
      value: formatRatioNumber(partEntry.parts),
      unit: partsUnitLabel(language),
    };
  }
  const pctEntry = recipe.binderPercents.find(
    (p) =>
      p.id === id ||
      (isFillerSlotId(id) && isFillerSlotId(p.id)) ||
      (isThickenerSlotId(id) && isThickenerSlotId(p.id)),
  );
  if (pctEntry) return { value: formatRatioNumber(pctEntry.percent), unit: "%" };
  return { value: "", unit: "" };
}

/**
 * Display label for any mix ingredient.
 * FILLER/THICKENER use a stored material name when set; legacy role labels still localize.
 */
export function getIngredientLabel(
  recipe: BlendingRecipe,
  id: string,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): string | undefined {
  if (isFillerSlotId(id) || isThickenerSlotId(id)) {
    const pctLabel = recipe.binderPercents.find(
      (p) =>
        p.id === id ||
        (isFillerSlotId(id) && isFillerSlotId(p.id)) ||
        (isThickenerSlotId(id) && isThickenerSlotId(p.id)),
    )?.label?.trim();
    if (pctLabel && !isLegacyRoleLabel(pctLabel)) return pctLabel;
    const canonical = isFillerSlotId(id) ? FILLER_SLOT_ID : THICKENER_SLOT_ID;
    return standardIngredientLabel(canonical, language);
  }
  const standard = standardIngredientLabel(id, language);
  if (standard) return standard;
  const partLabel = recipe.binderParts.find((p) => p.id === id)?.label?.trim();
  if (partLabel) return partLabel;
  const pctLabel = recipe.binderPercents.find((p) => p.id === id)?.label?.trim();
  if (pctLabel) return pctLabel;
  return undefined;
}

/** Secondary line under entity id on mix cards. */
export function getEntityMetaLabel(
  recipe: BlendingRecipe,
  id: string,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): string | undefined {
  if (id === "TOTAL") {
    return totalMetaLabel(language);
  }
  const label = getIngredientLabel(recipe, id, language);
  if (label) return label;
  if (id === "A" || id === "B" || id === "C") {
    const sub = displayLabel(recipe.nameSubline, language).trim();
    if (sub) return sub;
  }
  return undefined;
}

/** @deprecated Use getIngredientLabel */
export function getBinderPartLabel(
  recipe: BlendingRecipe,
  id: string,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): string | undefined {
  return getIngredientLabel(recipe, id, language);
}
