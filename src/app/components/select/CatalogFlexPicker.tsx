import { useMemo } from "react";
import {
  ensureFlexSelectSelected,
  type FlexSelectSelection,
} from "../../domain/select/selection";
import type { FlexSelectItem } from "../../domain/select/types";
import { FlexSelectView } from "./FlexSelectView";

/**
 * Generic catalog multi-select: preset catalog + custom simple items,
 * dropdown groups, and optional “Custom” add control.
 * Used by Tools and Consumables (session stage + menu screens).
 */
export function CatalogFlexPicker({
  catalog,
  customItems = [],
  selection,
  onSelectionChange,
  onCustomItemsChange,
  onAddCustomItem,
  className,
  tone = "default",
  ariaLabel,
  addSimpleLabel = "Custom",
  addSimplePlaceholder = "Custom item name",
  customIdPrefix = "custom",
  unselectLabel,
}: {
  catalog: readonly FlexSelectItem[];
  customItems?: readonly FlexSelectItem[];
  selection: FlexSelectSelection;
  onSelectionChange: (next: Record<string, number>) => void;
  onCustomItemsChange?: (next: FlexSelectItem[]) => void;
  /** Preferred atomic add + select. */
  onAddCustomItem?: (item: FlexSelectItem) => void;
  className?: string;
  tone?: "default" | "session";
  ariaLabel: string;
  addSimpleLabel?: string;
  addSimplePlaceholder?: string;
  customIdPrefix?: string;
  unselectLabel?: string;
}) {
  const items = useMemo(
    () => [...catalog, ...customItems],
    [catalog, customItems],
  );

  const canAdd = Boolean(onAddCustomItem || onCustomItemsChange);

  return (
    <FlexSelectView
      items={items}
      selection={selection}
      onSelectionChange={onSelectionChange}
      className={className}
      tone={tone}
      aria-label={ariaLabel}
      unselectLabel={unselectLabel}
      addSimpleLabel={addSimpleLabel}
      addSimplePlaceholder={addSimplePlaceholder}
      onAddSimpleItem={
        canAdd
          ? (label) => {
              const item: FlexSelectItem = {
                id: `${customIdPrefix}-${crypto.randomUUID()}`,
                label,
              };
              if (onAddCustomItem) {
                onAddCustomItem(item);
                return;
              }
              onCustomItemsChange?.([...customItems, item]);
              onSelectionChange(ensureFlexSelectSelected(selection, item.id));
            }
          : undefined
      }
    />
  );
}
