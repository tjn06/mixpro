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
import {
  BUCKET_SIZES,
  type BucketSelection,
} from "../../domain/bucket/types";
import { recommendedBatchForBucket } from "../../domain/bucket/limits";
import type { SandType } from "../../domain/mix/volume";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { recipeMenuLabel } from "../../domain/recipe/types";
import { getRecipeSummaryParts } from "../../domain/recipe/calc";
import { recipePlaceholderDescription } from "../../domain/recipe/descriptions";
import { savedMixDisplayName } from "../../saved-mixes/display";
import { getHumanSavedTime } from "../../saved-mixes/humanSavedTime";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import { useTickingNow } from "../../hooks/useTickingNow";
import { BucketMiniature } from "../mixer/MixBucket";
import { SavedIcon } from "../shared/ActionIcons";
import { SHEET_LIST_ROW_CLASS } from "./sheetChrome";

type MenuPhase = "enter" | "idle" | "exit";

const EXIT_MS = 220;
const LATEST_MIXES_LIMIT = 4;
const PICKER_BUCKET_OPTIONS: BucketSelection[] = [...BUCKET_SIZES, "none"];

function pickerBucketOptionLabel(option: BucketSelection): string {
  if (option === "none") return "∞";
  return `${option} L`;
}

function pickerBucketAriaLabel(option: BucketSelection, selected: boolean): string {
  const sizeLabel = option === "none" ? "Infinite, no bucket limit" : `${option} liter bucket`;
  return selected ? `${sizeLabel}, selected` : sizeLabel;
}

function formatRecommendedBatch(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(3)} kg`;
  return `${Math.round(grams)} g`;
}

function latestSaves(mixes: readonly SavedMixSnapshot[], limit = LATEST_MIXES_LIMIT) {
  return [...mixes]
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, limit);
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

function ChevronRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

const RECIPE_PICKER_DEMO_PLACEHOLDER_COUNT = 8;

function recipePickerDemoPlaceholderRecipes(): BlendingRecipe[] {
  return Array.from({ length: RECIPE_PICKER_DEMO_PLACEHOLDER_COUNT }, (_, index) => ({
    id: `picker-demo-${index + 1}`,
    name: `Placeholder ${index + 1}`,
    nameSubline: "Scroll demo",
    initialBinderSum: 1500,
    binderParts: [
      { id: "A", parts: 2, label: "Resin" },
      { id: "B", parts: 1, label: "Hardener" },
    ],
    binderPercents:
      index % 2 === 0 ? [{ id: "SAND", percent: 400, label: "Filler" }] : [],
  }));
}

function isRecipePickerDemoPlaceholder(recipe: BlendingRecipe): boolean {
  return recipe.id.startsWith("picker-demo-");
}

function RecipePickerCardDetail({
  recipe,
  initialBinderSum,
  sandType,
  bucketSelection,
  onBucketChange,
  muted = false,
}: {
  recipe: BlendingRecipe;
  initialBinderSum: number;
  sandType: SandType;
  bucketSelection: BucketSelection;
  onBucketChange: (selection: BucketSelection) => void;
  muted?: boolean;
}) {
  const recipeSummaryParts = getRecipeSummaryParts(recipe);
  const { totalGrams: bucketRecommendedGrams, fillLiters: bucketRecommendedLiters } = useMemo(
    () => recommendedBatchForBucket(recipe, initialBinderSum, bucketSelection, sandType),
    [recipe, initialBinderSum, bucketSelection, sandType],
  );
  const bucketSizeLabelId = `recipe-picker-bucket-size-${recipe.id}`;

  return (
    <div className="recipe-picker-card__detail">
      <div className="recipe-picker-card__detail-section recipe-picker-card__detail-meta">
        <div className="recipe-picker-card__detail-row recipe-picker-card__detail-row--recipe">
          <span className="recipe-picker-side-meta__label">Recipe</span>
          <div className="recipe-picker-card__detail-recipe">
            {recipeSummaryParts.ratio ? (
              <span className="recipe-picker-side-meta__ratio">{recipeSummaryParts.ratio}</span>
            ) : null}
            {recipeSummaryParts.detail ? (
              <span className="recipe-picker-card__detail-recipe-fill">
                {recipeSummaryParts.detail}
              </span>
            ) : null}
          </div>
        </div>
        <div className="recipe-picker-card__detail-row recipe-picker-card__detail-row--batch">
          <span className="recipe-picker-side-meta__label">Rec. batch</span>
          <span className="recipe-picker-side-meta__value recipe-picker-side-meta__value--strong">
            {formatRecommendedBatch(bucketRecommendedGrams)}
          </span>
        </div>
      </div>
      <div className="recipe-picker-card__detail-section recipe-picker-card__detail-bucket">
        <div className="recipe-picker-card-detail__bucket">
          <p id={bucketSizeLabelId} className="recipe-picker-side-meta__label">
            Bucket size
          </p>
          <div className="recipe-picker-card-detail__bucket-row">
            <BucketMiniature
              bucketSelection={bucketSelection}
              fillLiters={bucketSelection === "none" ? 0 : bucketRecommendedLiters}
              muted={muted}
              className="recipe-picker-card-detail__mini"
            />
            <div
              className="recipe-picker-card-detail__radios"
              role="radiogroup"
              aria-labelledby={bucketSizeLabelId}
            >
              {PICKER_BUCKET_OPTIONS.map((option) => {
                const checked = bucketSelection === option;
                return (
                  <label
                    key={String(option)}
                    className={`recipe-picker-bucket-radio${
                      checked ? " recipe-picker-bucket-radio--checked" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={`recipe-picker-bucket-size-${recipe.id}`}
                      value={String(option)}
                      checked={checked}
                      aria-label={pickerBucketAriaLabel(option, checked)}
                      onChange={() => onBucketChange(option)}
                    />
                    <span>{pickerBucketOptionLabel(option)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecipePickerCard({
  recipe,
  selected,
  applied,
  canApply,
  showDetail,
  initialBinderSum,
  sandType,
  bucketSelection,
  onBucketChange,
  muted,
  onPreview,
  onApply,
}: {
  recipe: BlendingRecipe;
  selected: boolean;
  applied: boolean;
  canApply: boolean;
  showDetail: boolean;
  initialBinderSum: number;
  sandType: SandType;
  bucketSelection: BucketSelection;
  onBucketChange?: (selection: BucketSelection) => void;
  muted?: boolean;
  onPreview: () => void;
  onApply: () => void;
}) {
  const title = recipeMenuLabel(recipe);
  const description = recipePlaceholderDescription(recipe.id);
  const expanded = selected && showDetail;

  return (
    <div
      role="option"
      aria-selected={selected}
      aria-expanded={expanded || undefined}
      className={`${SHEET_LIST_ROW_CLASS} recipe-picker-card w-full flex flex-col items-stretch min-w-0${
        selected ? " recipe-picker-card--selected" : ""
      }${applied ? " recipe-picker-card--applied" : ""}${expanded ? " recipe-picker-card--expanded" : ""}`}
    >
      <div className="recipe-picker-card__header">
        <button
          type="button"
          className="recipe-picker-card__body text-left touch-manipulation flex flex-col items-stretch min-w-0 flex-1"
          onClick={onPreview}
        >
          <span className="recipe-picker-card__row">
            <span className="min-w-0 recipe-picker-card__title">{title}</span>
            {applied ? (
              <span className="recipe-picker-card__badge" aria-label="Current recipe">
                <SavedIcon size={12} />
              </span>
            ) : null}
          </span>
          <span className="recipe-picker-card__desc">{description}</span>
        </button>
        <button
          type="button"
          className="recipe-picker-card__go touch-manipulation"
          aria-label={`Use ${title}`}
          disabled={!canApply}
          onClick={() => {
            if (!canApply) return;
            onApply();
          }}
        >
          <ChevronRightIcon />
        </button>
      </div>
      {expanded && onBucketChange ? (
        <RecipePickerCardDetail
          recipe={recipe}
          initialBinderSum={initialBinderSum}
          sandType={sandType}
          bucketSelection={bucketSelection}
          onBucketChange={onBucketChange}
          muted={muted}
        />
      ) : null}
    </div>
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
      className={`${SHEET_LIST_ROW_CLASS} recipe-picker-latest-item touch-manipulation w-full text-left${
        current ? " recipe-picker-latest-item--current" : ""
      }`}
      aria-current={current || undefined}
      onClick={onSelect}
    >
      <span className="recipe-picker-latest-item__name">{name}</span>
      <span className="recipe-picker-latest-item__meta">
        {mix.recipeName} · {timestamp}
      </span>
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
  bucketSelection?: BucketSelection;
  onBucketChange?: (selection: BucketSelection) => void;
  initialBinderSum?: number;
  sandType?: SandType;
  muted?: boolean;
}

/** Anchored recipe menu — recipes with expandable bucket detail, latest mixes at bottom. */
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
  bucketSelection = 17,
  onBucketChange,
  initialBinderSum = 1000,
  sandType = "medium",
  muted = false,
}: RecipePickerSheetProps) {
  const [present, setPresent] = useState(false);
  const [phase, setPhase] = useState<MenuPhase>("idle");
  const [previewRecipe, setPreviewRecipe] = useState(value);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [anchorTop, setAnchorTop] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const exitTimerRef = useRef<number | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const now = useTickingNow(present && phase !== "exit");

  const recentMixes = useMemo(() => latestSaves(savedMixes), [savedMixes]);
  const displayRecipes = useMemo(
    () => [...recipes, ...recipePickerDemoPlaceholderRecipes()],
    [recipes],
  );
  const showBucketDetail = onBucketChange != null;

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
      setPreviewRecipe(value);
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
  }, [open, onPresentChange, value]);

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
        aria-label="Recipes, bucket, and saved mixes"
        onAnimationEnd={handleMenuAnimationEnd}
      >
        <div className="recipe-picker-scroll app-gutter-x flex-1 min-h-0 overflow-y-auto overscroll-none">
          <div className="recipe-picker-matrix">
            <div className="recipe-picker-matrix__grid" role="listbox" aria-label="Recipes">
              <h3 className="recipe-picker-matrix__head-label recipe-picker-matrix__head-slot">
                Recipes
              </h3>
              {displayRecipes.map((recipe) => {
                const selected = recipe.id === previewRecipe.id;
                const applied = recipe.id === value.id;
                const placeholder = isRecipePickerDemoPlaceholder(recipe);
                return (
                  <div key={recipe.id} className="recipe-picker-matrix__recipe">
                    <RecipePickerCard
                      recipe={recipe}
                      selected={selected}
                      applied={applied}
                      canApply={!placeholder && (!applied || allowReselectCurrent)}
                      showDetail={showBucketDetail}
                      initialBinderSum={initialBinderSum}
                      sandType={sandType}
                      bucketSelection={bucketSelection}
                      onBucketChange={onBucketChange}
                      muted={muted}
                      onPreview={() => setPreviewRecipe(recipe)}
                      onApply={() => {
                        if (placeholder) return;
                        onChange(recipe);
                        requestClose();
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {recentMixes.length > 0 ? (
              <section className="recipe-picker-latest" aria-label="Latest mixes">
                <h3 className="recipe-picker-matrix__head-label recipe-picker-latest__head">
                  Latest Mixes
                </h3>
                <div className="recipe-picker-latest__list" role="list">
                  {recentMixes.map((mix) => (
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
              </section>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className={`${SHEET_LIST_ROW_CLASS} recipe-picker-close touch-manipulation`}
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
