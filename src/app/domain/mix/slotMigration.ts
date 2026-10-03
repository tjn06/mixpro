import type { BlendingRecipe, PercentOfBinder } from "../recipe/types";

/** Canonical additive slot ids (roles). */
export const FILLER_SLOT_ID = "FILLER" as const;
export const THICKENER_SLOT_ID = "THICKENER" as const;

/** Legacy additive slot ids (material nicknames) — still accepted on load. */
export const LEGACY_FILLER_SLOT_ID = "SAND" as const;
export const LEGACY_THICKENER_SLOT_ID = "TIX" as const;

export type AdditiveSlotId = typeof FILLER_SLOT_ID | typeof THICKENER_SLOT_ID;

/** Map legacy or current additive id → canonical role id. */
export function canonicalAdditiveSlotId(id: string): string {
  if (id === LEGACY_FILLER_SLOT_ID || id === FILLER_SLOT_ID) return FILLER_SLOT_ID;
  if (id === LEGACY_THICKENER_SLOT_ID || id === THICKENER_SLOT_ID) {
    return THICKENER_SLOT_ID;
  }
  return id;
}

/** True if id refers to the filler role (FILLER or legacy SAND). */
export function isFillerSlotId(id: string): boolean {
  return id === FILLER_SLOT_ID || id === LEGACY_FILLER_SLOT_ID;
}

/** True if id refers to the thickener role (THICKENER or legacy TIX). */
export function isThickenerSlotId(id: string): boolean {
  return id === THICKENER_SLOT_ID || id === LEGACY_THICKENER_SLOT_ID;
}

/** Normalize one percent-of-binder entry to role ids. */
export function normalizePercentOfBinder(
  entry: PercentOfBinder,
): PercentOfBinder {
  return {
    ...entry,
    id: canonicalAdditiveSlotId(entry.id),
  };
}

/** Normalize recipe additive ids SAND/TIX → FILLER/THICKENER. */
export function normalizeRecipeAdditiveSlots(
  recipe: BlendingRecipe,
): BlendingRecipe {
  if (!recipe.binderPercents?.length) return recipe;
  let changed = false;
  const binderPercents = recipe.binderPercents.map((entry) => {
    const next = normalizePercentOfBinder(entry);
    if (next.id !== entry.id) changed = true;
    return next;
  });
  return changed ? { ...recipe, binderPercents } : recipe;
}

/**
 * Mix amount bag — accepts legacy `sand`/`tix` keys and writes canonical
 * `filler`/`thickener`.
 */
export type MixSlotValueBag = {
  total: number;
  a: number;
  b: number;
  c?: number;
  filler: number;
  thickener: number;
};

/** Raw persisted shape that may still use sand/tix. */
export type LegacyMixSlotValueBag = {
  total?: number;
  a?: number;
  b?: number;
  c?: number;
  filler?: number;
  thickener?: number;
  /** @deprecated Use `filler`. */
  sand?: number;
  /** @deprecated Use `thickener`. */
  tix?: number;
};

export function normalizeMixSlotValues(
  raw: LegacyMixSlotValueBag | null | undefined,
): MixSlotValueBag {
  const total = Number(raw?.total) || 0;
  const a = Number(raw?.a) || 0;
  const b = Number(raw?.b) || 0;
  const c = raw?.c != null ? Number(raw.c) || 0 : 0;
  const filler =
    raw?.filler != null
      ? Number(raw.filler) || 0
      : Number(raw?.sand) || 0;
  const thickener =
    raw?.thickener != null
      ? Number(raw.thickener) || 0
      : Number(raw?.tix) || 0;
  return { total, a, b, c, filler, thickener };
}
