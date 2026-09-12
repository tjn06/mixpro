import type { AppLanguage } from "../../i18n/language";
import {
  displayLabel,
  localizedLabel,
  type LocalizedLabel,
} from "../../i18n/localizedLabel";

/**
 * Canonical role names for standard mix slots.
 * Stored recipe `label` fields may still be English from older saves —
 * UI/report display should resolve by id, not the persisted string.
 */
export const STANDARD_INGREDIENT_LABELS: Record<string, LocalizedLabel> = {
  A: localizedLabel("Resin", "Bas"),
  B: localizedLabel("Hardener", "Härdare"),
  SAND: localizedLabel("Filler", "Fyllnad"),
  TIX: localizedLabel("Thickener", "Förtjockare"),
};

export const PARTS_UNIT_LABEL = localizedLabel("PARTS", "DELAR");

export const TOTAL_META_LABEL = localizedLabel(
  "Total epoxy mass",
  "Total epoximassa",
);

export function standardIngredientLabel(
  id: string,
  language: AppLanguage,
): string | undefined {
  const label = STANDARD_INGREDIENT_LABELS[id];
  return label ? displayLabel(label, language) : undefined;
}

export function partsUnitLabel(language: AppLanguage): string {
  return displayLabel(PARTS_UNIT_LABEL, language);
}

export function totalMetaLabel(language: AppLanguage): string {
  return displayLabel(TOTAL_META_LABEL, language);
}
