import {
  formatFlexSelectLabelEntries,
  listSelectedFlexSelectEntries,
  listSelectedFlexSelectLabels,
} from "../select/catalogLookup";
import type { FlexSelectSelection } from "../select/selection";
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
): string[] {
  return formatFlexSelectLabelEntries(
    listSelectedFlexSelectEntries(selection, catalog, customConsumables),
  );
}
