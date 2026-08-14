import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { recommendedBatchForBucket } from "../../domain/bucket/limits";
import { getRecipeSummaryParts } from "../../domain/recipe/calc";
import { formatRecipeFormulaSummary } from "../../domain/recipe/createFromInputs";
import { recipePlaceholderDescription } from "../../domain/recipe/descriptions";
import {
  PRESET_RECIPES,
  recipeMenuLabel,
  type BlendingRecipe,
} from "../../domain/recipe/types";
import { BaseConfigIcon, DeleteIcon, GoToIcon } from "../shared/ActionIcons";
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
    recipe.description,
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
  onOpen,
  openLabel,
  sessionTone = false,
}: {
  recipe: BlendingRecipe;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  onDelete?: (recipe: BlendingRecipe) => void;
  /** When set, pick mode: Open always available; tap body to expand formula. */
  onOpen?: (recipe: BlendingRecipe) => void;
  openLabel?: string;
  sessionTone?: boolean;
}) {
  const preset = isPresetRecipe(recipe);
  const pickMode = onOpen != null;
  const title = recipeMenuLabel(recipe);
  const description = recipe.description?.trim()
    ? recipe.description.trim()
    : preset
      ? recipePlaceholderDescription(recipe.id)
      : formatRecipeFormulaSummary(recipe);
  const recipeSummaryParts = useMemo(
    () => getRecipeSummaryParts(recipe),
    [recipe],
  );
  const showRecBatch = !pickMode;
  const recBatchGrams = useMemo(() => {
    if (!showRecBatch) return 0;
    const binder = recipe.initialBinderSum ?? 1000;
    return recommendedBatchForBucket(recipe, binder, "none", "medium")
      .totalGrams;
  }, [recipe, showRecBatch]);

  const trailing = pickMode ? (
    <button
      type="button"
      className="recipe-picker-card__icon-btn recipe-picker-card__icon-btn--open touch-manipulation"
      aria-label={openLabel ?? `Open ${title}`}
      onClick={() => onOpen?.(recipe)}
    >
      <GoToIcon size={18} />
    </button>
  ) : preset ? (
    <span
      className="recipe-picker-card__icon-btn recipe-picker-card__icon-btn--admin"
      aria-label="Built-in recipe"
      title="Built-in recipe"
    >
      <BaseConfigIcon size={18} />
    </span>
  ) : (
    <button
      type="button"
      className="recipe-picker-card__icon-btn recipe-picker-card__icon-btn--delete touch-manipulation"
      aria-label={`Delete ${title}`}
      onClick={() => onDelete?.(recipe)}
    >
      <DeleteIcon size={18} />
    </button>
  );

  return (
    <div
      className={`${SHEET_LIST_ROW_CLASS} recipe-picker-card recipe-picker-card--library w-full flex flex-col items-stretch min-w-0${
        pickMode ? " recipe-picker-card--pick" : " recipe-picker-card--manage"
      }${
        expanded ? " recipe-picker-card--selected recipe-picker-card--expanded" : ""
      }${preset && !pickMode ? " recipe-picker-card--preset" : ""}${
        sessionTone ? " recipe-picker-card--session" : ""
      }`}
      aria-expanded={expanded}
    >
      <div className="recipe-picker-card__header">
        <button
          type="button"
          className="recipe-picker-card__body text-left touch-manipulation flex flex-col items-stretch min-w-0 flex-1"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
        >
          <span className="recipe-picker-card__row">
            <ChevronDown
              className={`recipe-picker-card__chevron${
                expanded ? " recipe-picker-card__chevron--open" : ""
              }`}
              size={18}
              strokeWidth={2}
              aria-hidden
            />
            <span className="min-w-0 recipe-picker-card__title">{title}</span>
          </span>
          <span className="recipe-picker-card__desc">{description}</span>
        </button>
        {trailing}
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
            {showRecBatch ? (
              <div className="recipe-picker-card__detail-row recipe-picker-card__detail-row--batch">
                <span className="recipe-picker-side-meta__label">Rec. batch</span>
                <span className="recipe-picker-side-meta__value recipe-picker-side-meta__value--strong">
                  {formatRecommendedBatch(recBatchGrams)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
