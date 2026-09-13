import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { recipeMenuLabel } from "../../domain/recipe/types";
import { useSettingsStore } from "../../settings/store";
import {
  RecipeLibraryCard,
  recipeMatchesQuery,
} from "../recipe/RecipeLibraryCard";
import { PageSearchField } from "../shared/PageSearchField";
import { AppFrameCoverSheet } from "../sheets/AppFrameCoverSheet";
import {
  SHEET_TITLE_CLASS,
  SHEET_COVER_FORM_HEADER_STYLE,
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
  sessionRecipes = [],
  onPick,
  title,
  openLabelFor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  libraryRecipes: BlendingRecipe[];
  sessionRecipes?: BlendingRecipe[];
  onPick: (recipe: BlendingRecipe) => void | boolean;
  /** Sheet heading (default: Add mix). */
  title?: string;
  /** Card open/select label; default Open {menu label}. */
  openLabelFor?: (recipe: BlendingRecipe) => string;
}) {
  const { t } = useTranslation("common");
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const resolvedTitle = title ?? t("sessions.addMix");
  const pickLabel =
    openLabelFor ??
    ((recipe: BlendingRecipe) =>
      t("sessions.openRecipe", { name: recipeMenuLabel(recipe, uiLanguage) }));
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setExpandedId(null);
    }
  }, [open]);

  const filteredLibrary = useMemo(
    () => libraryRecipes.filter((recipe) => recipeMatchesQuery(recipe, query)),
    [libraryRecipes, query],
  );
  const filteredSession = useMemo(
    () => sessionRecipes.filter((recipe) => recipeMatchesQuery(recipe, query)),
    [sessionRecipes, query],
  );
  const totalMatches = filteredLibrary.length + filteredSession.length;
  const totalAvailable = libraryRecipes.length + sessionRecipes.length;
  const scrollEdges = useScrollEdgeFades(scrollRef, open && totalMatches > 0);

  if (!open) return null;

  const pick = (recipe: BlendingRecipe) => {
    const keepOpen = onPick(recipe) === true;
    if (!keepOpen) onOpenChange(false);
  };

  return (
    <AppFrameCoverSheet
      open={open}
      zIndex={40}
      ariaLabelledBy="pick-recipe-for-mix-title"
      className="session-pick-recipe-sheet"
    >
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_FORM_HEADER_STYLE}
      >
        <h2 id="pick-recipe-for-mix-title" className={SHEET_TITLE_CLASS}>
          {resolvedTitle}
        </h2>
      </header>

      <div className="session-pick-recipe__chrome app-gutter-x shrink-0">
        <PageSearchField
          className="session-pick-recipe__search"
          placeholder={t("sessions.searchRecipes")}
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
                ? t("sessions.noRecipes")
                : t("pages.recipes.noMatch", { query: query.trim() })}
            </p>
          ) : (
            <>
              {filteredSession.length > 0 ? (
                <section className="session-pick-recipe__section session-pick-recipe__section--session">
                  <h3 className="session-pick-recipe__section-title session-pick-recipe__section-title--session">
                    {t("sessions.sessionRecipes")}
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
                          openLabel={pickLabel(recipe)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {filteredLibrary.length > 0 ? (
                <section className="session-pick-recipe__section">
                  <h3 className="session-pick-recipe__section-title">
                    {t("sessions.recipeLibrary")}
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
                          openLabel={pickLabel(recipe)}
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
        className="recipe-picker-close touch-manipulation"
        aria-label={t("common.close")}
        onClick={() => onOpenChange(false)}
      >
        <svg
          className="recipe-picker-close__chevron"
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </AppFrameCoverSheet>
  );
}
