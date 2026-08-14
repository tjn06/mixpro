import { useMemo } from "react";
import { recommendedBatchForBucket } from "../../domain/bucket/limits";
import { getRecipeSummaryParts } from "../../domain/recipe/calc";
import { formatRecipeFormulaSummary } from "../../domain/recipe/createFromInputs";
import { recipePlaceholderDescription } from "../../domain/recipe/descriptions";
import {
  PRESET_RECIPES,
  recipeMenuLabel,
  type BlendingRecipe,
} from "../../domain/recipe/types";
import { BaseConfigIcon, DeleteIcon } from "../shared/ActionIcons";
import { SHEET_LIST_ROW_CLASS } from "../sheets/sheetChrome";

const PRESET_IDS = new Set(PRESET_RECIPES.map((r) => r.id));

function formatRecommendedBatch(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(3)} kg`;
  return `${Math.round(grams)} g`;
}

export function isPresetRecipe(recipe: BlendingRecipe): boolean {
  return PRESET_IDS.has(recipe.id);
}

/** Match title, description, and formula text for library / picker search. */
export function recipeMatchesQuery(
  recipe: BlendingRecipe,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const parts = getRecipeSummaryParts(recipe);
  const hay = [
    recipeMenuLabel(recipe),
    recipePlaceholderDescription(recipe.id),
    formatRecipeFormulaSummary(recipe),
    parts.ratio,
    parts.detail,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

/** Library recipe card — picker-style chrome, meta expand only (no bucket / saves). */
export function RecipeLibraryCard({
  recipe,
  expanded,
  onExpandedChange,
  onDelete,
}: {
  recipe: BlendingRecipe;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  onDelete?: (recipe: BlendingRecipe) => void;
}) {
  const preset = isPresetRecipe(recipe);
  const title = recipeMenuLabel(recipe);
  const description = preset
    ? recipePlaceholderDescription(recipe.id)
    : formatRecipeFormulaSummary(recipe);
  const recipeSummaryParts = useMemo(
    () => getRecipeSummaryParts(recipe),
    [recipe],
  );
  const recBatchGrams = useMemo(() => {
    const binder = recipe.initialBinderSum ?? 1000;
    return recommendedBatchForBucket(recipe, binder, "none", "medium")
      .totalGrams;
  }, [recipe]);

  return (
    <div
      className={`${SHEET_LIST_ROW_CLASS} recipe-picker-card recipe-picker-card--library w-full flex flex-col items-stretch min-w-0${
        expanded ? " recipe-picker-card--selected recipe-picker-card--expanded" : ""
      }${preset ? " recipe-picker-card--preset" : ""}`}
      aria-expanded={expanded}
    >
      <div className="recipe-picker-card__header">
        <button
          type="button"
          className="recipe-picker-card__body text-left touch-manipulation flex flex-col items-stretch min-w-0 flex-1"
          onClick={() => onExpandedChange(!expanded)}
        >
          <span className="recipe-picker-card__row">
            <span className="min-w-0 recipe-picker-card__title">{title}</span>
          </span>
          <span className="recipe-picker-card__desc">{description}</span>
        </button>
        {preset ? (
          <span
            className="recipe-picker-card__go recipe-picker-card__go--admin"
            aria-label="Built-in recipe"
            title="Built-in recipe"
          >
            <BaseConfigIcon size={18} />
          </span>
        ) : (
          <button
            type="button"
            className="recipe-picker-card__go recipe-picker-card__go--delete touch-manipulation"
            aria-label={`Delete ${title}`}
            onClick={() => onDelete?.(recipe)}
          >
            <DeleteIcon size={18} />
          </button>
        )}
      </div>
      {expanded ? (
        <div className="recipe-picker-card__detail recipe-picker-card__detail--meta-only">
          <div className="recipe-picker-card__detail-section recipe-picker-card__detail-meta">
            <div className="recipe-picker-card__detail-row recipe-picker-card__detail-row--recipe">
              <div className="recipe-picker-card__detail-recipe">
                <span className="recipe-picker-side-meta__ratio">
                  {recipeSummaryParts.ratio || "\u00a0"}
                </span>
                <span className="recipe-picker-card__detail-recipe-fill">
                  {recipeSummaryParts.detail || "\u00a0"}
                </span>
              </div>
            </div>
            <div className="recipe-picker-card__detail-row recipe-picker-card__detail-row--batch">
              <span className="recipe-picker-side-meta__label">Rec. batch</span>
              <span className="recipe-picker-side-meta__value recipe-picker-side-meta__value--strong">
                {formatRecommendedBatch(recBatchGrams)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
