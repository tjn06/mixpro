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
  DEFAULT_BUCKET_SELECTION,
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
import { GoToIcon, SavedIcon } from "../shared/ActionIcons";
import { SHEET_LIST_ROW_CLASS } from "./sheetChrome";
import { ScrollEdgeFadeOverlays, useScrollEdgeFades } from "./scrollEdgeFades";

type MenuPhase = "enter" | "idle" | "exit";

const EXIT_MS = 220;
const LATEST_MIXES_LIMIT = 4;
const PICKER_BUCKET_OPTIONS: BucketSelection[] = [...BUCKET_SIZES, "none"];

function defaultPickerBucket(
  recipeId: string,
  appliedRecipeId: string,
  appliedBucket: BucketSelection,
): BucketSelection {
  return recipeId === appliedRecipeId ? appliedBucket : DEFAULT_BUCKET_SELECTION;
}

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

function ChevronDownIcon({
  open = false,
  className = "recipe-picker-card__bucket-chevron",
}: {
  open?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`${className}${open ? ` ${className}--open` : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function HorizontalSwipeHintIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="recipe-picker-card__saves-wheel-hint-icon"
    >
      <path
        d="M2 12h3.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />
      <path
        d="M4.75 12h4"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeOpacity="0.62"
      />
      <path
        d="M7.75 12h4.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
      <path
        d="M12.75 12h6.75"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="20.75" cy="12" r="2.85" fill="currentColor" />
      <path
        d="M12.25 12c0-2.35 1.65-4 4-4"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
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

function savesForRecipe(
  recipeId: string,
  savedMixes: readonly SavedMixSnapshot[],
): SavedMixSnapshot[] {
  return [...savedMixes]
    .filter((mix) => mix.recipeId === recipeId)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

function RecipePickerSavesWheel({
  recipeSaves,
  loadedSavedMixId,
  now,
  active,
  onSavedMixSelect,
}: {
  recipeSaves: readonly SavedMixSnapshot[];
  loadedSavedMixId: string | null;
  now: Date;
  active: boolean;
  onSavedMixSelect?: (mix: SavedMixSnapshot) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wasActiveRef = useRef(false);
  const [hintIntro, setHintIntro] = useState(false);

  const updateWheelStyles = useCallback(() => {
    const scroller = scrollRef.current;
    const wrap = wrapRef.current;
    if (!scroller) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    const hasOverflow = maxScroll > 4;
    const atStart = scroller.scrollLeft <= 4;
    const atEnd = scroller.scrollLeft >= maxScroll - 4;

    wrap?.classList.toggle(
      "recipe-picker-card__saves-wheel-wrap--overflow-end",
      hasOverflow && !atEnd,
    );
    wrap?.classList.toggle(
      "recipe-picker-card__saves-wheel-wrap--overflow-start",
      hasOverflow && !atStart,
    );

    const focusEdge = scroller.scrollLeft + 8;

    itemRefs.current.forEach((item) => {
      if (!item) return;

      const itemWidth = item.offsetWidth;
      if (itemWidth <= 0) return;

      const dist = item.offsetLeft - focusEdge;
      const focused = dist >= -itemWidth * 0.25 && dist <= itemWidth * 0.35;

      if (focused) {
        item.style.transform = "scale(1)";
        item.style.opacity = "1";
      } else if (dist > 0) {
        const t = Math.min(1, dist / Math.max(scroller.clientWidth * 0.65, itemWidth * 1.5));
        const scale = 1 - t * 0.24;
        const opacity = 1 - t * 0.58;
        item.style.transform = `scale(${scale})`;
        item.style.opacity = String(Math.max(0.38, opacity));
      } else {
        const t = Math.min(1, Math.abs(dist) / itemWidth);
        item.style.transform = `scale(${1 - t * 0.12})`;
        item.style.opacity = String(Math.max(0.22, 1 - t * 0.75));
      }

      item.classList.toggle("recipe-picker-card__saves-wheel-item--focused", focused);
    });
  }, []);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "instant") => {
    const scroller = scrollRef.current;
    const item = itemRefs.current[index];
    if (!scroller || !item) return;
    const targetLeft = item.offsetLeft - 8;
    scroller.scrollTo({ left: Math.max(0, targetLeft), behavior });
    requestAnimationFrame(updateWheelStyles);
  }, [updateWheelStyles]);

  useLayoutEffect(() => {
    if (!active) {
      wasActiveRef.current = false;
      setHintIntro(false);
      return;
    }

    const isFirstOpen = !wasActiveRef.current;
    wasActiveRef.current = true;

    itemRefs.current = itemRefs.current.slice(0, recipeSaves.length);
    const initialIndex = Math.max(
      0,
      recipeSaves.findIndex((mix) => mix.id === loadedSavedMixId),
    );
    scrollToIndex(initialIndex);

    if (isFirstOpen) {
      const scroller = scrollRef.current;
      if (scroller && scroller.scrollWidth - scroller.clientWidth > 4) {
        setHintIntro(true);
      }
    }
  }, [active, recipeSaves, loadedSavedMixId, scrollToIndex]);

  useEffect(() => {
    if (!hintIntro) return;
    const hint = hintRef.current;
    if (!hint) return;

    const onAnimationEnd = () => {
      setHintIntro(false);
    };

    hint.addEventListener("animationend", onAnimationEnd);
    return () => hint.removeEventListener("animationend", onAnimationEnd);
  }, [hintIntro]);

  useEffect(() => {
    if (!active) return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateWheelStyles);
    };

    const onScrollEnd = () => {
      updateWheelStyles();
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);

    const resizeObserver = new ResizeObserver(() => {
      updateWheelStyles();
    });
    resizeObserver.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScrollEnd);
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [active, updateWheelStyles, recipeSaves.length]);

  return (
    <div ref={wrapRef} className="recipe-picker-card__saves-wheel-wrap">
      <div
        ref={scrollRef}
        className="recipe-picker-card__saves-wheel"
        role="list"
        aria-label="Saved mixes"
      >
        <div className="recipe-picker-card__saves-wheel-track">
          {recipeSaves.map((mix, index) => (
            <div
              key={mix.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className="recipe-picker-card__saves-wheel-item"
            >
              <RecipePickerSaveItem
                mix={mix}
                current={mix.id === loadedSavedMixId}
                now={now}
                compact
                wheel
                onSelect={() => onSavedMixSelect?.(mix)}
              />
            </div>
          ))}
        </div>
      </div>
      <div
        ref={hintRef}
        className={`recipe-picker-card__saves-wheel-hint${
          hintIntro ? " recipe-picker-card__saves-wheel-hint--intro" : ""
        }`}
        aria-hidden
      >
        <HorizontalSwipeHintIcon size={15} />
      </div>
    </div>
  );
}

function RecipePickerCardDetail({
  recipe,
  initialBinderSum,
  sandType,
  bucketSelection,
  onBucketChange,
  savedMixes,
  loadedSavedMixId,
  now,
  onSavedMixSelect,
  muted = false,
}: {
  recipe: BlendingRecipe;
  initialBinderSum: number;
  sandType: SandType;
  bucketSelection: BucketSelection;
  onBucketChange: (selection: BucketSelection) => void;
  savedMixes: readonly SavedMixSnapshot[];
  loadedSavedMixId: string | null;
  now: Date;
  onSavedMixSelect?: (mix: SavedMixSnapshot) => void;
  muted?: boolean;
}) {
  const [bucketOpen, setBucketOpen] = useState(false);
  const recipeSaves = useMemo(
    () => savesForRecipe(recipe.id, savedMixes),
    [recipe.id, savedMixes],
  );
  const recipeSummaryParts = getRecipeSummaryParts(recipe);
  const { totalGrams: bucketRecommendedGrams, fillLiters: bucketRecommendedLiters } = useMemo(
    () => recommendedBatchForBucket(recipe, initialBinderSum, bucketSelection, sandType),
    [recipe, initialBinderSum, bucketSelection, sandType],
  );
  const bucketSizeLabelId = `recipe-picker-bucket-size-${recipe.id}`;

  useEffect(() => {
    setBucketOpen(true);
  }, [recipe.id]);

  return (
    <>
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
          <div
            className={`recipe-picker-card-detail__bucket${
              bucketOpen ? " recipe-picker-card-detail__bucket--open" : ""
            }`}
          >
            <button
              type="button"
              className="recipe-picker-card-detail__bucket-toggle touch-manipulation"
              aria-expanded={bucketOpen}
              aria-controls={`recipe-picker-bucket-options-${recipe.id}`}
              onClick={() => setBucketOpen((open) => !open)}
            >
              <span className="recipe-picker-card-detail__bucket-label-group">
                <span id={bucketSizeLabelId} className="recipe-picker-side-meta__label">
                  Bucket
                </span>
                <ChevronDownIcon open={bucketOpen} className="recipe-picker-card__bucket-chevron" />
              </span>
              <span
                className="recipe-picker-card-detail__bucket-selection recipe-picker-side-meta__value recipe-picker-side-meta__value--strong"
                aria-hidden={bucketOpen}
              >
                {pickerBucketOptionLabel(bucketSelection)}
              </span>
            </button>
            <div className="recipe-picker-card-detail__bucket-body">
              <div
                className={`recipe-picker-card-detail__bucket-pane recipe-picker-card-detail__bucket-pane--mini${
                  bucketOpen ? " recipe-picker-card-detail__bucket-pane--hidden" : ""
                }`}
                aria-hidden={bucketOpen}
              >
                <BucketMiniature
                  bucketSelection={bucketSelection}
                  fillLiters={bucketSelection === "none" ? 0 : bucketRecommendedLiters}
                  muted={muted}
                  className="recipe-picker-card-detail__mini recipe-picker-card-detail__mini--hero"
                />
              </div>
              <div
                id={`recipe-picker-bucket-options-${recipe.id}`}
                className={`recipe-picker-card-detail__bucket-pane recipe-picker-card-detail__bucket-pane--options recipe-picker-card-detail__radios${
                  bucketOpen ? "" : " recipe-picker-card-detail__bucket-pane--hidden"
                }`}
                role="radiogroup"
                aria-labelledby={bucketSizeLabelId}
                aria-hidden={!bucketOpen}
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
                        tabIndex={bucketOpen ? 0 : -1}
                        aria-label={pickerBucketAriaLabel(option, checked)}
                        onChange={() => {
                          onBucketChange(option);
                          setBucketOpen(false);
                        }}
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
      <div className="recipe-picker-card__footer recipe-picker-card__saves-panel">
        <div className="recipe-picker-card__saves-bar">
          <div className="recipe-picker-card__saves-head">
            <span className="recipe-picker-card__saves-label-group">
              <span className="recipe-picker-side-meta__label">Latest saves</span>
              {recipeSaves.length > 0 ? (
                <span className="recipe-picker-card__saves-count">{recipeSaves.length}</span>
              ) : null}
            </span>
          </div>
          <div
            id={`recipe-picker-saves-${recipe.id}`}
            className="recipe-picker-card__saves-scroll"
            role="region"
            aria-label={`Saved mixes for ${recipeMenuLabel(recipe)}`}
          >
            {recipeSaves.length === 0 ? (
              <p className="recipe-picker-card__saves-empty">No saved mixes for this recipe yet.</p>
            ) : (
              <RecipePickerSavesWheel
                recipeSaves={recipeSaves}
                loadedSavedMixId={loadedSavedMixId}
                now={now}
                active
                onSavedMixSelect={onSavedMixSelect}
              />
            )}
          </div>
        </div>
      </div>
    </>
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
  savedMixes = [],
  loadedSavedMixId = null,
  now,
  onSavedMixSelect,
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
  savedMixes?: readonly SavedMixSnapshot[];
  loadedSavedMixId?: string | null;
  now: Date;
  onSavedMixSelect?: (mix: SavedMixSnapshot) => void;
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
          <GoToIcon size={18} />
        </button>
      </div>
      {expanded && onBucketChange ? (
        <RecipePickerCardDetail
          recipe={recipe}
          initialBinderSum={initialBinderSum}
          sandType={sandType}
          bucketSelection={bucketSelection}
          onBucketChange={onBucketChange}
          savedMixes={savedMixes}
          loadedSavedMixId={loadedSavedMixId}
          now={now}
          onSavedMixSelect={onSavedMixSelect}
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
  compact = false,
  wheel = false,
  onSelect,
}: {
  mix: SavedMixSnapshot;
  current: boolean;
  now: Date;
  compact?: boolean;
  wheel?: boolean;
  onSelect: () => void;
}) {
  const name = savedMixDisplayName(mix);
  const { timestamp } = getHumanSavedTime(new Date(mix.savedAt), now);

  return (
    <button
      type="button"
      className={`${SHEET_LIST_ROW_CLASS} recipe-picker-latest-item touch-manipulation w-full text-left${
        compact ? " recipe-picker-latest-item--compact" : ""
      }${wheel ? " recipe-picker-latest-item--wheel" : ""}${
        current ? " recipe-picker-latest-item--current" : ""
      }`}
      aria-current={current || undefined}
      onClick={onSelect}
    >
      <span className="recipe-picker-latest-item__name">{name}</span>
      <span className="recipe-picker-latest-item__meta">
        {compact ? timestamp : `${mix.recipeName} · ${timestamp}`}
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
  /** Called only when a recipe is applied — not while previewing in the menu. */
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
  const [previewBucketOverrides, setPreviewBucketOverrides] = useState<
    Partial<Record<string, BucketSelection>>
  >({});
  const previewRecipeRef = useRef(value);
  previewRecipeRef.current = previewRecipe;
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [anchorTop, setAnchorTop] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  const scrollEdges = useScrollEdgeFades(
    scrollRef,
    present && phase !== "exit",
    `${previewRecipe.id}:${showBucketDetail}:${recentMixes.length}:${displayRecipes.length}:${phase}`,
  );

  const resolvePickerBucket = useCallback(
    (recipeId: string): BucketSelection => {
      const override = previewBucketOverrides[recipeId];
      if (override != null) return override;
      return defaultPickerBucket(recipeId, value.id, bucketSelection);
    },
    [previewBucketOverrides, value.id, bucketSelection],
  );

  const handlePreviewRecipe = useCallback((recipe: BlendingRecipe) => {
    setPreviewBucketOverrides((prev) => {
      const previousId = previewRecipeRef.current.id;
      if (previousId === recipe.id || !(previousId in prev)) return prev;
      const next = { ...prev };
      delete next[previousId];
      return next;
    });
    setPreviewRecipe(recipe);
  }, []);

  const handlePreviewBucketChange = useCallback(
    (recipeId: string, selection: BucketSelection) => {
      setPreviewBucketOverrides((prev) => ({ ...prev, [recipeId]: selection }));
    },
    [],
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
      setPreviewRecipe(value);
      setPreviewBucketOverrides({});
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
        <div className="scroll-edge-fade-viewport flex-1 min-h-0 relative flex flex-col">
          <ScrollEdgeFadeOverlays
            fromTop={scrollEdges.fromTop}
            fromBottom={scrollEdges.fromBottom}
          />
          <div
            ref={scrollRef}
            className="recipe-picker-scroll app-gutter-x flex-1 min-h-0 overflow-y-auto overscroll-none"
          >
            <div className="recipe-picker-matrix">
            <div className="recipe-picker-matrix__grid" role="listbox" aria-label="Recipes">
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
                      bucketSelection={resolvePickerBucket(recipe.id)}
                      onBucketChange={
                        onBucketChange
                          ? (selection) => handlePreviewBucketChange(recipe.id, selection)
                          : undefined
                      }
                      muted={muted}
                      savedMixes={savedMixes}
                      loadedSavedMixId={loadedSavedMixId}
                      now={now}
                      onSavedMixSelect={(mix) => {
                        onSavedMixSelect?.(mix);
                        requestClose();
                      }}
                      onPreview={() => handlePreviewRecipe(recipe)}
                      onApply={() => {
                        if (placeholder) return;
                        onBucketChange?.(resolvePickerBucket(recipe.id));
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
