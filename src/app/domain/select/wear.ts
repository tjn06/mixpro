import { flexSelectQty, type FlexSelectSelection } from "./selection";

/** Abrasion / slitage level for abrasive consumables. */
export type WearLevel = "lag" | "medel" | "hog";

export const WEAR_LEVELS: readonly WearLevel[] = ["lag", "medel", "hog"];

/** Compact UI / report labels. */
export const WEAR_LEVEL_LABELS: Record<WearLevel, string> = {
  lag: "L",
  medel: "M",
  hog: "H",
};

/** Full Swedish names for accessibility. */
export const WEAR_LEVEL_A11Y_LABELS: Record<WearLevel, string> = {
  lag: "Låg",
  medel: "Medel",
  hog: "Hög",
};

/** Empty wear slot label (reserved column). */
export const WEAR_PLACEHOLDER_LABEL = "–";

export type WearByOptionId = Readonly<Record<string, WearLevel>>;

export function isWearLevel(value: unknown): value is WearLevel {
  return value === "lag" || value === "medel" || value === "hog";
}

/** Drop wear keys that are not currently selected; keep valid enum values only. */
export function normalizeWearByOptionId(
  wear: unknown,
  selection: FlexSelectSelection,
): Record<string, WearLevel> {
  const out: Record<string, WearLevel> = {};
  if (!wear || typeof wear !== "object" || Array.isArray(wear)) return out;
  for (const [id, value] of Object.entries(wear as Record<string, unknown>)) {
    if (!id || flexSelectQty(selection, id) < 1) continue;
    if (isWearLevel(value)) out[id] = value;
  }
  return out;
}

/** Remove wear for ids no longer in selection (and optional explicit removals). */
export function pruneWearByOptionId(
  wear: WearByOptionId | undefined,
  selection: FlexSelectSelection,
  removeIds: readonly string[] = [],
): Record<string, WearLevel> {
  const remove = new Set(removeIds);
  const out: Record<string, WearLevel> = {};
  for (const [id, level] of Object.entries(wear ?? {})) {
    if (remove.has(id)) continue;
    if (flexSelectQty(selection, id) < 1) continue;
    out[id] = level;
  }
  return out;
}

export function setWearForOption(
  wear: WearByOptionId | undefined,
  optionId: string,
  level: WearLevel,
): Record<string, WearLevel> {
  return { ...wear, [optionId]: level };
}

export function wearLabelSuffix(level: WearLevel | undefined): string {
  if (!level) return "";
  return ` · ${WEAR_LEVEL_LABELS[level]}`;
}
