import { create } from "zustand";
import { persist } from "zustand/middleware";
import { resolveSavedBatchTotalsMetaName } from "./display";
import {
  batchesFromSessionInput,
  isLegacyBatchTotalsEntry,
  migrateLegacyBatchTotalsEntry,
  normalizeBatches,
} from "./batches";
import type {
  LegacySavedBatchTotalsSnapshot,
  SaveBatchTotalsFromSessionInput,
  SaveBatchTotalsInput,
  SavedBatchTotalsSnapshot,
} from "./types";

export {
  additionalBatches,
  buildBatchesFromSession,
  extraBatchesFromSnapshot,
  gramsFromSlotValues,
  primaryBatch,
  slotValuesFromGrams,
  totalBatchCount,
} from "./batches";

const STORAGE_KEY = "mixmate-saved-batch-totals";
const MAX_SAVED = 50;
const HOT_STORE_KEY = "__mixmate_saved_batch_totals_store__";

function normalizeEntry(entry: SavedBatchTotalsSnapshot): SavedBatchTotalsSnapshot {
  const recipeName = entry.recipeName?.trim() || entry.recipeId;
  return {
    ...entry,
    recipeName,
    metaName: resolveSavedBatchTotalsMetaName(entry.metaName, recipeName),
    batches: normalizeBatches(entry.batches ?? []),
    source: entry.source ?? "batch-mixer",
  };
}

function coerceEntry(raw: unknown): SavedBatchTotalsSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  if (isLegacyBatchTotalsEntry(raw)) {
    return normalizeEntry(migrateLegacyBatchTotalsEntry(raw));
  }
  const entry = raw as SavedBatchTotalsSnapshot;
  if (!Array.isArray(entry.batches)) return null;
  return normalizeEntry(entry);
}

interface SavedBatchTotalsState {
  entries: SavedBatchTotalsSnapshot[];
  saveEntry: (input: SaveBatchTotalsInput) => SavedBatchTotalsSnapshot;
  /** Current mixer→totals workflow helper. */
  saveFromSession: (input: SaveBatchTotalsFromSessionInput) => SavedBatchTotalsSnapshot;
  updateEntry: (id: string, input: SaveBatchTotalsInput) => SavedBatchTotalsSnapshot | null;
  updateEntryMetaName: (id: string, metaName?: string) => void;
  deleteEntry: (id: string) => void;
}

function createSavedBatchTotalsStore() {
  return create<SavedBatchTotalsState>()(
    persist(
      (set, get) => ({
        entries: [],

        saveEntry: (input) => {
          const recipeName = input.recipeName.trim() || input.recipeId;
          const entry: SavedBatchTotalsSnapshot = {
            id: crypto.randomUUID(),
            savedAt: new Date().toISOString(),
            recipeId: input.recipeId,
            recipeName,
            metaName: resolveSavedBatchTotalsMetaName(input.metaName, recipeName),
            linkedSavedMixId: input.linkedSavedMixId,
            batches: normalizeBatches(input.batches),
            source: input.source ?? "batch-mixer",
          };
          const next = [...get().entries, entry];
          set({ entries: next.length > MAX_SAVED ? next.slice(-MAX_SAVED) : next });
          return entry;
        },

        saveFromSession: (input) => {
          const recipeName = input.recipeName.trim() || input.recipeId;
          const entry: SavedBatchTotalsSnapshot = {
            id: crypto.randomUUID(),
            savedAt: new Date().toISOString(),
            recipeId: input.recipeId,
            recipeName,
            metaName: resolveSavedBatchTotalsMetaName(input.metaName, recipeName),
            linkedSavedMixId: input.linkedSavedMixId,
            batches: batchesFromSessionInput(input),
            source: input.source ?? "batch-mixer",
          };
          const next = [...get().entries, entry];
          set({ entries: next.length > MAX_SAVED ? next.slice(-MAX_SAVED) : next });
          return entry;
        },

        updateEntry: (id, input) => {
          const recipeName = input.recipeName.trim() || input.recipeId;
          let updated: SavedBatchTotalsSnapshot | null = null;
          set({
            entries: get().entries.map((entry) => {
              if (entry.id !== id) return entry;
              updated = {
                ...entry,
                savedAt: new Date().toISOString(),
                recipeId: input.recipeId,
                recipeName,
                metaName: resolveSavedBatchTotalsMetaName(input.metaName, recipeName),
                linkedSavedMixId: input.linkedSavedMixId,
                batches: normalizeBatches(input.batches),
                source: input.source ?? entry.source ?? "batch-mixer",
              };
              return updated;
            }),
          });
          return updated;
        },

        updateEntryMetaName: (id, metaName) => {
          set({
            entries: get().entries.map((entry) => {
              if (entry.id !== id) return entry;
              return {
                ...entry,
                metaName: resolveSavedBatchTotalsMetaName(metaName, entry.recipeName),
              };
            }),
          });
        },

        deleteEntry: (id) => {
          set({ entries: get().entries.filter((entry) => entry.id !== id) });
        },
      }),
      {
        name: STORAGE_KEY,
        version: 2,
        migrate: (persisted) => {
          const data = persisted as {
            entries?: Array<SavedBatchTotalsSnapshot | LegacySavedBatchTotalsSnapshot>;
          } | undefined;
          const entries = (data?.entries ?? [])
            .map((entry) => coerceEntry(entry))
            .filter((entry): entry is SavedBatchTotalsSnapshot => entry != null);
          return { entries };
        },
        partialize: (state) => ({ entries: state.entries }),
      },
    ),
  );
}

type SavedBatchTotalsStore = ReturnType<typeof createSavedBatchTotalsStore>;

const hotData = import.meta.hot?.data as
  | { [HOT_STORE_KEY]?: SavedBatchTotalsStore }
  | undefined;

/** Keep one store across Vite HMR so saves aren't written to a discarded instance. */
export const useSavedBatchTotalsStore: SavedBatchTotalsStore =
  hotData?.[HOT_STORE_KEY] ?? createSavedBatchTotalsStore();

if (import.meta.hot) {
  import.meta.hot.data[HOT_STORE_KEY] = useSavedBatchTotalsStore;
}
