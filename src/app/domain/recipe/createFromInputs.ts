import type { AppLanguage } from "../../i18n/language";
import { DEFAULT_UI_LANGUAGE } from "../../i18n/language";
import {
  FILLER_SLOT_ID,
  THICKENER_SLOT_ID,
} from "../mix/slotMigration";
import type { BlendingRecipe, PercentOfBinder, PartRatio } from "./types";
import { getIngredientLabel } from "./calc";

/** Entry context — Create Recipe does not know the host; caller decides. */
export type CreateRecipeEntryContext =
  | { source: "library" }
  | { source: "session"; sessionId: string };

export type RecipeCreateMethod = "weights" | "formula";

/** Card blurb limits — fits recipe list sublabel (similar to preset copy). */
export const RECIPE_CARD_DESCRIPTION_MAX_CHARS = 72;
export const RECIPE_CARD_DESCRIPTION_MAX_WORDS = 12;

export type RecipeWeightsInput = {
  name: string;
  nameSubline?: string;
  description?: string;
  /** Grams */
  a: number;
  b: number;
  /** Optional third binder component grams. */
  c?: number;
  filler: number;
  thickener: number;
  /** Display name for the FILLER slot (Sand / Water / custom). */
  fillerLabel?: string;
  /** Display name for the THICKENER slot (Tix / custom). */
  thickenerLabel?: string;
};

export type RecipeFormulaInput = {
  name: string;
  nameSubline?: string;
  description?: string;
  aParts: number;
  bParts: number;
  /** Optional third binder component parts. */
  cParts?: number;
  /** Percent of binder (A+B[+C]). */
  fillerPercent: number;
  thickenerPercent: number;
  /** Optional binder reference grams for REC. BATCH. */
  initialBinderSum?: number;
  fillerLabel?: string;
  thickenerLabel?: string;
};

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** Reduce A:B[:C] grams to integer parts (same structure as presets). */
export function partsFromWeights(
  aGrams: number,
  bGrams: number,
  cGrams = 0,
): { aParts: number; bParts: number; cParts: number } {
  const a = Math.max(0, aGrams);
  const b = Math.max(0, bGrams);
  const c = Math.max(0, cGrams);
  if (!(a > 0) || !(b > 0)) return { aParts: 2, bParts: 1, cParts: 0 };
  const scale = 1000;
  const ai = Math.round(a * scale);
  const bi = Math.round(b * scale);
  const ci = Math.round(c * scale);
  if (!(c > 0)) {
    const g = gcd(ai, bi);
    return { aParts: ai / g, bParts: bi / g, cParts: 0 };
  }
  const g = gcd(gcd(ai, bi), ci);
  return { aParts: ai / g, bParts: bi / g, cParts: ci / g };
}

function binderPercentsFromWeights(
  binderSum: number,
  fillerGrams: number,
  thickenerGrams: number,
  fillerLabel?: string,
  thickenerLabel?: string,
): PercentOfBinder[] {
  if (!(binderSum > 0)) return [];
  const list: PercentOfBinder[] = [];
  if (fillerGrams > 0) {
    list.push({
      id: FILLER_SLOT_ID,
      percent: (fillerGrams / binderSum) * 100,
      label: fillerLabel?.trim() || "Filler",
    });
  }
  if (thickenerGrams > 0) {
    list.push({
      id: THICKENER_SLOT_ID,
      percent: (thickenerGrams / binderSum) * 100,
      label: thickenerLabel?.trim() || "Thickener",
    });
  }
  return list;
}

function binderPartsFromRatio(
  aParts: number,
  bParts: number,
  cParts: number,
): PartRatio[] {
  const parts: PartRatio[] = [
    { id: "A", parts: aParts, label: "Resin" },
    { id: "B", parts: bParts, label: "Hardener" },
  ];
  if (cParts > 0) {
    parts.push({ id: "C", parts: cParts, label: "Component C" });
  }
  return parts;
}

export function countDescriptionWords(raw: string): number {
  const t = raw.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

/** Optional card description — empty is fine; enforce max chars / words when set. */
export function validateRecipeCardDescription(raw: string | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  if (t.length > RECIPE_CARD_DESCRIPTION_MAX_CHARS) {
    return `Description max ${RECIPE_CARD_DESCRIPTION_MAX_CHARS} characters`;
  }
  if (countDescriptionWords(t) > RECIPE_CARD_DESCRIPTION_MAX_WORDS) {
    return `Description max ${RECIPE_CARD_DESCRIPTION_MAX_WORDS} words`;
  }
  return null;
}

function normalizedDescription(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  return t ? t : undefined;
}

export function validateWeightsInput(input: RecipeWeightsInput): string | null {
  if (!input.name.trim()) return "Name is required";
  const descErr = validateRecipeCardDescription(input.description);
  if (descErr) return descErr;
  if (!(input.a > 0) || !(input.b > 0)) return "Resin (A) and Hardener (B) must be greater than 0";
  if (input.c != null && input.c < 0) return "Component C cannot be negative";
  if (input.filler < 0 || input.thickener < 0) return "Filler and thickener cannot be negative";
  return null;
}

export function validateFormulaInput(input: RecipeFormulaInput): string | null {
  if (!input.name.trim()) return "Name is required";
  const descErr = validateRecipeCardDescription(input.description);
  if (descErr) return descErr;
  if (!(input.aParts > 0) || !(input.bParts > 0)) return "A and B parts must be greater than 0";
  if (input.cParts != null && input.cParts < 0) return "C parts cannot be negative";
  if (input.fillerPercent < 0 || input.thickenerPercent < 0) {
    return "Percents cannot be negative";
  }
  if (input.initialBinderSum != null && input.initialBinderSum < 0) {
    return "Binder reference cannot be negative";
  }
  return null;
}

/** Build recipe from measured component weights (reverse-engineer formula). */
export function blendingRecipeFromWeights(input: RecipeWeightsInput): BlendingRecipe {
  const cGrams = input.c != null && input.c > 0 ? input.c : 0;
  const binderSum = input.a + input.b + cGrams;
  const { aParts, bParts, cParts } = partsFromWeights(input.a, input.b, cGrams);
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    nameSubline: input.nameSubline?.trim() || undefined,
    description: normalizedDescription(input.description),
    initialBinderSum: Math.round(binderSum),
    binderParts: binderPartsFromRatio(aParts, bParts, cParts),
    binderPercents: binderPercentsFromWeights(
      binderSum,
      input.filler,
      input.thickener,
      input.fillerLabel,
      input.thickenerLabel,
    ),
  };
}

/** Build recipe from explicit ratio / percent formula. */
export function blendingRecipeFromFormula(input: RecipeFormulaInput): BlendingRecipe {
  const percents: PercentOfBinder[] = [];
  if (input.fillerPercent > 0) {
    percents.push({
      id: FILLER_SLOT_ID,
      percent: input.fillerPercent,
      label: input.fillerLabel?.trim() || "Filler",
    });
  }
  if (input.thickenerPercent > 0) {
    percents.push({
      id: THICKENER_SLOT_ID,
      percent: input.thickenerPercent,
      label: input.thickenerLabel?.trim() || "Thickener",
    });
  }
  const binder =
    input.initialBinderSum != null && input.initialBinderSum > 0
      ? Math.round(input.initialBinderSum)
      : undefined;
  const cParts = input.cParts != null && input.cParts > 0 ? input.cParts : 0;

  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    nameSubline: input.nameSubline?.trim() || undefined,
    description: normalizedDescription(input.description),
    initialBinderSum: binder,
    binderParts: binderPartsFromRatio(input.aParts, input.bParts, cParts),
    binderPercents: percents,
  };
}

export function formatRecipeFormulaSummary(
  recipe: BlendingRecipe,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): string {
  const parts = recipe.binderParts;
  const ratio = parts.map((p) => roundPct(p.parts)).join(":");
  const labels = parts
    .map((p) => getIngredientLabel(recipe, p.id, language) ?? p.id)
    .join("/");
  const sand = recipe.binderPercents.find(
    (p) => p.id === FILLER_SLOT_ID || p.id === "SAND",
  );
  const tix = recipe.binderPercents.find(
    (p) => p.id === THICKENER_SLOT_ID || p.id === "TIX",
  );
  const filler = getIngredientLabel(recipe, FILLER_SLOT_ID, language) ?? "Filler";
  const thickener =
    getIngredientLabel(recipe, THICKENER_SLOT_ID, language) ?? "Thickener";
  const bits = [`${ratio} ${labels}`];
  if (sand) bits.push(`${roundPct(sand.percent)}% ${filler}`);
  if (tix) bits.push(`${roundPct(tix.percent)}% ${thickener}`);
  return bits.join(" · ");
}

function roundPct(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}
