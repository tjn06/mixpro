/** Mix value order — index 0 is TOTAL, then binder / additive parts. */
export const MIX_PARAMS = [
  { id: "TOTAL", color: "#34d399", glow: "#34d39944", isKg: true },
  { id: "A", color: "#a855f7", glow: "#a855f744", isKg: true },
  { id: "B", color: "#22d3ee", glow: "#22d3ee44", isKg: true },
  { id: "C", color: "#f472b6", glow: "#f472b644", isKg: true },
  { id: "THICKENER", color: "#a3e635", glow: "#a3e63544", isKg: false },
  { id: "FILLER", color: "#f97316", glow: "#f9731644", isKg: true },
] as const;

export type MixParam = (typeof MIX_PARAMS)[number];

/** Max ingredient cards the mixer UI can show (excludes TOTAL). */
export const MAX_MIX_INGREDIENT_ENTITIES = 4;

export function mixParamIndex(id: string): number {
  return MIX_PARAMS.findIndex((p) => p.id === id);
}

export function formatMixAmount(grams: number, isKg: boolean): string {
  return isKg ? (grams / 1000).toFixed(3) : Math.round(grams).toString();
}
