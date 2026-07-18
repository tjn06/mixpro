import type { ConsumableItem } from "../../domain/consumables/types";
import type { FlexSelectSelection } from "../../domain/select/selection";
import { useConsumablesLibraryStore } from "../../consumables/libraryStore";
import { CatalogFlexPicker } from "../select/CatalogFlexPicker";

/** Consumables catalog picker — same component stack as Tools + global library. */
export function ConsumablesPicker({
  selection,
  onSelectionChange,
  customConsumables = [],
  onCustomConsumablesChange,
  onAddCustomConsumable,
  catalog: catalogProp,
  className,
}: {
  selection: FlexSelectSelection;
  onSelectionChange: (next: Record<string, number>) => void;
  customConsumables?: readonly ConsumableItem[];
  onCustomConsumablesChange?: (next: ConsumableItem[]) => void;
  onAddCustomConsumable?: (item: ConsumableItem) => void;
  catalog?: readonly ConsumableItem[];
  className?: string;
}) {
  const libraryItems = useConsumablesLibraryStore((s) => s.items);
  const catalog = catalogProp ?? libraryItems;

  return (
    <CatalogFlexPicker
      catalog={catalog}
      customItems={customConsumables}
      selection={selection}
      onSelectionChange={onSelectionChange}
      onCustomItemsChange={onCustomConsumablesChange}
      onAddCustomItem={onAddCustomConsumable}
      className={className}
      tone="session"
      ariaLabel="Consumables"
      addSimpleLabel="Custom"
      addSimplePlaceholder="Custom consumable name"
      customIdPrefix="custom-consumable"
    />
  );
}
