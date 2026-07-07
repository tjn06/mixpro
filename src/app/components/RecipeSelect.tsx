import React, { useEffect, useRef, useState } from "react";
import type { BlendingRecipe } from "../recipeTypes";
import { recipeMenuLabel } from "../recipeTypes";
import { HEADER_NAV_LONG_PRESS_MS, LongPressProgress, useLongPress } from "./LongPressButton";
import { RecipeZoneMeta, RecipeZoneMetaValue } from "./RecipeZoneMeta";

const DROPDOWN_MENU_BG = "#3a3a4c";
const DROPDOWN_MENU_BORDER = "rgba(255,255,255,0.1)";
const DROPDOWN_MENU_TEXT = "#b8b8d0";
const DROPDOWN_MENU_TEXT_MUTED = "#686878";
const DROPDOWN_MENU_ACTIVE_BG = "rgba(255,255,255,0.07)";

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

function RecipeOptionRow({
  recipe,
  active,
  onSelect,
}: {
  recipe: BlendingRecipe;
  active: boolean;
  onSelect: () => void;
}) {
  const label = recipeMenuLabel(recipe);
  const { progress, holding, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } = useLongPress(
    onSelect,
    active,
    {
      headerProgress: true,
      confirmAction: "NEW RECIPE",
      durationMs: HEADER_NAV_LONG_PRESS_MS,
    },
  );

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      aria-label={
        active ? `${label}, current recipe` : `Hold to select ${label}`
      }
      disabled={active}
      onPointerDown={active ? undefined : onPointerDown}
      onPointerMove={active ? undefined : onPointerMove}
      onPointerUp={active ? undefined : onPointerUp}
      onPointerCancel={active ? undefined : onPointerCancel}
      className={`relative w-full text-left touch-manipulation transition-colors duration-100 ${
        active ? "" : "touch-none"
      }`}
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 15,
        fontWeight: active ? 600 : 500,
        letterSpacing: "0.04em",
        color: active ? DROPDOWN_MENU_TEXT_MUTED : DROPDOWN_MENU_TEXT,
        background: holding
          ? "#10101e"
          : active
            ? DROPDOWN_MENU_ACTIVE_BG
            : "transparent",
        padding: "10px 14px",
        cursor: active ? "default" : "pointer",
        whiteSpace: "nowrap",
        opacity: active ? 0.55 : 1,
      }}
    >
      {!active && <LongPressProgress progress={progress} inset={10} />}
      {label}
    </button>
  );
}

export interface RecipeSelectProps {
  recipes: BlendingRecipe[];
  value: BlendingRecipe;
  onChange: (recipe: BlendingRecipe) => void;
  disabled?: boolean;
  muted?: boolean;
}

export function RecipeSelect({
  recipes,
  value,
  onChange,
  disabled = false,
  muted = false,
}: RecipeSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectable = recipes.length > 1 && !disabled;
  const recipeName = recipeMenuLabel(value);

  useEffect(() => {
    if (!open) return;
    const onPointerDownOutside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => document.removeEventListener("pointerdown", onPointerDownOutside);
  }, [open]);

  return (
    <RecipeZoneMeta
      muted={muted}
      className={open ? "relative overflow-visible" : "relative overflow-hidden"}
    >
      <div ref={rootRef} className="w-full min-w-0 flex flex-col items-center py-1">
        {selectable ? (
          <>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-label={`${recipeName}. Tap to change recipe.`}
              className="inline-flex items-center justify-center gap-1 max-w-full min-w-0 touch-manipulation bg-transparent border-none p-0 cursor-pointer"
              onClick={() => setOpen((o) => !o)}
            >
              <RecipeZoneMetaValue muted={muted}>{recipeName}</RecipeZoneMetaValue>
              <ChevronDown open={open} />
            </button>

            {open && (
              <ul
                role="listbox"
                aria-label="Recipe"
                className="absolute left-1/2 top-full z-30 mt-1.5 -translate-x-1/2 rounded-xl overflow-hidden shadow-lg"
                style={{
                  width: "max-content",
                  minWidth: "100%",
                  maxWidth: 280,
                  background: DROPDOWN_MENU_BG,
                  border: `1px solid ${DROPDOWN_MENU_BORDER}`,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
                }}
              >
                {recipes.map((recipe) => {
                  const active = recipe.id === value.id;
                  return (
                    <li key={recipe.id} role="none">
                      <RecipeOptionRow
                        recipe={recipe}
                        active={active}
                        onSelect={() => {
                          onChange(recipe);
                          setOpen(false);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <RecipeZoneMetaValue muted={muted}>{recipeName}</RecipeZoneMetaValue>
        )}
      </div>
    </RecipeZoneMeta>
  );
}
