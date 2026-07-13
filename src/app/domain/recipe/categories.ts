import type { BlendingRecipe } from "./types";

export type RecipeCategoryId = "standard" | "coatings" | "thickener";

export const RECIPE_CATEGORY_ORDER: RecipeCategoryId[] = ["standard", "coatings", "thickener"];

export const RECIPE_CATEGORY_LABELS: Record<RecipeCategoryId, string> = {
  standard: "Repair mixes",
  coatings: "Coatings",
  thickener: "Thickener mixes",
};

export function recipeCategoryId(recipe: BlendingRecipe): RecipeCategoryId {
  if (recipe.id === "primer" || recipe.id === "lack") return "coatings";
  if (recipe.id === "tixblandning" || recipe.id === "fas-sockel") return "thickener";
  return "standard";
}

export function groupRecipesByCategory(
  recipes: BlendingRecipe[],
): { id: RecipeCategoryId; label: string; recipes: BlendingRecipe[] }[] {
  const buckets = new Map<RecipeCategoryId, BlendingRecipe[]>();
  for (const id of RECIPE_CATEGORY_ORDER) buckets.set(id, []);
  for (const recipe of recipes) {
    buckets.get(recipeCategoryId(recipe))!.push(recipe);
  }
  return RECIPE_CATEGORY_ORDER.filter((id) => (buckets.get(id)?.length ?? 0) > 0).map((id) => ({
    id,
    label: RECIPE_CATEGORY_LABELS[id],
    recipes: buckets.get(id)!,
  }));
}
