import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  omitCatalogIdFromSelection,
  selectionLineKey,
  type ItemAcquisition,
} from "../../domain/select/acquisition";
import {
  ensureFlexSelectSelected,
  type FlexSelectSelection,
} from "../../domain/select/selection";
import type { FlexSelectItem } from "../../domain/select/types";
import type { WearByOptionId, WearLevel } from "../../domain/select/wear";
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
  wearByOptionId,
  onWearChange,
  onCustomItemsChange,
  onAddCustomItem,
  onRemoveCustomItem,
  className,
  tone = "default",
  ariaLabel,
  addSimpleLabel,
  addSimplePlaceholder,
  customIdPrefix = "custom",
  unselectLabel,
  acquisitionEnabled = false,
  commentsByLineKey,
  onRentalCommentChange,
}: {
  catalog: readonly FlexSelectItem[];
  customItems?: readonly FlexSelectItem[];
  selection: FlexSelectSelection;
  onSelectionChange: (next: Record<string, number>) => void;
  wearByOptionId?: WearByOptionId;
  onWearChange?: (next: Record<string, WearLevel>) => void;
  onCustomItemsChange?: (next: FlexSelectItem[]) => void;
  /** Preferred atomic add + select. */
  onAddCustomItem?: (
    item: FlexSelectItem,
    acquisition: ItemAcquisition,
  ) => void;
  /** Preferred atomic remove (also clears owned/rented selection keys). */
  onRemoveCustomItem?: (id: string) => void;
  className?: string;
  tone?: "default" | "session";
  ariaLabel: string;
  addSimpleLabel?: string;
  addSimplePlaceholder?: string;
  customIdPrefix?: string;
  unselectLabel?: string;
  /** Session tools: enable owned/rented acquisition arm. */
  acquisitionEnabled?: boolean;
  commentsByLineKey?: Readonly<Record<string, string>>;
  onRentalCommentChange?: (lineKey: string, comment: string | null) => void;
}) {
  const { t } = useTranslation("common");
  const resolvedAddSimpleLabel = addSimpleLabel ?? t("catalog.custom");
  const resolvedAddSimplePlaceholder =
    addSimplePlaceholder ?? t("select.customPlaceholder");

  const items = useMemo(
    () => [...catalog, ...customItems],
    [catalog, customItems],
  );

  const customItemIds = useMemo(
    () => new Set(customItems.map((item) => item.id)),
    [customItems],
  );

  const canAdd = Boolean(onAddCustomItem || onCustomItemsChange);
  const canRemove = Boolean(onRemoveCustomItem || onCustomItemsChange);

  return (
    <FlexSelectView
      items={items}
      selection={selection}
      onSelectionChange={onSelectionChange}
      wearByOptionId={wearByOptionId}
      onWearChange={onWearChange}
      className={className}
      tone={tone}
      aria-label={ariaLabel}
      unselectLabel={unselectLabel}
      addSimpleLabel={resolvedAddSimpleLabel}
      addSimplePlaceholder={resolvedAddSimplePlaceholder}
      acquisitionEnabled={acquisitionEnabled}
      commentsByLineKey={commentsByLineKey}
      onRentalCommentChange={onRentalCommentChange}
      customItemIds={canRemove ? customItemIds : undefined}
      onRemoveCustomItem={
        canRemove
          ? (id) => {
              if (onRemoveCustomItem) {
                onRemoveCustomItem(id);
                return;
              }
              onSelectionChange(omitCatalogIdFromSelection(selection, id));
              onCustomItemsChange?.(
                customItems.filter((item) => item.id !== id),
              );
            }
          : undefined
      }
      onAddSimpleItem={
        canAdd
          ? (label, acquisition) => {
              const item: FlexSelectItem = {
                id: `${customIdPrefix}-${crypto.randomUUID()}`,
                label,
              };
              if (onAddCustomItem) {
                onAddCustomItem(item, acquisition);
                return;
              }
              onCustomItemsChange?.([...customItems, item]);
              onSelectionChange(
                ensureFlexSelectSelected(
                  selection,
                  selectionLineKey(item.id, acquisition),
                ),
              );
            }
          : undefined
      }
    />
  );
}
