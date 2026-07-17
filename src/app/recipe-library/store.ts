import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PRESET_RECIPES, type BlendingRecipe } from "../domain/recipe/types";

const STORAGE_KEY = "mixmate-recipe-library";
const HOT_STORE_KEY = "__mixmate_recipe_library_store__";
const MAX_USER_RECIPES = 80;

interface RecipeLibraryState {
  /** User-created permanent recipes (presets stay in code). */
  userRecipes: BlendingRecipe[];
  addRecipe: (recipe: BlendingRecipe) => BlendingRecipe;
  updateRecipe: (id: string, recipe: BlendingRecipe) => void;
  deleteRecipe: (id: string) => void;
}

function createRecipeLibraryStore() {
  return create<RecipeLibraryState>()(
    persist(
      (set, get) => ({
        userRecipes: [],

        addRecipe: (recipe) => {
          const next = { ...recipe, id: recipe.id || crypto.randomUUID() };
          set({
            userRecipes: [next, ...get().userRecipes].slice(0, MAX_USER_RECIPES),
          });
          return next;
        },

        updateRecipe: (id, recipe) => {
          set({
            userRecipes: get().userRecipes.map((r) =>
              r.id === id ? { ...recipe, id } : r,
            ),
          });
        },

        deleteRecipe: (id) => {
          set({
            userRecipes: get().userRecipes.filter((r) => r.id !== id),
          });
        },
      }),
      {
        name: STORAGE_KEY,
        version: 1,
        partialize: (state) => ({ userRecipes: state.userRecipes }),
      },
    ),
  );
}

type RecipeLibraryStore = ReturnType<typeof createRecipeLibraryStore>;

const hotData = import.meta.hot?.data as { [HOT_STORE_KEY]?: RecipeLibraryStore } | undefined;

export const useRecipeLibraryStore: RecipeLibraryStore =
  hotData?.[HOT_STORE_KEY] ?? createRecipeLibraryStore();

if (import.meta.hot) {
  import.meta.hot.data[HOT_STORE_KEY] = useRecipeLibraryStore;
}

/** Presets first, then user recipes (library list). */
export function selectLibraryRecipes(state: RecipeLibraryState): BlendingRecipe[] {
  const user = Array.isArray(state.userRecipes) ? state.userRecipes : [];
  return [...PRESET_RECIPES, ...user];
}
