import type { FlexSelectSelection } from "./selection";
import { flexSelectSelectionIds } from "./selection";
import type { FlexSelectItem } from "./types";

/** Lookup label for an id in a nested flex-select catalog. */
export function findFlexSelectLabel(
  id: string,
  catalog: readonly FlexSelectItem[],
): string | null {
  for (const item of catalog) {
    if (item.id === id) return item.label;
    if (item.children?.length) {
      const nested = findFlexSelectLabel(id, item.children);
      if (nested) return nested;
    }
  }
  return null;
}

export type FlexSelectLabelEntry = {
  id: string;
  label: string;
  qty: number;
};

/** Resolve display labels + quantities for a selection. */
export function listSelectedFlexSelectEntries(
  selection: FlexSelectSelection,
  catalog: readonly FlexSelectItem[],
  customItems: readonly FlexSelectItem[] = [],
): FlexSelectLabelEntry[] {
  const entries: FlexSelectLabelEntry[] = [];
  for (const id of flexSelectSelectionIds(selection)) {
    const label =
      findFlexSelectLabel(id, catalog) ?? findFlexSelectLabel(id, customItems);
    if (!label) continue;
    entries.push({ id, label, qty: selection[id] ?? 1 });
  }
  return entries;
}

/** Resolve display labels for selected ids (catalog + custom simple items). */
export function listSelectedFlexSelectLabels(
  selectedIds: readonly string[],
  catalog: readonly FlexSelectItem[],
  customItems: readonly FlexSelectItem[] = [],
): string[] {
  return selectedIds
    .map(
      (id) =>
        findFlexSelectLabel(id, catalog) ?? findFlexSelectLabel(id, customItems),
    )
    .filter((label): label is string => Boolean(label));
}

/** Labels with ×qty when qty > 1. */
export function formatFlexSelectLabelEntries(
  entries: readonly FlexSelectLabelEntry[],
): string[] {
  return entries.map((entry) =>
    entry.qty > 1 ? `${entry.label} ×${entry.qty}` : entry.label,
  );
}
