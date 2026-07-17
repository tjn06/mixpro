import { recipeMenuLabel, type BlendingRecipe } from "../../domain/recipe/types";
import { formatRecipeFormulaSummary } from "../../domain/recipe/createFromInputs";
import { CloseIcon } from "../shared/ActionIcons";
import { AppFrameCoverSheet } from "../sheets/AppFrameCoverSheet";
import {
  SHEET_SUBTITLE_CLASS,
  SHEET_TITLE_CLASS,
  SHEET_COVER_FORM_HEADER_STYLE,
  SHEET_LIST_ROW_CLASS,
} from "../sheets/sheetChrome";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "../sheets/SheetCloseButton";
import { cv } from "../../ui/tokens";

export function PickRecipeForMixSheet({
  open,
  onOpenChange,
  libraryRecipes,
  sessionRecipes,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryRecipes: BlendingRecipe[];
  sessionRecipes: BlendingRecipe[];
  onPick: (recipe: BlendingRecipe) => void;
}) {
  if (!open) return null;

  return (
    <AppFrameCoverSheet
      open={open}
      zIndex={41}
      ariaLabelledBy="pick-recipe-for-mix-title"
      className="session-pick-recipe"
    >
      <header
        className="session-pick-recipe__header shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_FORM_HEADER_STYLE}
      >
        <span className="session-mode-chip session-pick-recipe__chip">
          <span className="session-mode-chip__dot" aria-hidden />
          Session
        </span>
        <h2 id="pick-recipe-for-mix-title" className={SHEET_TITLE_CLASS}>
          Add mix
        </h2>
        <p className={SHEET_SUBTITLE_CLASS} style={{ maxWidth: 280, textAlign: "center" }}>
          Choose a recipe, then scale it in the calculator.
        </p>
      </header>

      <div className="session-pick-recipe__list flex-1 min-h-0 overflow-y-auto overscroll-none app-gutter-x">
        {sessionRecipes.length > 0 ? (
          <section className="session-pick-recipe__section session-pick-recipe__section--session">
            <h3 className="session-pick-recipe__section-title session-pick-recipe__section-title--session">
              Session recipes
            </h3>
            <ul className="destination-page__list">
              {sessionRecipes.map((recipe) => (
                <li key={`session-${recipe.id}`}>
                  <button
                    type="button"
                    className={`${SHEET_LIST_ROW_CLASS} session-pick-recipe__row session-pick-recipe__row--session`}
                    onClick={() => {
                      onPick(recipe);
                      onOpenChange(false);
                    }}
                  >
                    <span className="destination-page__card-title session-pick-recipe__row-title">
                      {recipeMenuLabel(recipe)}
                    </span>
                    <span
                      className="destination-page__card-meta"
                      style={{ color: cv.text.muted }}
                    >
                      {formatRecipeFormulaSummary(recipe)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="session-pick-recipe__section">
          <h3 className="session-pick-recipe__section-title">
            Recipe library
          </h3>
          {libraryRecipes.length === 0 ? (
            <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
              No recipes available.
            </p>
          ) : (
            <ul className="destination-page__list">
              {libraryRecipes.map((recipe) => (
                <li key={`lib-${recipe.id}`}>
                  <button
                    type="button"
                    className={`${SHEET_LIST_ROW_CLASS} session-pick-recipe__row`}
                    onClick={() => {
                      onPick(recipe);
                      onOpenChange(false);
                    }}
                  >
                    <span className="destination-page__card-title">
                      {recipeMenuLabel(recipe)}
                    </span>
                    <span
                      className="destination-page__card-meta"
                      style={{ color: cv.text.muted }}
                    >
                      {formatRecipeFormulaSummary(recipe)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <SheetFooter
        buttons={[
          {
            key: "close",
            label: "Close",
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}
