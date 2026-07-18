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
  catalog: catalogProp,
  className,
}: {
  selection: FlexSelectSelection;
  onSelectionChange: (next: Record<string, number>) => void;
  customTools?: readonly ToolItem[];
  onCustomToolsChange?: (next: ToolItem[]) => void;
  onAddCustomTool?: (item: ToolItem) => void;
  catalog?: readonly ToolItem[];
  className?: string;
}) {
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
      className={className}
      tone="session"
      ariaLabel="Tools"
      addSimpleLabel="Custom"
      addSimplePlaceholder="Custom tool name"
      customIdPrefix="custom-tool"
    />
  );
}
