import type { AppLanguage } from "../../i18n/language";
import { DEFAULT_UI_LANGUAGE } from "../../i18n/language";
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
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): string[] {
  return listSelectedFlexSelectLabels(
    selectedIds,
    catalog,
    customConsumables,
    language,
  );
}

export function listSelectedConsumableLabelEntries(
  selection: FlexSelectSelection,
  catalog: readonly ConsumableItem[],
  customConsumables: readonly ConsumableItem[] = [],
  wearByOptionId?: WearByOptionId,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): string[] {
  const entries = listSelectedFlexSelectEntries(
    selection,
    catalog,
    customConsumables,
    language,
  );
  return entries.map((entry) => {
    const base =
      entry.qty > 1 ? `${entry.label} ×${entry.qty}` : entry.label;
    return `${base}${wearLabelSuffix(wearByOptionId?.[entry.id])}`;
  });
}
