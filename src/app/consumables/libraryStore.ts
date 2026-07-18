import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CONSUMABLES_CATALOG } from "../domain/consumables/catalog";
import type { ConsumableItem } from "../domain/consumables/types";
import {
  addRootFlexSelectItem,
  cloneFlexSelectItems,
  removeFlexSelectItem,
  updateFlexSelectLabel,
} from "../domain/select/catalogMutations";

const STORAGE_KEY = "mixmate-consumables-library";
const HOT_STORE_KEY = "__mixmate_consumables_library_store__";

interface ConsumablesLibraryState {
  items: ConsumableItem[];
  addItem: (label: string) => ConsumableItem;
  renameItem: (id: string, label: string) => void;
  removeItem: (id: string) => void;
  resetToDefaults: () => void;
}

function createConsumablesLibraryStore() {
  return create<ConsumablesLibraryState>()(
    persist(
      (set, get) => ({
        items: cloneFlexSelectItems(CONSUMABLES_CATALOG),

        addItem: (label) => {
          const item: ConsumableItem = {
            id: `consumable-${crypto.randomUUID()}`,
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
          set({ items: cloneFlexSelectItems(CONSUMABLES_CATALOG) });
        },
      }),
      {
        name: STORAGE_KEY,
        version: 1,
        partialize: (state) => ({ items: state.items }),
        merge: (persisted, current) => {
          const p = persisted as { items?: ConsumableItem[] } | undefined;
          if (!p?.items?.length) return current;
          return { ...current, items: p.items };
        },
      },
    ),
  );
}

type ConsumablesLibraryStore = ReturnType<typeof createConsumablesLibraryStore>;

const hotData = import.meta.hot?.data as
  | { [HOT_STORE_KEY]?: ConsumablesLibraryStore }
  | undefined;

export const useConsumablesLibraryStore: ConsumablesLibraryStore =
  hotData?.[HOT_STORE_KEY] ?? createConsumablesLibraryStore();

if (import.meta.hot) {
  import.meta.hot.data[HOT_STORE_KEY] = useConsumablesLibraryStore;
}
