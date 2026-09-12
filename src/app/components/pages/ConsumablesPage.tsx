import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConsumableItem } from "../../domain/consumables/types";
import { omitCatalogIdFromSelection } from "../../domain/select/acquisition";
import { pruneWearByOptionId, type WearLevel } from "../../domain/select/wear";
import { useConsumablesLibraryStore } from "../../consumables/libraryStore";
import { CatalogHub } from "../catalog/CatalogHub";

/** Top-level Consumables — Report (picker + bottom sheet) / Edit against the global library. */
export function ConsumablesPage({
  onMenuClick,
  embedded = false,
}: {
  onMenuClick: () => void;
  embedded?: boolean;
}) {
  const { t } = useTranslation("common");
  const catalog = useConsumablesLibraryStore((s) => s.items);
  const addBilingualItem = useConsumablesLibraryStore(
    (s) => s.addBilingualItem,
  );
  const renameItem = useConsumablesLibraryStore((s) => s.renameItem);
  const removeItem = useConsumablesLibraryStore((s) => s.removeItem);

  const [selection, setSelection] = useState<Record<string, number>>({});
  const [wearByOptionId, setWearByOptionId] = useState<
    Record<string, WearLevel>
  >({});
  const [customConsumables, setCustomConsumables] = useState<ConsumableItem[]>(
    [],
  );

  const title = t("nav.consumables");

  return (
    <CatalogHub
      title={title}
      catalog={catalog}
      customItems={customConsumables}
      selection={selection}
      onSelectionChange={(next) => {
        setSelection(next);
        setWearByOptionId((prev) => pruneWearByOptionId(prev, next));
      }}
      wearByOptionId={wearByOptionId}
      onWearChange={setWearByOptionId}
      onAddCustomItem={(item) => {
        setCustomConsumables((prev) => [...prev, item]);
      }}
      onRemoveCustomItem={(id) => {
        const nextSelection = omitCatalogIdFromSelection(selection, id);
        setCustomConsumables((prev) => prev.filter((item) => item.id !== id));
        setSelection(nextSelection);
        setWearByOptionId((prev) => pruneWearByOptionId(prev, nextSelection));
      }}
      onAddGlobalItemBilingual={addBilingualItem}
      onRenameGlobalItem={renameItem}
      onRemoveGlobalItem={removeItem}
      onMenuClick={onMenuClick}
      embedded={embedded}
      reportTitle={title}
      searchPlaceholder={t("catalog.searchConsumables")}
      customPlaceholder={t("catalog.customConsumable")}
      inventoryNounSingular={t("catalog.noun.item")}
      inventoryNounPlural={t("catalog.noun.items")}
    />
  );
}
