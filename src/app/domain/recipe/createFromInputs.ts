import type { BlendingRecipe, PercentOfBinder } from "./types";

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
  filler: number;
  thickener: number;
};

export type RecipeFormulaInput = {
  name: string;
  nameSubline?: string;
  description?: string;
  aParts: number;
  bParts: number;
  /** Percent of binder (A+B). */
  fillerPercent: number;
  thickenerPercent: number;
  /** Optional binder reference grams for REC. BATCH. */
  initialBinderSum?: number;
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

/** Reduce A:B grams to integer parts (same structure as presets). */
export function partsFromWeights(aGrams: number, bGrams: number): { aParts: number; bParts: number } {
  const a = Math.max(0, aGrams);
  const b = Math.max(0, bGrams);
  if (!(a > 0) || !(b > 0)) return { aParts: 2, bParts: 1 };
  const scale = 1000;
  const ai = Math.round(a * scale);
  const bi = Math.round(b * scale);
  const g = gcd(ai, bi);
  return { aParts: ai / g, bParts: bi / g };
}

function binderPercentsFromWeights(
  binderSum: number,
  fillerGrams: number,
  thickenerGrams: number,
): PercentOfBinder[] {
  if (!(binderSum > 0)) return [];
  const list: PercentOfBinder[] = [];
  if (fillerGrams > 0) {
    list.push({
      id: "SAND",
      percent: (fillerGrams / binderSum) * 100,
      label: "Filler",
    });
  }
  if (thickenerGrams > 0) {
    list.push({
      id: "TIX",
      percent: (thickenerGrams / binderSum) * 100,
      label: "Thickener",
    });
  }
  return list;
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
  if (input.filler < 0 || input.thickener < 0) return "Filler and thickener cannot be negative";
  return null;
}

export function validateFormulaInput(input: RecipeFormulaInput): string | null {
  if (!input.name.trim()) return "Name is required";
  const descErr = validateRecipeCardDescription(input.description);
  if (descErr) return descErr;
  if (!(input.aParts > 0) || !(input.bParts > 0)) return "A and B parts must be greater than 0";
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
  const binderSum = input.a + input.b;
  const { aParts, bParts } = partsFromWeights(input.a, input.b);
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    nameSubline: input.nameSubline?.trim() || undefined,
    description: normalizedDescription(input.description),
    initialBinderSum: Math.round(binderSum),
    binderParts: [
      { id: "A", parts: aParts, label: "Resin" },
      { id: "B", parts: bParts, label: "Hardener" },
    ],
    binderPercents: binderPercentsFromWeights(binderSum, input.filler, input.thickener),
  };
}

/** Build recipe from explicit ratio / percent formula. */
export function blendingRecipeFromFormula(input: RecipeFormulaInput): BlendingRecipe {
  const percents: PercentOfBinder[] = [];
  if (input.fillerPercent > 0) {
    percents.push({ id: "SAND", percent: input.fillerPercent, label: "Filler" });
  }
  if (input.thickenerPercent > 0) {
    percents.push({ id: "TIX", percent: input.thickenerPercent, label: "Thickener" });
  }
  const binder =
    input.initialBinderSum != null && input.initialBinderSum > 0
      ? Math.round(input.initialBinderSum)
      : undefined;

  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    nameSubline: input.nameSubline?.trim() || undefined,
    description: normalizedDescription(input.description),
    initialBinderSum: binder,
    binderParts: [
      { id: "A", parts: input.aParts, label: "Resin" },
      { id: "B", parts: input.bParts, label: "Hardener" },
    ],
    binderPercents: percents,
  };
}

export function formatRecipeFormulaSummary(recipe: BlendingRecipe): string {
  const a = recipe.binderParts.find((p) => p.id === "A")?.parts ?? 0;
  const b = recipe.binderParts.find((p) => p.id === "B")?.parts ?? 0;
  const sand = recipe.binderPercents.find((p) => p.id === "SAND");
  const tix = recipe.binderPercents.find((p) => p.id === "TIX");
  const bits = [`${a}:${b} Resin/Hardener`];
  if (sand) bits.push(`${roundPct(sand.percent)}% Filler`);
  if (tix) bits.push(`${roundPct(tix.percent)}% Thickener`);
  return bits.join(" · ");
}

function roundPct(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}
