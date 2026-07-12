/** Part ratio among binder ingredients (e.g. A:2, B:1). */
export interface PartRatio {
  id: string;
  parts: number;
  /** Human-readable name shown under the part id (e.g. Resin, Hardener). */
  label?: string;
}

/** Percent of (A + B) for an additive (e.g. SAND:555 → 5.55× binder). */
export interface PercentOfBinder {
  id: string;
  percent: number;
  /** Human-readable name (e.g. Filler, Thickener). */
  label?: string;
}

/** Locked blending recipe — passed from parent; not editable in the mixer view. */
export interface BlendingRecipe {
  id: string;
  name?: string;
  /** Second line under recipe name in the meta card. */
  nameSubline?: string;
  /** Binder (A + B) reference in grams for initial mix and REC. BATCH reset. */
  initialBinderSum?: number;
  binderParts: PartRatio[];
  binderPercents: PercentOfBinder[];
}

export const DEFAULT_RECIPE: BlendingRecipe = {
  id: "default",
  name: "Standard",
  nameSubline: "Epoxy",
  initialBinderSum: 2250,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [
    { id: "SAND", percent: 1600 / 3, label: "Filler" },
  ],
};

/** Same as Standard Lagning but SAND 10 kg (not 12 kg) at 2250 g binder. */
export const STANDARD_BLOT_RECIPE: BlendingRecipe = {
  id: "standard-blot",
  name: "Standard Blöt",
  nameSubline: "Epoxy",
  initialBinderSum: 2250,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [{ id: "SAND", percent: 4000 / 9, label: "Filler" }],
};

/** A 1.5 kg · B 0.75 kg (2:1) · SAND 10 kg · TIX 100 g at 2250 g binder (A + B). */
export const FAS_SOCKEL_RECIPE: BlendingRecipe = {
  id: "fas-sockel",
  name: "Fas/Sockel",
  nameSubline: "Epoxy",
  initialBinderSum: 2250,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [
    { id: "SAND", percent: 4000 / 9, label: "Filler" },
    { id: "TIX", percent: 40 / 9, label: "Thickener" },
  ],
};

/** A 1 kg · B 0.5 kg (2:1) at 1500 g binder — no fillers. */
export const PRIMER_RECIPE: BlendingRecipe = {
  id: "primer",
  name: "Primer",
  nameSubline: "Epoxy",
  initialBinderSum: 1500,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [],
};

/** A 1 kg · B 0.5 kg (2:1) at 1500 g binder — no fillers. */
export const LACK_RECIPE: BlendingRecipe = {
  id: "lack",
  name: "Lack",
  nameSubline: "Epoxy",
  initialBinderSum: 1500,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [],
};

/** A 0.5 kg · B 0.25 kg (2:1) · TIX 50 g at 750 g binder (A + B). */
export const TIXBLANDNING_RECIPE: BlendingRecipe = {
  id: "tixblandning",
  name: "Tixblandning",
  nameSubline: "Epoxy",
  initialBinderSum: 750,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [{ id: "TIX", percent: 20 / 3, label: "Thickener" }],
};

export const PRESET_RECIPES: BlendingRecipe[] = [
  DEFAULT_RECIPE,
  STANDARD_BLOT_RECIPE,
  FAS_SOCKEL_RECIPE,
  PRIMER_RECIPE,
  LACK_RECIPE,
  TIXBLANDNING_RECIPE,
];

export function recipeMenuLabel(recipe: BlendingRecipe): string {
  const name = recipe.name?.trim() || recipe.id;
  const sub = recipe.nameSubline?.trim();
  return sub ? `${name} — ${sub}` : name;
}
