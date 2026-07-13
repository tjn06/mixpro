import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { recipeMenuLabel } from "../../domain/recipe/types";
import { recipePlaceholderDescription } from "../../domain/recipe/descriptions";
import { savedMixDisplayName } from "../../saved-mixes/display";
import { getHumanSavedTime } from "../../saved-mixes/humanSavedTime";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import { useTickingNow } from "../../hooks/useTickingNow";
import { SavedIcon } from "../shared/ActionIcons";
import { SHEET_LIST_ROW_CLASS } from "./sheetChrome";

const EXIT_MS = 220;
const SAVES_PER_RECIPE = 2;

function latestSavesByRecipeId(
  mixes: readonly SavedMixSnapshot[],
  limit = SAVES_PER_RECIPE,
): Map<string, SavedMixSnapshot[]> {
  const sorted = [...mixes].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const map = new Map<string, SavedMixSnapshot[]>();
  for (const mix of sorted) {
    const list = map.get(mix.recipeId) ?? [];
    if (list.length < limit) {
      list.push(mix);
      map.set(mix.recipeId, list);
    }
  }
  return map;
}

function ChevronUpIcon() {
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
    >
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

function RecipePickerCard({
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
  const title = recipeMenuLabel(recipe);
  const description = recipePlaceholderDescription(recipe.id);
  const disabled = !selectable;

  return (
    <button
      type="button"
      role="option"
      aria-selected={current}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect();
      }}
      className={`${SHEET_LIST_ROW_CLASS} recipe-picker-card text-left touch-manipulation w-full flex flex-col items-stretch min-w-0 h-full${
        current ? " recipe-picker-card--current" : ""
      }`}
      style={{ cursor: disabled ? "default" : "pointer" }}
    >
      <span className="recipe-picker-card__row">
        <span className="min-w-0 recipe-picker-card__title">{title}</span>
        <span className="recipe-picker-card__icon" aria-hidden={!current}>
          {current ? <SavedIcon size={12} /> : null}
        </span>
      </span>
      <span className="recipe-picker-card__desc">{description}</span>
    </button>
  );
}

function RecipePickerSaveItem({
  mix,
  current,
  now,
  onSelect,
}: {
  mix: SavedMixSnapshot;
  current: boolean;
  now: Date;
  onSelect: () => void;
}) {
  const name = savedMixDisplayName(mix);
  const { timestamp } = getHumanSavedTime(new Date(mix.savedAt), now);

  return (
    <button
      type="button"
      className={`recipe-picker-save-item touch-manipulation w-full text-left${
        current ? " recipe-picker-save-item--current" : ""
      }`}
      aria-current={current || undefined}
      onClick={onSelect}
    >
      <span className="recipe-picker-save-item__name">{name}</span>
      <span className="recipe-picker-save-item__date">{timestamp}</span>
    </button>
  );
}

export interface RecipePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired when the menu DOM is shown or fully removed (includes exit animation). */
  onPresentChange?: (present: boolean) => void;
  anchorRef: RefObject<HTMLElement | null>;
  recipes: BlendingRecipe[];
  value: BlendingRecipe;
  onChange: (recipe: BlendingRecipe) => void;
  allowReselectCurrent?: boolean;
  savedMixes?: readonly SavedMixSnapshot[];
  loadedSavedMixId?: string | null;
  onSavedMixSelect?: (mix: SavedMixSnapshot) => void;
}

type MenuPhase = "enter" | "idle" | "exit";

/** Anchored recipe menu — recipe matrix with per-recipe recent saves. */
export function RecipePickerSheet({
  open,
  onOpenChange,
  onPresentChange,
  anchorRef,
  recipes,
  value,
  onChange,
  allowReselectCurrent = false,
  savedMixes = [],
  loadedSavedMixId = null,
  onSavedMixSelect,
}: RecipePickerSheetProps) {
  const [present, setPresent] = useState(false);
  const [phase, setPhase] = useState<MenuPhase>("idle");
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [anchorTop, setAnchorTop] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const exitTimerRef = useRef<number | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const now = useTickingNow(present && phase !== "exit");

  const savesByRecipeId = useMemo(
    () => latestSavesByRecipeId(savedMixes, SAVES_PER_RECIPE),
    [savedMixes],
  );

  const requestClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const finishExit = useCallback(() => {
    if (openRef.current) return;
    if (exitTimerRef.current != null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setPresent(false);
    setPhase("idle");
    setPortal(null);
    setAnchorTop(null);
    onPresentChange?.(false);
  }, [onPresentChange]);

  const measureAnchor = useCallback(() => {
    const anchor = anchorRef.current;
    const frame = anchor?.closest<HTMLElement>(".app-frame");
    if (!anchor || !frame) return null;
    const row = anchor.querySelector<HTMLElement>(".app-header__recipe-row") ?? anchor;
    const frameRect = frame.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    return Math.max(0, rowRect.bottom - frameRect.top);
  }, [anchorRef]);

  useEffect(() => {
    if (open) {
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setPresent(true);
      setPhase("enter");
      onPresentChange?.(true);
      return;
    }
    setPhase((current) => (current === "idle" || current === "enter" ? "exit" : current));
  }, [open, onPresentChange]);

  useEffect(() => {
    if (phase !== "exit") return;
    exitTimerRef.current = window.setTimeout(finishExit, EXIT_MS + 50);
    return () => {
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [phase, finishExit]);

  useLayoutEffect(() => {
    if (!present) return;
    const anchor = anchorRef.current;
    const frame = anchor?.closest<HTMLElement>(".app-frame") ?? null;
    setPortal(frame);
    const update = () => setAnchorTop(measureAnchor());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [present, anchorRef, measureAnchor]);

  useEffect(() => {
    if (!present || phase === "exit") return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      requestClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [present, phase, requestClose, anchorRef]);

  useEffect(() => {
    if (!present || phase === "exit") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [present, phase, requestClose]);

  const handleMenuAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (phase === "enter") {
        setPhase("idle");
        return;
      }
      if (phase === "exit" && !openRef.current) {
        finishExit();
      }
    },
    [phase, finishExit],
  );

  if (!present || !portal || anchorTop == null) return null;

  const menuPhaseClass =
    phase === "enter"
      ? " recipe-picker-menu--enter"
      : phase === "exit"
        ? " recipe-picker-menu--exit"
        : "";

  const menu = (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col pointer-events-auto recipe-picker-anchor"
      style={{ top: anchorTop, zIndex: 33 }}
      role="presentation"
    >
      <div
        ref={menuRef}
        className={`recipe-picker-menu flex-1 min-h-0 flex flex-col overflow-hidden${menuPhaseClass}`}
        style={{ borderRadius: 0 }}
        role="dialog"
        aria-label="Recipes and saved mixes"
        onAnimationEnd={handleMenuAnimationEnd}
      >
        <div className="recipe-picker-scroll app-gutter-x flex-1 min-h-0 overflow-y-auto overscroll-none">
          <div className="recipe-picker-matrix">
            <div className="recipe-picker-matrix__grid">
              <div
                className="recipe-picker-matrix__recipes-stack"
                role="listbox"
                aria-label="Recipes"
              >
                <h3 className="recipe-picker-matrix__head-label recipe-picker-matrix__head-slot">
                  Recipes
                </h3>
                {recipes.map((recipe) => {
                  const current = recipe.id === value.id;
                  const selectable = !current || allowReselectCurrent;
                  return (
                    <div key={recipe.id} className="recipe-picker-matrix__recipe">
                      <RecipePickerCard
                        recipe={recipe}
                        current={current}
                        selectable={selectable}
                        onSelect={() => {
                          onChange(recipe);
                          requestClose();
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="recipe-picker-matrix__connectors-stack" aria-hidden>
                <div className="recipe-picker-matrix__head-slot" />
                {recipes.map((recipe) => (
                  <div key={recipe.id} className="recipe-picker-matrix__connector-slot">
                    <span className="recipe-picker-matrix__branch" aria-hidden />
                  </div>
                ))}
              </div>
              <div className="recipe-picker-matrix__saves-rail">
                <h3 className="recipe-picker-matrix__head-label recipe-picker-matrix__head-slot recipe-picker-matrix__head-label--saves">
                  Latest Mixes
                </h3>
                {recipes.map((recipe) => {
                  const saves = savesByRecipeId.get(recipe.id) ?? [];
                  return (
                    <div
                      key={recipe.id}
                      className="recipe-picker-matrix__saves-cell"
                      role="list"
                      aria-label={`Saved mixes for ${recipeMenuLabel(recipe)}`}
                    >
                      {saves.map((mix) => (
                        <RecipePickerSaveItem
                          key={mix.id}
                          mix={mix}
                          current={mix.id === loadedSavedMixId}
                          now={now}
                          onSelect={() => {
                            onSavedMixSelect?.(mix);
                            requestClose();
                          }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="recipe-picker-close header-icon-btn"
          aria-label="Close recipe menu"
          onClick={requestClose}
        >
          <ChevronUpIcon />
        </button>
      </div>
    </div>
  );

  return createPortal(menu, portal);
}
