import type { AppLanguage } from "../../i18n/language";
import { DEFAULT_UI_LANGUAGE } from "../../i18n/language";
import { displayLabel, labelLength } from "../../i18n/localizedLabel";
import { flexSelectItemHasOptions, type FlexSelectItem } from "./types";

/**
 * Rough relative width for flex-wrap packing (character heuristic).
 * Dropdowns use the widest option label; wear / + reserve a little extra.
 */
export function estimateFlexSelectChipWeight(
  item: FlexSelectItem,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): number {
  if (!flexSelectItemHasOptions(item)) {
    return labelLength(item.label, language);
  }
  let widest = labelLength(item.label, language);
  for (const child of item.children ?? []) {
    const len = labelLength(child.label, language);
    if (len > widest) widest = len;
  }
  let extra = 3; // clone + column when present
  if (item.requiresWear) extra += 5;
  return widest + extra;
}

/**
 * Largest-first order so smaller chips tend to fill leftover row space
 * instead of leaving almost-empty rows after wide dropdowns.
 */
export function orderFlexSelectItemsForPack(
  items: readonly FlexSelectItem[],
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): FlexSelectItem[] {
  return [...items].sort((a, b) => {
    const byWidth =
      estimateFlexSelectChipWeight(b, language) -
      estimateFlexSelectChipWeight(a, language);
    if (byWidth !== 0) return byWidth;
    return displayLabel(a.label, language).localeCompare(
      displayLabel(b.label, language),
      language === "sv" ? "sv" : "en",
    );
  });
}
