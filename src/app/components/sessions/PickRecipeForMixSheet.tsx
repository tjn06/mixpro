import { useEffect, useMemo, useRef, useState } from "react";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { recipeMenuLabel } from "../../domain/recipe/types";
import {
  RecipeLibraryCard,
  recipeMatchesQuery,
} from "../recipe/RecipeLibraryCard";
import { PanelTopCloseIcon } from "../shared/ActionIcons";
import { PageSearchField } from "../shared/PageSearchField";
import { AppFrameCoverSheet } from "../sheets/AppFrameCoverSheet";
import {
  SHEET_TITLE_CLASS,
  SHEET_COVER_FORM_HEADER_STYLE,
  SHEET_LIST_ROW_CLASS,
} from "../sheets/sheetChrome";
import {
  ScrollEdgeFadeOverlays,
  useScrollEdgeFades,
} from "../sheets/scrollEdgeFades";
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
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setExpandedId(null);
    }
  }, [open]);

  const filteredSession = useMemo(
    () => sessionRecipes.filter((recipe) => recipeMatchesQuery(recipe, query)),
    [sessionRecipes, query],
  );
  const filteredLibrary = useMemo(
    () => libraryRecipes.filter((recipe) => recipeMatchesQuery(recipe, query)),
    [libraryRecipes, query],
  );

  const totalMatches = filteredSession.length + filteredLibrary.length;
  const totalAvailable = sessionRecipes.length + libraryRecipes.length;

  const scrollEdges = useScrollEdgeFades(
    scrollRef,
    open,
    `${expandedId}:${query}:${filteredSession.length}:${filteredLibrary.length}`,
  );

  if (!open) return null;

  const pick = (recipe: BlendingRecipe) => {
    onPick(recipe);
    onOpenChange(false);
  };

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
        <h2 id="pick-recipe-for-mix-title" className={SHEET_TITLE_CLASS}>
          Add mix
        </h2>
      </header>

      <div className="session-pick-recipe__chrome app-gutter-x shrink-0">
        <PageSearchField
          className="session-pick-recipe__search"
          placeholder="Search recipes…"
          value={query}
          onChange={setQuery}
        />
      </div>

      <div className="scroll-edge-fade-viewport flex-1 min-h-0 relative flex flex-col">
        <ScrollEdgeFadeOverlays
          fromTop={scrollEdges.fromTop}
          fromBottom={scrollEdges.fromBottom}
        />
        <div
          ref={scrollRef}
          className="session-pick-recipe__list recipe-picker-scroll app-gutter-x flex-1 min-h-0 overflow-y-auto overscroll-none"
        >
          {totalMatches === 0 ? (
            <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
              {totalAvailable === 0
                ? "No recipes available."
                : `No recipes match “${query.trim()}”.`}
            </p>
          ) : (
            <>
              {filteredSession.length > 0 ? (
                <section className="session-pick-recipe__section session-pick-recipe__section--session">
                  <h3 className="session-pick-recipe__section-title session-pick-recipe__section-title--session">
                    Session recipes
                  </h3>
                  <ul className="recipes-page__list">
                    {filteredSession.map((recipe) => (
                      <li key={`session-${recipe.id}`} className="recipes-page__list-item">
                        <RecipeLibraryCard
                          recipe={recipe}
                          expanded={expandedId === `session-${recipe.id}`}
                          onExpandedChange={(next) =>
                            setExpandedId(next ? `session-${recipe.id}` : null)
                          }
                          sessionTone
                          onOpen={pick}
                          openLabel={`Open ${recipeMenuLabel(recipe)}`}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {filteredLibrary.length > 0 ? (
                <section className="session-pick-recipe__section">
                  <h3 className="session-pick-recipe__section-title">
                    Recipe library
                  </h3>
                  <ul className="recipes-page__list">
                    {filteredLibrary.map((recipe) => (
                      <li key={`lib-${recipe.id}`} className="recipes-page__list-item">
                        <RecipeLibraryCard
                          recipe={recipe}
                          expanded={expandedId === `lib-${recipe.id}`}
                          onExpandedChange={(next) =>
                            setExpandedId(next ? `lib-${recipe.id}` : null)
                          }
                          onOpen={pick}
                          openLabel={`Open ${recipeMenuLabel(recipe)}`}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className={`${SHEET_LIST_ROW_CLASS} recipe-picker-close touch-manipulation`}
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      >
        <PanelTopCloseIcon size={20} />
      </button>
    </AppFrameCoverSheet>
  );
}
