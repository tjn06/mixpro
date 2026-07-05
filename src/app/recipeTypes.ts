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
  binderParts: PartRatio[];
  binderPercents: PercentOfBinder[];
}

export const DEFAULT_RECIPE: BlendingRecipe = {
  id: "default",
  name: "Standard Lagning,",
  nameSubline: "Epoxy",
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [
    { id: "SAND", percent: 555, label: "Filler" },
    { id: "TIX", percent: 5, label: "Thickener" },
  ],
};
