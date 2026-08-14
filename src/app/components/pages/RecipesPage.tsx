import { useMemo, useState } from "react";
import { PRESET_RECIPES, recipeMenuLabel } from "../../domain/recipe/types";
import { useRecipeLibraryStore } from "../../recipe-library/store";
import { DestinationPageChrome } from "./DestinationPageChrome";
import { PageSearchField } from "../shared/PageSearchField";
import {
  RecipeLibraryCard,
  recipeMatchesQuery,
} from "../recipe/RecipeLibraryCard";
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
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => library.filter((recipe) => recipeMatchesQuery(recipe, query)),
    [library, query],
  );

  return (
    <DestinationPageChrome
      title="Recipes"
      onMenuClick={onMenuClick}
      embedded={embedded}
    >
      <button
        type="button"
        className="destination-page__primary-btn destination-page__primary-btn--form"
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

      <PageSearchField
        placeholder="Search recipes…"
        value={query}
        onChange={setQuery}
      />

      {filtered.length === 0 ? (
        <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
          {library.length === 0
            ? "No recipes yet."
            : `No recipes match “${query.trim()}”.`}
        </p>
      ) : (
        <ul className="recipes-page__list">
          {filtered.map((recipe) => (
            <li key={recipe.id} className="recipes-page__list-item">
              <RecipeLibraryCard
                recipe={recipe}
                expanded={expandedId === recipe.id}
                onExpandedChange={(next) =>
                  setExpandedId(next ? recipe.id : null)
                }
                onDelete={(target) => {
                  const label = recipeMenuLabel(target);
                  if (!window.confirm(`Delete “${label}”?`)) return;
                  deleteRecipe(target.id);
                  if (expandedId === target.id) setExpandedId(null);
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </DestinationPageChrome>
  );
}
