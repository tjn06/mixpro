import React, { useRef, useState } from "react";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { recipeMenuLabel } from "../../domain/recipe/types";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import { RecipePickerSheet } from "../sheets/RecipePickerSheet";
import { RecipeHeaderRecipeRow, RecipeHeaderSubline } from "./RecipeZoneMeta";

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{
        flexShrink: 0,
        transition: "transform 150ms ease",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export interface RecipeSelectProps {
  recipes: BlendingRecipe[];
  value: BlendingRecipe;
  onChange: (recipe: BlendingRecipe) => void;
  disabled?: boolean;
  muted?: boolean;
  /** When set, the current recipe stays selectable (reset saved mix / reload defaults). */
  allowReselectCurrent?: boolean;
  savedMixes?: readonly SavedMixSnapshot[];
  loadedSavedMixId?: string | null;
  onSavedMixSelect?: (mix: SavedMixSnapshot) => void;
}

export function RecipeSelect({
  recipes,
  value,
  onChange,
  disabled = false,
  muted = false,
  allowReselectCurrent = false,
  savedMixes = [],
  loadedSavedMixId = null,
  onSavedMixSelect,
}: RecipeSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectable = recipes.length > 1 && !disabled;
  const recipeName = recipeMenuLabel(value);

  const handleTriggerClick = () => {
    if (menuVisible) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  };

  return (
    <RecipeHeaderSubline className="relative">
      {selectable ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={menuVisible}
            aria-label={`${recipeName}. Tap to change recipe.`}
            className="inline-flex items-center justify-center gap-1 max-w-full min-w-0 touch-manipulation bg-transparent border-none p-0 cursor-pointer"
            onClick={handleTriggerClick}
          >
            <RecipeHeaderRecipeRow muted={muted}>{recipeName}</RecipeHeaderRecipeRow>
            <ChevronDown open={menuVisible} />
          </button>
          <RecipePickerSheet
            open={open}
            onOpenChange={setOpen}
            onPresentChange={setMenuVisible}
            anchorRef={triggerRef}
            recipes={recipes}
            value={value}
            onChange={onChange}
            allowReselectCurrent={allowReselectCurrent}
            savedMixes={savedMixes}
            loadedSavedMixId={loadedSavedMixId}
            onSavedMixSelect={onSavedMixSelect}
          />
        </>
      ) : (
        <RecipeHeaderRecipeRow muted={muted}>{recipeName}</RecipeHeaderRecipeRow>
      )}
    </RecipeHeaderSubline>
  );
}
