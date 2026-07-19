/** Generic selectable node for Responsive Flex Select View. */
export type FlexSelectItem = {
  id: string;
  label: string;
  /**
   * When present, chip is a variant select: closed chip shows `label` only
   * (sized to the widest option). Options open in an overlay menu.
   * One variant selected at a time; parent id is never selected.
   */
  children?: FlexSelectItem[];
};

/** True when the chip opens a dropdown of alternatives. */
export function flexSelectItemHasOptions(item: FlexSelectItem): boolean {
  return (item.children?.length ?? 0) > 0;
}

/** Currently chosen option under a dropdown parent, if any. */
export function findSelectedOption(
  item: FlexSelectItem,
  selectedIds: ReadonlySet<string>,
): FlexSelectItem | null {
  if (!item.children?.length) return null;
  return item.children.find((child) => selectedIds.has(child.id)) ?? null;
}

/** Quantity for the selected option in a dropdown group (0 if none). */
export function findSelectedOptionQty(
  item: FlexSelectItem,
  selection: Readonly<Record<string, number>>,
): { option: FlexSelectItem; qty: number } | null {
  if (!item.children?.length) return null;
  for (const child of item.children) {
    const qty = selection[child.id] ?? 0;
    if (qty >= 1) return { option: child, qty };
  }
  return null;
}

/** Ids belonging to a dropdown group (options only — parent is never selected). */
export function optionIdsForItem(item: FlexSelectItem): string[] {
  return item.children?.map((child) => child.id) ?? [];
}
