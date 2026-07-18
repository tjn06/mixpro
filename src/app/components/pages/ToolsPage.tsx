import { useState } from "react";
import type { ToolItem } from "../../domain/tools/types";
import { useToolsLibraryStore } from "../../tools/libraryStore";
import { CatalogHub } from "../catalog/CatalogHub";

/** Top-level Tools — Report (picker + bottom sheet) / Edit against the global tools library. */
export function ToolsPage({
  onMenuClick,
  embedded = false,
}: {
  onMenuClick: () => void;
  embedded?: boolean;
}) {
  const catalog = useToolsLibraryStore((s) => s.items);
  const addItem = useToolsLibraryStore((s) => s.addItem);
  const renameItem = useToolsLibraryStore((s) => s.renameItem);
  const removeItem = useToolsLibraryStore((s) => s.removeItem);

  const [selection, setSelection] = useState<Record<string, number>>({});
  const [customTools, setCustomTools] = useState<ToolItem[]>([]);

  return (
    <CatalogHub
      title="Tools"
      catalog={catalog}
      customItems={customTools}
      selection={selection}
      onSelectionChange={setSelection}
      onAddCustomItem={(item) => {
        setCustomTools((prev) => [...prev, item]);
      }}
      onAddGlobalItem={addItem}
      onRenameGlobalItem={renameItem}
      onRemoveGlobalItem={removeItem}
      onMenuClick={onMenuClick}
      embedded={embedded}
      reportTitle="Tools"
      searchPlaceholder="Search tools…"
      customPlaceholder="Custom tool name"
      inventoryNounSingular="tool"
      inventoryNounPlural="tools"
    />
  );
}
