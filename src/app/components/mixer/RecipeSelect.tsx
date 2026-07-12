import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { recipeMenuLabel } from "../../domain/recipe/types";
import { HEADER_NAV_LONG_PRESS_MS, LongPressProgress, useLongPress } from "../shared/LongPressButton";
import { RecipeHeaderRecipeRow, RecipeHeaderSubline } from "./RecipeZoneMeta";
import { theme } from "../../../theme";

const { colors: c, surfaces: s } = theme;
const DROPDOWN_MENU_MIN_W = 200;

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
  current,
  selectable,
  onSelect,
}: {
  recipe: BlendingRecipe;
  current: boolean;
  selectable: boolean;
  onSelect: () => void;
}) {
  const label = recipeMenuLabel(recipe);
  const { progress, holding, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } = useLongPress(
    onSelect,
    !selectable,
    {
      headerProgress: true,
      confirmAction: current ? "RESET RECIPE" : "NEW RECIPE",
      durationMs: HEADER_NAV_LONG_PRESS_MS,
    },
  );

  return (
    <button
      type="button"
      role="option"
      aria-selected={current}
      aria-label={
        current
          ? selectable
            ? `Hold to reset ${label}`
            : `${label}, current recipe`
          : `Hold to select ${label}`
      }
      disabled={!selectable}
      onPointerDown={selectable ? onPointerDown : undefined}
      onPointerMove={selectable ? onPointerMove : undefined}
      onPointerUp={selectable ? onPointerUp : undefined}
      onPointerCancel={selectable ? onPointerCancel : undefined}
      className={`relative w-full text-left touch-manipulation transition-colors duration-100 ${
        selectable ? "touch-none" : ""
      }`}
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: "var(--text-ui-md)",
        fontWeight: current ? 600 : 500,
        letterSpacing: "0.04em",
        color: current && !selectable ? c.dropdownMenuTextMuted : c.dropdownMenuText,
        background: holding
          ? c.inputSurface
          : current && !selectable
            ? s.dropdownMenuActiveBg
            : c.dropdownMenuBg,
        padding: "10px 14px",
        cursor: selectable ? "pointer" : "default",
        whiteSpace: "nowrap",
        opacity: current && !selectable ? 0.55 : 1,
      }}
    >
      {selectable && <LongPressProgress progress={progress} inset={10} />}
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
  /** When set, the current recipe stays selectable (reset saved mix / reload defaults). */
  allowReselectCurrent?: boolean;
}

export function RecipeSelect({
  recipes,
  value,
  onChange,
  disabled = false,
  muted = false,
  allowReselectCurrent = false,
}: RecipeSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const selectable = recipes.length > 1 && !disabled;
  const recipeName = recipeMenuLabel(value);

  const measureMenu = useCallback(() => {
    const trigger = triggerRef.current;
    const canvas = trigger?.closest<HTMLElement>("[data-beam-canvas]");
    if (!trigger || !canvas) return null;
    const tR = trigger.getBoundingClientRect();
    const cR = canvas.getBoundingClientRect();
    return {
      top: tR.bottom - cR.top + 6,
      left: tR.left + tR.width / 2 - cR.left,
      minWidth: Math.max(tR.width, DROPDOWN_MENU_MIN_W),
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuLayout(null);
      setPortal(null);
      return;
    }
    const trigger = triggerRef.current;
    const canvas = trigger?.closest<HTMLElement>("[data-beam-canvas]") ?? null;
    setPortal(canvas);
    const update = () => setMenuLayout(measureMenu());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, measureMenu]);

  useEffect(() => {
    if (!open) return;
    const onPointerDownOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => document.removeEventListener("pointerdown", onPointerDownOutside);
  }, [open]);

  const menu = open && selectable && menuLayout && portal ? (
    createPortal(
      <ul
        ref={menuRef}
        role="listbox"
        aria-label="Recipe"
        className="rounded-xl overflow-hidden shadow-lg"
        style={{
          position: "absolute",
          top: menuLayout.top,
          left: menuLayout.left,
          transform: "translateX(-50%)",
          zIndex: 40,
          width: "max-content",
          minWidth: menuLayout.minWidth,
          maxWidth: 280,
          background: c.dropdownMenuBg,
          border: `1px solid ${s.dropdownMenuBorderColor}`,
          boxShadow: s.shadowDropdown,
        }}
      >
        {recipes.map((recipe) => {
          const current = recipe.id === value.id;
          const selectable = !current || allowReselectCurrent;
          return (
            <li key={recipe.id} role="none">
              <RecipeOptionRow
                recipe={recipe}
                current={current}
                selectable={selectable}
                onSelect={() => {
                  onChange(recipe);
                  setOpen(false);
                }}
              />
            </li>
          );
        })}
      </ul>,
      portal,
    )
  ) : null;

  return (
    <RecipeHeaderSubline className="relative overflow-hidden">
      {selectable ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`${recipeName}. Tap to change recipe.`}
            className="inline-flex items-center justify-center gap-1 max-w-full min-w-0 touch-manipulation bg-transparent border-none p-0 cursor-pointer"
            onClick={() => setOpen((o) => !o)}
          >
            <RecipeHeaderRecipeRow muted={muted}>{recipeName}</RecipeHeaderRecipeRow>
            <ChevronDown open={open} />
          </button>
          {menu}
        </>
      ) : (
        <RecipeHeaderRecipeRow muted={muted}>{recipeName}</RecipeHeaderRecipeRow>
      )}
    </RecipeHeaderSubline>
  );
}
