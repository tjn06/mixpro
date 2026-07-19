import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TOOLS_CATALOG } from "../domain/tools/catalog";
import type { ToolItem } from "../domain/tools/types";
import {
  addRootFlexSelectItem,
  cloneFlexSelectItems,
  removeFlexSelectItem,
  updateFlexSelectLabel,
} from "../domain/select/catalogMutations";

const STORAGE_KEY = "mixmate-tools-library";
const HOT_STORE_KEY = "__mixmate_tools_library_store__";

interface ToolsLibraryState {
  items: ToolItem[];
  addItem: (label: string) => ToolItem;
  renameItem: (id: string, label: string) => void;
  removeItem: (id: string) => void;
  resetToDefaults: () => void;
}

function createToolsLibraryStore() {
  return create<ToolsLibraryState>()(
    persist(
      (set, get) => ({
        items: cloneFlexSelectItems(TOOLS_CATALOG),

        addItem: (label) => {
          const item: ToolItem = {
            id: `tool-${crypto.randomUUID()}`,
            label: label.trim(),
          };
          set({ items: addRootFlexSelectItem(get().items, item) });
          return item;
        },

        renameItem: (id, label) => {
          const next = label.trim();
          if (!next) return;
          set({ items: updateFlexSelectLabel(get().items, id, next) });
        },

        removeItem: (id) => {
          set({ items: removeFlexSelectItem(get().items, id) });
        },

        resetToDefaults: () => {
          set({ items: cloneFlexSelectItems(TOOLS_CATALOG) });
        },
      }),
      {
        name: STORAGE_KEY,
        version: 4,
        partialize: (state) => ({ items: state.items }),
        migrate: () => ({
          items: cloneFlexSelectItems(TOOLS_CATALOG),
        }),
        merge: (persisted, current) => {
          const p = persisted as { items?: ToolItem[] } | undefined;
          if (!p?.items?.length) return current;
          return { ...current, items: p.items };
        },
      },
    ),
  );
}

type ToolsLibraryStore = ReturnType<typeof createToolsLibraryStore>;

const hotData = import.meta.hot?.data as
  | { [HOT_STORE_KEY]?: ToolsLibraryStore }
  | undefined;

export const useToolsLibraryStore: ToolsLibraryStore =
  hotData?.[HOT_STORE_KEY] ?? createToolsLibraryStore();

if (import.meta.hot) {
  import.meta.hot.data[HOT_STORE_KEY] = useToolsLibraryStore;
}
