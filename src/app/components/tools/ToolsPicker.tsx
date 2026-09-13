import { useTranslation } from "react-i18next";
import type { ItemAcquisition } from "../../domain/select/acquisition";
import type { FlexSelectSelection } from "../../domain/select/selection";
import type { ToolItem } from "../../domain/tools/types";
import { useToolsLibraryStore } from "../../tools/libraryStore";
import { CatalogFlexPicker } from "../select/CatalogFlexPicker";

/** Tools catalog picker — thin wrapper over CatalogFlexPicker + global library. */
export function ToolsPicker({
  selection,
  onSelectionChange,
  customTools = [],
  onCustomToolsChange,
  onAddCustomTool,
  onRemoveCustomTool,
  catalog: catalogProp,
  className,
  acquisitionEnabled = false,
  commentsByLineKey,
  onRentalCommentChange,
}: {
  selection: FlexSelectSelection;
  onSelectionChange: (next: Record<string, number>) => void;
  customTools?: readonly ToolItem[];
  onCustomToolsChange?: (next: ToolItem[]) => void;
  onAddCustomTool?: (item: ToolItem, acquisition: ItemAcquisition) => void;
  onRemoveCustomTool?: (id: string) => void;
  catalog?: readonly ToolItem[];
  className?: string;
  /** Session tools stage — owned/rented arm after Custom. */
  acquisitionEnabled?: boolean;
  commentsByLineKey?: Readonly<Record<string, string>>;
  onRentalCommentChange?: (lineKey: string, comment: string | null) => void;
}) {
  const { t } = useTranslation("common");
  const libraryItems = useToolsLibraryStore((s) => s.items);
  const catalog = catalogProp ?? libraryItems;

  return (
    <CatalogFlexPicker
      catalog={catalog}
      customItems={customTools}
      selection={selection}
      onSelectionChange={onSelectionChange}
      onCustomItemsChange={onCustomToolsChange}
      onAddCustomItem={onAddCustomTool}
      onRemoveCustomItem={onRemoveCustomTool}
      className={className}
      tone="session"
      ariaLabel={t("nav.tools")}
      addSimpleLabel={t("catalog.custom")}
      addSimplePlaceholder={t("catalog.customTool")}
      customIdPrefix="custom-tool"
      acquisitionEnabled={acquisitionEnabled}
      commentsByLineKey={commentsByLineKey}
      onRentalCommentChange={onRentalCommentChange}
    />
  );
}
