import { useState } from "react";
import type { ConsumableItem } from "../../domain/consumables/types";
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
  const catalog = useConsumablesLibraryStore((s) => s.items);
  const addItem = useConsumablesLibraryStore((s) => s.addItem);
  const renameItem = useConsumablesLibraryStore((s) => s.renameItem);
  const removeItem = useConsumablesLibraryStore((s) => s.removeItem);

  const [selection, setSelection] = useState<Record<string, number>>({});
  const [wearByOptionId, setWearByOptionId] = useState<
    Record<string, WearLevel>
  >({});
  const [customConsumables, setCustomConsumables] = useState<ConsumableItem[]>(
    [],
  );

  return (
    <CatalogHub
      title="Consumables"
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
      onAddGlobalItem={addItem}
      onRenameGlobalItem={renameItem}
      onRemoveGlobalItem={removeItem}
      onMenuClick={onMenuClick}
      embedded={embedded}
      reportTitle="Consumables"
      searchPlaceholder="Search consumables…"
      customPlaceholder="Custom consumable name"
      inventoryNounSingular="item"
      inventoryNounPlural="items"
    />
  );
}
