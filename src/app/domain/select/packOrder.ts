import { flexSelectItemHasOptions, type FlexSelectItem } from "./types";

/**
 * Rough relative width for flex-wrap packing (character heuristic).
 * Dropdowns use the widest option label; wear / + reserve a little extra.
 */
export function estimateFlexSelectChipWeight(item: FlexSelectItem): number {
  if (!flexSelectItemHasOptions(item)) {
    return item.label.length;
  }
  let widest = item.label.length;
  for (const child of item.children ?? []) {
    if (child.label.length > widest) widest = child.label.length;
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
): FlexSelectItem[] {
  return [...items].sort((a, b) => {
    const byWidth =
      estimateFlexSelectChipWeight(b) - estimateFlexSelectChipWeight(a);
    if (byWidth !== 0) return byWidth;
    return a.label.localeCompare(b.label, "sv");
  });
}
