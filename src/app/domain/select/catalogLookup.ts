import type { FlexSelectSelection } from "./selection";
import { flexSelectSelectionIds } from "./selection";
import type { FlexSelectItem } from "./types";
import {
  isRentedSelectionKey,
  parseSelectionLineKey,
} from "./acquisition";

/** Lookup label for an id in a nested flex-select catalog. */
export function findFlexSelectLabel(
  id: string,
  catalog: readonly FlexSelectItem[],
): string | null {
  const { catalogId } = parseSelectionLineKey(id);
  for (const item of catalog) {
    if (item.id === catalogId) return item.label;
    if (item.children?.length) {
      const nested = findFlexSelectLabel(catalogId, item.children);
      if (nested) return nested;
    }
  }
  return null;
}

export type FlexSelectLabelEntry = {
  id: string;
  label: string;
  qty: number;
  rented?: boolean;
};

/** Resolve display labels + quantities for a selection. */
export function listSelectedFlexSelectEntries(
  selection: FlexSelectSelection,
  catalog: readonly FlexSelectItem[],
  customItems: readonly FlexSelectItem[] = [],
): FlexSelectLabelEntry[] {
  const entries: FlexSelectLabelEntry[] = [];
  for (const id of flexSelectSelectionIds(selection)) {
    const rented = isRentedSelectionKey(id);
    const label =
      findFlexSelectLabel(id, catalog) ?? findFlexSelectLabel(id, customItems);
    if (!label) continue;
    entries.push({
      id,
      label,
      qty: selection[id] ?? 1,
      rented,
    });
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
    .map((id) => {
      const rented = isRentedSelectionKey(id);
      const label =
        findFlexSelectLabel(id, catalog) ??
        findFlexSelectLabel(id, customItems);
      if (!label) return null;
      return rented ? `${label} · Rented` : label;
    })
    .filter((label): label is string => Boolean(label));
}

/** Labels with ×qty when qty > 1; rented lines tagged for text reports. */
export function formatFlexSelectLabelEntries(
  entries: readonly FlexSelectLabelEntry[],
): string[] {
  return entries.map((entry) => {
    const base = entry.rented ? `${entry.label} · Rented` : entry.label;
    return entry.qty > 1 ? `${base} ×${entry.qty}` : base;
  });
}
