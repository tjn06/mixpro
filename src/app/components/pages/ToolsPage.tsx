import { useState } from "react";
import {
  catalogSelectionKeys,
  omitCatalogIdFromSelection,
} from "../../domain/select/acquisition";
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
  const [rentalComments, setRentalComments] = useState<Record<string, string>>(
    {},
  );

  return (
    <CatalogHub
      title="Tools"
      catalog={catalog}
      customItems={customTools}
      selection={selection}
      onSelectionChange={(next) => {
        setSelection(next);
        setRentalComments((prev) => {
          let changed = false;
          const kept: Record<string, string> = {};
          for (const [key, comment] of Object.entries(prev)) {
            if ((next[key] ?? 0) < 1) {
              changed = true;
              continue;
            }
            kept[key] = comment;
          }
          return changed ? kept : prev;
        });
      }}
      acquisitionEnabled
      commentsByLineKey={rentalComments}
      onRentalCommentChange={(lineKey, comment) => {
        setRentalComments((prev) => {
          if (!comment) {
            if (!(lineKey in prev)) return prev;
            const { [lineKey]: _, ...rest } = prev;
            return rest;
          }
          if (prev[lineKey] === comment) return prev;
          return { ...prev, [lineKey]: comment };
        });
      }}
      onAddCustomItem={(item) => {
        setCustomTools((prev) => [...prev, item]);
      }}
      onRemoveCustomItem={(id) => {
        setCustomTools((prev) => prev.filter((item) => item.id !== id));
        setSelection((prev) => omitCatalogIdFromSelection(prev, id));
        setRentalComments((prev) => {
          const [owned, rented] = catalogSelectionKeys(id);
          if (!(owned in prev) && !(rented in prev)) return prev;
          const next = { ...prev };
          delete next[owned];
          delete next[rented];
          return next;
        });
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
