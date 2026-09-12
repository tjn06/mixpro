import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TOOLS_CATALOG } from "../domain/tools/catalog";
import type { ToolItem } from "../domain/tools/types";
import type { ItemLabel, LocalizedLabel } from "../i18n/localizedLabel";
import {
  addRootFlexSelectItem,
  cloneFlexSelectItems,
  mergeSeedCatalogWithUserItems,
  removeFlexSelectItem,
  updateFlexSelectLabel,
} from "../domain/select/catalogMutations";

const STORAGE_KEY = "mixmate-tools-library";
const HOT_STORE_KEY = "__mixmate_tools_library_store__";

interface ToolsLibraryState {
  items: ToolItem[];
  /** User free-text item (single name as typed). */
  addItem: (label: string) => ToolItem;
  /** Admin bilingual catalog item. */
  addBilingualItem: (label: LocalizedLabel) => ToolItem;
  renameItem: (id: string, label: ItemLabel) => void;
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

        addBilingualItem: (label) => {
          const item: ToolItem = {
            id: `admin-tool-${crypto.randomUUID()}`,
            label: {
              en: label.en.trim(),
              sv: label.sv.trim(),
            },
          };
          set({ items: addRootFlexSelectItem(get().items, item) });
          return item;
        },

        renameItem: (id, label) => {
          if (typeof label === "string") {
            const next = label.trim();
            if (!next) return;
            set({ items: updateFlexSelectLabel(get().items, id, next) });
            return;
          }
          const en = label.en.trim();
          const sv = label.sv.trim();
          if (!en && !sv) return;
          set({
            items: updateFlexSelectLabel(get().items, id, {
              en: en || sv,
              sv: sv || en,
            }),
          });
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
        version: 5,
        partialize: (state) => ({ items: state.items }),
        migrate: (persisted) => {
          const raw = persisted as { items?: ToolItem[] } | undefined;
          return {
            items: mergeSeedCatalogWithUserItems(TOOLS_CATALOG, raw?.items),
          };
        },
        merge: (persisted, current) => {
          const p = persisted as { items?: ToolItem[] } | undefined;
          return {
            ...current,
            items: mergeSeedCatalogWithUserItems(TOOLS_CATALOG, p?.items),
          };
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
