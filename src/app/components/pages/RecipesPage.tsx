import { useMemo } from "react";
import { PRESET_RECIPES, recipeMenuLabel } from "../../domain/recipe/types";
import { formatRecipeFormulaSummary } from "../../domain/recipe/createFromInputs";
import { recipePlaceholderDescription } from "../../domain/recipe/descriptions";
import { useRecipeLibraryStore } from "../../recipe-library/store";
import { DestinationPageChrome } from "./DestinationPageChrome";
import { cv } from "../../ui/tokens";

/** Recipe Library — presets + user-created permanent recipes. */
export function RecipesPage({
  onMenuClick,
  onCreateRecipe,
  embedded = false,
}: {
  onMenuClick: () => void;
  onCreateRecipe: () => void;
  embedded?: boolean;
}) {
  const userRecipes = useRecipeLibraryStore((s) => s.userRecipes) ?? [];
  const deleteRecipe = useRecipeLibraryStore((s) => s.deleteRecipe);
  const library = useMemo(
    () => [...PRESET_RECIPES, ...userRecipes],
    [userRecipes],
  );
  const presetIds = useMemo(() => new Set(PRESET_RECIPES.map((r) => r.id)), []);

  return (
    <DestinationPageChrome
      title="Recipes"
      onMenuClick={onMenuClick}
      embedded={embedded}
    >
      <button
        type="button"
        className="destination-page__primary-btn"
        onClick={onCreateRecipe}
      >
        + Create recipe
      </button>
      <p className="destination-page__lede" style={{ color: cv.text.muted }}>
        Permanent formulas in your library.
        {userRecipes.length > 0
          ? ` ${userRecipes.length} custom.`
          : " Start with a preset or create your own."}
      </p>

      <ul className="destination-page__list">
        {library.map((recipe) => {
          const isPreset = presetIds.has(recipe.id);
          return (
            <li key={recipe.id}>
              <article className="destination-page__card">
                <div className="destination-page__card-main">
                  <span className="destination-page__card-title">
                    {recipeMenuLabel(recipe)}
                  </span>
                  <span
                    className="destination-page__card-meta"
                    style={{ color: cv.text.muted }}
                  >
                    {isPreset
                      ? recipePlaceholderDescription(recipe.id)
                      : formatRecipeFormulaSummary(recipe)}
                  </span>
                </div>
                {!isPreset ? (
                  <button
                    type="button"
                    className="destination-page__card-delete"
                    aria-label={`Delete ${recipeMenuLabel(recipe)}`}
                    onClick={() => deleteRecipe(recipe.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </DestinationPageChrome>
  );
}
