import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BlendingRecipe } from "../recipeTypes";
import { recipeMenuLabel } from "../recipeTypes";
import { HEADER_NAV_LONG_PRESS_MS, LongPressProgress, useLongPress } from "./LongPressButton";
import { RecipeZoneMeta, RecipeZoneMetaValue } from "./RecipeZoneMeta";

const DROPDOWN_MENU_BG = "#3a3a4c";
const DROPDOWN_MENU_BORDER = "rgba(255,255,255,0.1)";
const DROPDOWN_MENU_TEXT = "#b8b8d0";
const DROPDOWN_MENU_TEXT_MUTED = "#686878";
const DROPDOWN_MENU_ACTIVE_BG = "rgba(255,255,255,0.07)";
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
        fontSize: "var(--text-ui-md)",
        fontWeight: active ? 600 : 500,
        letterSpacing: "0.04em",
        color: active ? DROPDOWN_MENU_TEXT_MUTED : DROPDOWN_MENU_TEXT,
        background: holding
          ? "#10101e"
          : active
            ? DROPDOWN_MENU_ACTIVE_BG
            : DROPDOWN_MENU_BG,
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
      </ul>,
      portal,
    )
  ) : null;

  return (
    <RecipeZoneMeta muted={muted} className="relative overflow-hidden">
      <div className="w-full min-w-0 flex flex-col items-center py-1">
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
              <RecipeZoneMetaValue muted={muted}>{recipeName}</RecipeZoneMetaValue>
              <ChevronDown open={open} />
            </button>
            {menu}
          </>
        ) : (
          <RecipeZoneMetaValue muted={muted}>{recipeName}</RecipeZoneMetaValue>
        )}
      </div>
    </RecipeZoneMeta>
  );
}
