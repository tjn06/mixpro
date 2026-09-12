import type { AppLanguage } from "../../i18n/language";
import { DEFAULT_UI_LANGUAGE } from "../../i18n/language";
import { displayLabel } from "../../i18n/localizedLabel";
import type { BlendingRecipe } from "./types";

/**
 * Card sublabel for a recipe.
 * Prefers the requested language; if that side is empty/missing, uses the other.
 * User free-text descriptions are returned as stored.
 */
export function recipeCardDescription(
  recipe: BlendingRecipe,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): string {
  return displayLabel(recipe.description, language).trim();
}
