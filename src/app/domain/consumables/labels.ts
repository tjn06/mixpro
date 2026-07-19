import {
  listSelectedFlexSelectEntries,
  listSelectedFlexSelectLabels,
} from "../select/catalogLookup";
import type { FlexSelectSelection } from "../select/selection";
import {
  wearLabelSuffix,
  type WearByOptionId,
} from "../select/wear";
import type { ConsumableItem } from "./types";

export function listSelectedConsumableLabels(
  selectedIds: readonly string[],
  catalog: readonly ConsumableItem[],
  customConsumables: readonly ConsumableItem[] = [],
): string[] {
  return listSelectedFlexSelectLabels(selectedIds, catalog, customConsumables);
}

export function listSelectedConsumableLabelEntries(
  selection: FlexSelectSelection,
  catalog: readonly ConsumableItem[],
  customConsumables: readonly ConsumableItem[] = [],
  wearByOptionId?: WearByOptionId,
): string[] {
  const entries = listSelectedFlexSelectEntries(
    selection,
    catalog,
    customConsumables,
  );
  return entries.map((entry) => {
    const base =
      entry.qty > 1 ? `${entry.label} ×${entry.qty}` : entry.label;
    return `${base}${wearLabelSuffix(wearByOptionId?.[entry.id])}`;
  });
}
