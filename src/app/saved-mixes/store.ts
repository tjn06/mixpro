import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_BUCKET_SELECTION } from "../domain/bucket/types";
import type { BucketSelection } from "../domain/bucket/types";
import type { SandType } from "../domain/mix/volume";
import { resolveSavedMixMetaName } from "./display";
import type { SavedMixSnapshot } from "./types";

const STORAGE_KEY = "mixmate-saved-mixes";
const LEGACY_STORAGE_KEY = "blending-mixes";
const MAX_SAVED_MIXES = 50;

export function snapshotValuesFromGrams(values: number[]): SavedMixSnapshot["values"] {
  return {
    total: values[0] ?? 0,
    a: values[1] ?? 0,
    b: values[2] ?? 0,
    tix: values[3] ?? 0,
    sand: values[4] ?? 0,
  };
}

export function gramsFromSnapshot(values: SavedMixSnapshot["values"]): number[] {
  return [values.total, values.a, values.b, values.tix, values.sand];
}

export type SaveMixInput = {
  recipeId: string;
  recipeName: string;
  metaName?: string;
  bucketSelection: BucketSelection;
  sandType: SandType;
  values: SavedMixSnapshot["values"];
};

interface LegacyBlendingMix {
  id: string;
  savedAt: string;
  values: SavedMixSnapshot["values"];
}

function migrateLegacyBlendingMixes(): SavedMixSnapshot[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const legacy = JSON.parse(raw) as LegacyBlendingMix[];
    if (!Array.isArray(legacy)) return [];
    return legacy.map((mix) => ({
      id: mix.id,
      savedAt: mix.savedAt,
      recipeId: "default",
      recipeName: "Standard — Epoxy",
      bucketSelection: DEFAULT_BUCKET_SELECTION,
      sandType: "medium" as SandType,
      values: mix.values,
    }));
  } catch {
    return [];
  }
}

function normalizeMix(mix: SavedMixSnapshot): SavedMixSnapshot {
  const recipeName = mix.recipeName?.trim() || mix.recipeId;
  return {
    ...mix,
    bucketSelection: mix.bucketSelection ?? DEFAULT_BUCKET_SELECTION,
    sandType: mix.sandType ?? "medium",
    recipeName,
    metaName: resolveSavedMixMetaName(mix.metaName, recipeName),
  };
}

interface SavedMixesState {
  mixes: SavedMixSnapshot[];
  saveMix: (input: SaveMixInput) => SavedMixSnapshot;
  updateMix: (id: string, input: SaveMixInput) => SavedMixSnapshot | null;
  updateMixMetaName: (id: string, metaName?: string) => void;
  deleteMix: (id: string) => void;
}

export const useSavedMixesStore = create<SavedMixesState>()(
  persist(
    (set, get) => ({
      mixes: [],

      saveMix: (input) => {
        const recipeName = input.recipeName.trim() || input.recipeId;
        const mix: SavedMixSnapshot = {
          id: crypto.randomUUID(),
          savedAt: new Date().toISOString(),
          ...input,
          recipeName,
          metaName: resolveSavedMixMetaName(input.metaName, recipeName),
        };
        const next = [...get().mixes, mix];
        set({ mixes: next.length > MAX_SAVED_MIXES ? next.slice(-MAX_SAVED_MIXES) : next });
        return mix;
      },

      updateMix: (id, input) => {
        const recipeName = input.recipeName.trim() || input.recipeId;
        let updated: SavedMixSnapshot | null = null;
        set({
          mixes: get().mixes.map((mix) => {
            if (mix.id !== id) return mix;
            updated = {
              ...mix,
              savedAt: new Date().toISOString(),
              recipeId: input.recipeId,
              recipeName,
              metaName: resolveSavedMixMetaName(input.metaName, recipeName),
              bucketSelection: input.bucketSelection,
              sandType: input.sandType,
              values: input.values,
            };
            return updated;
          }),
        });
        return updated;
      },

      updateMixMetaName: (id, metaName) => {
        set({
          mixes: get().mixes.map((mix) => {
            if (mix.id !== id) return mix;
            return {
              ...mix,
              metaName: resolveSavedMixMetaName(metaName, mix.recipeName),
            };
          }),
        });
      },

      deleteMix: (id) => {
        set({ mixes: get().mixes.filter((m) => m.id !== id) });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: (persisted) => {
        const data = persisted as { mixes?: SavedMixSnapshot[] } | undefined;
        return { mixes: (data?.mixes ?? []).map(normalizeMix) };
      },
      partialize: (state) => ({ mixes: state.mixes }),
      onRehydrateStorage: () => (state) => {
        if (state && state.mixes.length > 0) return;
        const legacy = migrateLegacyBlendingMixes();
        if (legacy.length === 0) return;
        useSavedMixesStore.setState({ mixes: legacy.map(normalizeMix) });
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      },
    },
  ),
);
