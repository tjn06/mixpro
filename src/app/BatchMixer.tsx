import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, forwardRef, type CSSProperties } from "react";
import { LongPressButton, LongPressEdgeProvider } from "./components/shared/LongPressButton";
import { AppHeader } from "./components/shared/AppHeader";
import {
  MixBucket,
  DEFAULT_BUCKET_SELECTION,
  type BucketSelection,
} from "./components/mixer/MixBucket";
import { reconcileBucketSelection, maxMixLitersForBucket, isBucketAtMaxFill, displayFillPercent, type BucketSize } from "./domain/bucket/types";
import { enforceBucketLimitOnChange, clampMixValuesToBucketMax, mixLitersFromValues, canHalveMix, canDoubleMix, recommendedBatchForBucket } from "./domain/bucket/limits";
import { estimateMixVolume, type SandType } from "./domain/mix/volume";
import { LongPressProgressProvider } from "./components/shared/LongPressProgressContext";
import {
  gramsFromSnapshot,
  snapshotValuesFromGrams,
  useSavedMixesStore,
} from "./saved-mixes/store";
import {
  applyRecipeChange,
  driverIdFromIndex,
  initialMixValues,
  emptyComplementValues,
  mixEpoxyGrams,
  mixSandGrams,
  recipeBinderSum,
  recipeIngredientIndexes,
} from "./domain/recipe/calc";
import { RecipeSelect } from "./components/mixer/RecipeSelect";
import { RecipeRatioRow } from "./components/mixer/RecipeRatioRow";
import {
  RecipeHeaderRecipeRow,
  RecipeHeaderSubline,
  RecipeHeaderSublineStack,
  RecipeHeaderMixContext,
  RecipeEditMixnameRow,
} from "./components/mixer/RecipeZoneMeta";
import { RecBatchPanel, LockIcon } from "./components/mixer/RecBatchPanel";
import { LockedSaveOverlay } from "./components/mixer/LockedSaveOverlay";
import { LockedUnlockOverlay } from "./components/mixer/LockedUnlockOverlay";
import { LoadSavedMixesSheet } from "./components/sheets/LoadSavedMixesSheet";
import { SaveMixNameSheet } from "./components/sheets/SaveMixNameSheet";
import { SettingsSheet } from "./components/sheets/SettingsSheet";
import { useThemeAppearanceSync } from "./hooks/useThemeAppearanceSync";
import { useSettingsStore } from "./settings/store";
import type { ColorScheme } from "../theme/appearance";
import { entityAccentColor } from "./presentation/entityAccent";
import { batchNameInputFromMixer } from "./batch-names";
import type { SavedMixSnapshot } from "./saved-mixes/types";
import { UndoIcon } from "./components/shared/ActionIcons";
import type { BlendingRecipe } from "./domain/recipe/types";
import { PRESET_RECIPES, recipeMenuLabel } from "./domain/recipe/types";
import { MIX_PARAMS as PARAMS, formatMixAmount as fmt } from "./domain/mix/entities";
import { BatchTotalsScreen } from "./components/batch-totals/BatchTotalsScreen";
import {
  CARD_NAME_WEIGHT,
  CARD_UNIT_WEIGHT,
  ENTITY_SURFACE_IDLE,
  cardReadoutNameStyle,
  cardReadoutUnitStyle,
  cardReadoutValueStyle,
  entityCardChrome,
  CARD_CHROME_TRANSITION,
  RECIPE_RATIO_BORDER_COLOR,
  entityValueColor,
  entityUnitColor,
} from "./presentation/entityCardStyles";
import {
  mixerEntityActiveRing,
  mixerEntityCardShadow,
  MIXER_OVERLAY_HINT,
  MIXER_SWIPE_ARROW_IDLE,
  MIXER_SWIPE_COLUMN_BORDER,
  MIXER_SWIPE_STEP_IDLE,
  MIXER_SWIPE_STRIPE_INVERSE,
  MIXER_SWIPE_SURFACE_BASE,
} from "./presentation/mixerSwipeConfig";

import { componentTokens, cv } from "./ui/tokens";

const ch = componentTokens.chrome;

// All values stored internally in grams — index order: TOTAL, A, B, TIX, SAND
// PARAMS imported from mixEntities.ts

// ═══════════════════════════════════════════════════════════════════════════════
// ROUND BUTTONS + SVG CONNECTION LINES — currently disabled (thumb-reach layout)
//
// To re-enable the round-button selector row and animated card→button lines:
//   1. Uncomment LINE_MEASUREMENT_LEGACY block below (state, refs, measureLines)
//   2. Uncomment ROUND_BUTTONS_LEGACY JSX block (round selector buttons)
//   3. Uncomment SVG_LINES_LEGACY JSX block
//   4. Restore connection dots on cards (see INGREDIENT_CARDS section)
//   5. Change default active back to `0` if TOTAL should be swipe-editable again
//
// Only restore if card-only selection is insufficient in real user testing.
// ═══════════════════════════════════════════════════════════════════════════════

// /* ROUND_BUTTONS_LEGACY */ Button order left → right above swipe zone
// const BTN_ORDER = [0, 1, 2, 3, 4]; // TOTAL · A · B · TIX · SAND

const ZONES = [
  { step: 1000, label: "1000 g", weight: 40 },
  { step: 100,  label: "100 g",  weight: 26 },
  { step: 10,   label: "10 g",   weight: 20 },
  { step: 1,    label: "1 g",    weight: 18 },
] as const;

const ZONE_WEIGHT_TOTAL = ZONES.reduce((sum, z) => sum + z.weight, 0);

function zoneIndexFromX(xInArea: number, width: number): number {
  const frac = xInArea / width;
  let acc = 0;
  for (let i = 0; i < ZONES.length; i++) {
    acc += ZONES[i].weight / ZONE_WEIGHT_TOTAL;
    if (frac < acc) return i;
  }
  return ZONES.length - 1;
}

const SWIPE_HEIGHT = 180;
const SWIPE_STEPS_PER_DRAG = 10;
const SWIPE_DRAG_MARGIN_PX = 24;
const SWIPE_MAX_DY_PER_FRAME = 48;
/** Idle swipe affordances — brighter so vertical drag reads before touch. */
const SWIPE_ARROW_IDLE = MIXER_SWIPE_ARROW_IDLE;
const SWIPE_STEP_IDLE = MIXER_SWIPE_STEP_IDLE;
const CARD_CONNECTOR_Z  = 3;
const DRAG_FOCUS_Z      = 5;
const DRAG_OVERLAY_Z    = 4;
const DRAG_OVERLAY_HIDE_MS = 320;
const DRAG_BLOCKED_MS = 120;
const BUCKET_LIMIT_COLOR = cv.state.error;
const BUCKET_LIMIT_VIBRATE_MS = [10, 28, 10] as const;
const LOCK_PANEL_Z      = 6;
const LOCK_SHIELD_Z     = 5;
const LOCK_UNLOCK_Z     = 7;
const LOCK_EXPAND_MS    = 360;
const LOCK_EASE         = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const UNDO_MAX = 20;
const BOTTOM_TOTAL_WIDTH = "48%";
const SWIPE_PAD_TOP     = 0;
const LOCK_TRANSITION   = `top ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, left ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, width ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, height ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, bottom ${LOCK_EXPAND_MS}ms ${LOCK_EASE}`;
const LOCK_FADE_TRANSITION = `opacity ${LOCK_EXPAND_MS}ms ${LOCK_EASE}`;
const LOCK_TEXT_TRANSITION = `font-size ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, margin-top ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, width ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, opacity ${LOCK_EXPAND_MS}ms ${LOCK_EASE}`;

/** Opaque entity surfaces — kept subtle so white readouts stay crisp. */
const SWIPE_SURFACE_BASE = MIXER_SWIPE_SURFACE_BASE;
const ENTITY_TINT_LIT_PCT = ch.entityTintLitPct;
const SWIPE_ZONE_ACTIVE_PCT = ch.swipeZoneActivePct;
const SWIPE_STRIPE_A_PCT = ch.swipeStripeAPct;
const SWIPE_STRIPE_B_PCT = ch.swipeStripeBPct;

function surfaceTint(color: string, pct: number, base: string): string {
  return `color-mix(in srgb, ${color} ${pct}%, ${base})`;
}

function entitySurfaceLit(color: string): string {
  return surfaceTint(color, ENTITY_TINT_LIT_PCT, ENTITY_SURFACE_IDLE);
}

function swipeZoneActive(color: string): string {
  return surfaceTint(color, SWIPE_ZONE_ACTIVE_PCT, SWIPE_SURFACE_BASE);
}

function swipeZoneStripe(even: boolean): string {
  return surfaceTint(MIXER_SWIPE_STRIPE_INVERSE, even ? SWIPE_STRIPE_A_PCT : SWIPE_STRIPE_B_PCT, SWIPE_SURFACE_BASE);
}

/** Connector line between active card and swipe area. */
const CONNECTOR_W = ch.connectorWidth;

function CardLimitFlash() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 rounded-xl pointer-events-none"
      style={{
        background: surfaceTint(BUCKET_LIMIT_COLOR, ch.cardLimitFlashTintPct, "transparent"),
        zIndex: 2,
      }}
    />
  );
}

type CardConnector = { x: number; y1: number; y2: number; color: string; active: boolean };

function SwipeChevronStack({
  direction,
  active,
  color,
}: {
  direction: "up" | "down";
  active: boolean;
  color: string;
}) {
  const fill = active ? color : SWIPE_ARROW_IDLE;
  const path = direction === "up" ? "M4.5 0 L9 6 L0 6 Z" : "M4.5 6 L0 0 L9 0 Z";
  const opacities =
    direction === "up"
      ? active ? [1, 0.72, 0.48] : [0.38, 0.28, 0.2]
      : active ? [0.48, 0.72, 1] : [0.2, 0.28, 0.38];

  return (
    <div className="flex flex-col items-center gap-[2px] pointer-events-none">
      {opacities.map((opacity, i) => (
        <svg
          key={i}
          width="9"
          height="6"
          viewBox="0 0 9 6"
          fill={fill}
          style={{ opacity, transition: "opacity 0.15s ease, fill 0.15s ease" }}
          aria-hidden
        >
          <path d={path} />
        </svg>
      ))}
    </div>
  );
}

function CardReadout({
  name,
  value,
  unit,
  nameColor,
  valueColor,
  unitColor,
  centered = false,
}: {
  name: string;
  value: string;
  unit: string;
  nameColor: string;
  valueColor: string;
  unitColor: string;
  centered?: boolean;
}) {
  return (
    <div className={`flex flex-col min-w-0 ${centered ? "items-center" : "items-start"}`}>
      <span style={cardReadoutNameStyle(nameColor)}>{name}</span>
      <span className="tabular-nums" style={cardReadoutValueStyle(valueColor)}>{value}</span>
      <span style={cardReadoutUnitStyle(unitColor)}>{unit}</span>
    </div>
  );
}

type MixerScreen = "mixer" | "totals";

const TotalTile = forwardRef<HTMLButtonElement, {
  valueKg: string;
  color: string;
  colorScheme: ColorScheme;
  entityId: string;
  isActive: boolean;
  expanded?: boolean;
  limitFlash?: boolean;
  cardBump?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}>(function TotalTile({
  valueKg,
  color,
  colorScheme,
  entityId,
  isActive: cardLit,
  expanded = false,
  limitFlash = false,
  cardBump = false,
  onClick,
  className = "",
  style,
}, ref) {
  const chrome = entityCardChrome(color, cardLit);
  const tileStyle = {
    border: chrome.border,
    boxShadow: chrome.boxShadow,
    background: chrome.background,
    transition: `${CARD_CHROME_TRANSITION}, ${LOCK_TRANSITION}`,
    transform: cardBump ? "scale(1.035)" : undefined,
    ...style,
  };
  const nameColor = color;
  const valueColor = entityValueColor(cardLit, colorScheme);
  const unitColor = entityUnitColor(cardLit, colorScheme);
  const barOpacity = cardLit ? 1 : 0.4;

  if (expanded) {
    return (
      <button
        type="button"
        ref={ref}
        onClick={onClick}
        className={`flex flex-col items-center justify-center rounded-xl w-full h-full touch-none overflow-hidden relative ${className}`}
        style={{
          ...tileStyle,
          paddingTop: "var(--total-tile-expanded-py)",
          paddingBottom: "var(--total-tile-expanded-py)",
        }}
      >
        {limitFlash && <CardLimitFlash />}
        <div style={{
          width: 32,
          height: 4,
          borderRadius: 2,
          background: color,
          opacity: barOpacity,
          marginBottom: "var(--lock-bar-mb)",
          boxShadow: cardLit ? `0 0 6px ${color}` : "none",
          transition: LOCK_TEXT_TRANSITION,
        }} />
        <span style={{
          fontSize: "var(--text-lock-name)",
          letterSpacing: "0.18em",
          color: nameColor,
          fontWeight: CARD_NAME_WEIGHT,
          transition: LOCK_TEXT_TRANSITION,
        }}>
          TOTAL
        </span>
        <span className="tabular-nums" style={{
          fontSize: "var(--text-lock-value)",
          fontWeight: 600,
          color: valueColor,
          lineHeight: 1,
          marginTop: "var(--lock-value-mt)",
          transition: LOCK_TEXT_TRANSITION,
        }}>
          {valueKg}
        </span>
        <span style={{
          fontSize: "var(--text-lock-unit)",
          color: unitColor,
          letterSpacing: "0.08em",
          fontWeight: CARD_UNIT_WEIGHT,
          marginTop: "var(--lock-unit-mt)",
          transition: LOCK_TEXT_TRANSITION,
        }}>
          kg
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      className={`flex items-stretch justify-start rounded-xl w-full h-full touch-none overflow-hidden relative ${className}`}
      style={{
        ...tileStyle,
        padding: "var(--total-tile-pad-y) var(--total-tile-pad-x)",
      }}
    >
      {limitFlash && <CardLimitFlash />}
      <div style={{
        width: "var(--total-tile-bar-w)",
        flexShrink: 0,
        borderRadius: 2,
        background: color,
        opacity: barOpacity,
        marginRight: "var(--total-tile-bar-gap)",
        boxShadow: cardLit ? `0 0 6px ${color}` : "none",
        transition: CARD_CHROME_TRANSITION,
      }} />
      <div className="flex flex-1 flex-col items-start justify-center min-w-0">
        <CardReadout
          name="TOTAL"
          value={valueKg}
          unit="kg"
          nameColor={nameColor}
          valueColor={valueColor}
          unitColor={unitColor}
        />
      </div>
    </button>
  );
});

// /* LINE_MEASUREMENT_LEGACY */
// interface Line { x1: number; y1: number; x2: number; y2: number }

export interface BatchMixerProps {
  /** Initial / preferred recipe (must exist in `recipes`). */
  recipe?: BlendingRecipe;
  /** Selectable recipes for the RECIPE dropdown. */
  recipes?: BlendingRecipe[];
  /** Binder base (A + B) in grams for the initial mix. Default 1000 g. */
  initialBinderSum?: number;
  /** Initial bucket selection — 5, 10, 17 L or none. Default 17 L. */
  initialBucketSelection?: BucketSelection;
  /** Sand grain type for volume void correction. Default medium. */
  sandType?: SandType;
}

function resolveRecipe(seed: BlendingRecipe | undefined, catalog: BlendingRecipe[]): BlendingRecipe {
  const pick = seed ?? catalog[0];
  return catalog.find((r) => r.id === pick.id) ?? catalog[0];
}

export function BatchMixer({
  recipe: initialRecipe,
  recipes = PRESET_RECIPES,
  initialBinderSum = 1000,
  initialBucketSelection = DEFAULT_BUCKET_SELECTION,
  sandType = "medium",
}: BatchMixerProps) {
  const [activeRecipe, setActiveRecipe] = useState<BlendingRecipe>(() =>
    resolveRecipe(initialRecipe, recipes),
  );
  const resolvedInitial = resolveRecipe(initialRecipe, recipes);
  const [values, setValues]         = useState<number[]>(() =>
    initialMixValues(resolvedInitial, recipeBinderSum(resolvedInitial, initialBinderSum)),
  );
  const [bucketSelection, setBucketSelection] = useState<BucketSelection>(initialBucketSelection);
  const [active, setActive]         = useState(0);
  const [activeZone, setActiveZone] = useState<number | null>(null);
  const [canUndo, setCanUndo]       = useState(false);
  const [saveFlash, setSaveFlash]   = useState(false);
  const [loadPickerOpen, setLoadPickerOpen] = useState(false);
  const [saveNameSheetOpen, setSaveNameSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadedSavedMixId, setLoadedSavedMixId] = useState<string | null>(null);
  const [screen, setScreen] = useState<MixerScreen>("mixer");
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [complementValues, setComplementValues] = useState(() => emptyComplementValues());
  const [dragFocus, setDragFocus]   = useState(false);
  const [dragDirection, setDragDirection] = useState<"up" | "down" | null>(null);
  const [dragBlocked, setDragBlocked] = useState(false);
  const [isLocked, setIsLocked]     = useState(false);
  const [unlockOverlayActive, setUnlockOverlayActive] = useState(false);
  const [connectorLines, setConnectorLines] = useState<CardConnector[]>([]);
  const [swipeHeight, setSwipeHeight] = useState(SWIPE_HEIGHT);
  const [sectionGap, setSectionGap] = useState(12);

  // /* LINE_MEASUREMENT_LEGACY */
  // const [lines, setLines] = useState<Line[]>([]);

  const containerRef   = useRef<HTMLDivElement>(null);
  const swipeAreaRef   = useRef<HTMLDivElement>(null);
  const cardRefs       = useRef<(HTMLButtonElement | null)[]>([]);
  const totalTileRef    = useRef<HTMLButtonElement>(null);
  const bucketRef       = useRef<HTMLDivElement>(null);
  const bucketReadoutRef = useRef<HTMLDivElement>(null);
  const recBatchColRef  = useRef<HTMLDivElement>(null);
  const editRowRef      = useRef<HTMLDivElement>(null);
  const recPanelRef     = useRef<HTMLDivElement>(null);
  const recReadoutRef   = useRef<HTMLDivElement>(null);
  const resetButtonRef  = useRef<HTMLButtonElement>(null);
  const actionsBlockRef = useRef<HTMLDivElement>(null);
  const saveButtonRef   = useRef<HTMLButtonElement>(null);
  const controlDeckRef  = useRef<HTMLDivElement>(null);
  const bottomActionsColRef = useRef<HTMLDivElement>(null);
  const lockButtonRef   = useRef<HTMLButtonElement>(null);
  const ingredientCardsRef = useRef<HTMLDivElement>(null);
  const recipeRef      = useRef(activeRecipe);
  recipeRef.current    = activeRecipe;
  const bucketSelectionRef = useRef(bucketSelection);
  bucketSelectionRef.current = bucketSelection;

  const isDragging     = useRef(false);
  const dragStartY     = useRef(0);
  const dragLastY      = useRef(0);
  const dragBaseVal    = useRef(0);
  const dragStepSize   = useRef(1);
  const dragUndoSaved  = useRef(false);
  const undoStack      = useRef<number[][]>([]);
  const valuesRef      = useRef(values);
  const rafPending     = useRef(false);
  const pendingValues  = useRef<number[] | null>(null);
  const dragOverlayHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragBlockedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  valuesRef.current    = values;

  const totalParam = PARAMS[0];
  const isTotalAct = active === 0;

  const ingredientIndexes = useMemo(
    () => recipeIngredientIndexes(activeRecipe),
    [activeRecipe],
  );

  const mixVolume = useMemo(
    () =>
      estimateMixVolume({
        epoxyGrams: mixEpoxyGrams(activeRecipe, values),
        sandGrams: mixSandGrams(activeRecipe, values),
        sandType,
      }),
    [activeRecipe, values, sandType],
  );

  const recommendedTotalGrams = useMemo(
    () => initialMixValues(activeRecipe, recipeBinderSum(activeRecipe, initialBinderSum))[0],
    [activeRecipe, initialBinderSum],
  );

  const recommendedForBucketGrams = useMemo(
    () =>
      recommendedBatchForBucket(
        activeRecipe,
        initialBinderSum,
        bucketSelection,
        sandType,
      ).totalGrams,
    [activeRecipe, initialBinderSum, bucketSelection, sandType],
  );

  const mixFillPercent = useMemo(() => {
    if (bucketSelection === "none") return null;
    return displayFillPercent(mixVolume.estimatedLiters, bucketSelection);
  }, [mixVolume.estimatedLiters, bucketSelection]);

  const currentMixTotalGrams = values[0] ?? 0;

  const canHalveMixAction = canHalveMix(values);
  useThemeAppearanceSync();
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const canDoubleMixAction = useMemo(
    () => canDoubleMix(values, activeRecipe, bucketSelection, sandType),
    [values, activeRecipe, bucketSelection, sandType],
  );

  const saveMix = useSavedMixesStore((s) => s.saveMix);
  const updateMix = useSavedMixesStore((s) => s.updateMix);
  const savedMixes = useSavedMixesStore((s) => s.mixes);
  const canLoad = savedMixes.length > 0;

  /** Live snapshot from persist store — stays in sync after rename/delete/update. */
  const loadedSavedMix = useMemo(
    () =>
      loadedSavedMixId
        ? savedMixes.find((mix) => mix.id === loadedSavedMixId) ?? null
        : null,
    [savedMixes, loadedSavedMixId],
  );

  useEffect(() => {
    if (loadedSavedMixId && !loadedSavedMix) {
      setLoadedSavedMixId(null);
    }
  }, [loadedSavedMixId, loadedSavedMix]);

  const saveBatchNameInput = useMemo(
    () =>
      batchNameInputFromMixer({
        recipeName: recipeMenuLabel(activeRecipe),
        recipe: activeRecipe,
        totalGrams: values[0] ?? 0,
        recommendedTotalGrams,
        bucketSelection,
        mixVolumeLiters: mixVolume.estimatedLiters,
        id: loadedSavedMixId ?? undefined,
      }),
    [
      activeRecipe,
      values,
      recommendedTotalGrams,
      bucketSelection,
      mixVolume.estimatedLiters,
      loadedSavedMixId,
    ],
  );

  const handleRecipeChange = useCallback(
    (next: BlendingRecipe) => {
      if (next.id === activeRecipe.id) {
        if (!loadedSavedMixId) return;
        setLoadedSavedMixId(null);
        setValues(initialMixValues(next, recipeBinderSum(next, initialBinderSum)));
        setActive(0);
        return;
      }
      setLoadedSavedMixId(null);
      setActiveRecipe(next);
      setValues(initialMixValues(next, recipeBinderSum(next, initialBinderSum)));
      setActive(0);
    },
    [activeRecipe.id, initialBinderSum, loadedSavedMixId],
  );

  useEffect(() => {
    if (active !== 0 && !ingredientIndexes.includes(active)) {
      setActive(0);
    }
  }, [active, ingredientIndexes]);

  useEffect(() => {
    setBucketSelection((prev) =>
      reconcileBucketSelection(prev, mixVolume.estimatedLiters),
    );
  }, [mixVolume.estimatedLiters]);

  useEffect(() => {
    if (bucketSelection === "none") return;
    if (isBucketAtMaxFill(mixVolume.estimatedLiters, bucketSelection)) return;
    const maxLiters = maxMixLitersForBucket(bucketSelection);
    if (mixVolume.estimatedLiters <= maxLiters + 1e-6) return;
    setValues((current) =>
      clampMixValuesToBucketMax(current, recipeRef.current, bucketSelection, sandType),
    );
  }, [mixVolume.estimatedLiters, bucketSelection, sandType]);

  const commitValues = useCallback((next: number[]) => {
    pendingValues.current = next;
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      if (pendingValues.current) setValues(pendingValues.current);
    });
  }, []);

  const flushValues = useCallback(() => {
    if (pendingValues.current) {
      setValues(pendingValues.current);
      pendingValues.current = null;
    }
    rafPending.current = false;
  }, []);

  const pushUndo = useCallback(() => {
    undoStack.current = [...undoStack.current.slice(-(UNDO_MAX - 1)), [...valuesRef.current]];
    setCanUndo(true);
  }, []);

  const handleUndo = useCallback(() => {
    const stack = undoStack.current;
    if (stack.length === 0) return;
    const prev = stack.pop()!;
    setValues(prev);
    setCanUndo(stack.length > 0);
  }, []);

  /** Bucket bordered panel height follows rec. batch + save/load column — never taller. */
  useLayoutEffect(() => {
    if (screen !== "mixer") return;
    const recCol = recBatchColRef.current;
    const bucketPanel = bucketRef.current;
    if (!recCol || !bucketPanel) return;

    const sync = () => {
      const h = recCol.offsetHeight;
      if (h > 0) {
        bucketPanel.style.height = `${h}px`;
        bucketPanel.style.minHeight = `${h}px`;
      }
    };

    sync();
    const raf = requestAnimationFrame(() => sync());
    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(raf);
    }
    const ro = new ResizeObserver(sync);
    ro.observe(recCol);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [screen, recommendedTotalGrams, saveFlash, canLoad, isLocked, bucketSelection]);

  /** Keep floating TOTAL tile aligned with fluid swipe height (`--swipe-h`). */
  useLayoutEffect(() => {
    if (screen !== "mixer") return;
    const el = swipeAreaRef.current;
    if (!el) return;
    const sync = () => {
      const h = el.offsetHeight;
      if (h > 0) setSwipeHeight(h);
    };
    sync();
    const raf = requestAnimationFrame(sync);
    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(raf);
    }
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [screen, isLocked, dragFocus]);

  /** Sync section gap from computed layout (tracks compact container tokens). */
  useLayoutEffect(() => {
    if (screen !== "mixer") return;
    const deck = controlDeckRef.current;
    if (!deck) return;
    const sync = () => {
      const gap = parseFloat(getComputedStyle(deck).gap);
      if (gap > 0) setSectionGap(gap);
    };
    sync();
    const raf = requestAnimationFrame(sync);
    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(raf);
    }
    const ro = new ResizeObserver(sync);
    ro.observe(deck);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [screen]);

  const handleSaveRequest = useCallback(() => {
    setSaveNameSheetOpen(true);
  }, []);

  const handleSaveConfirm = useCallback(
    (metaName?: string, strategy: "update" | "new" = "new") => {
      const recipeName = recipeMenuLabel(recipeRef.current);
      const input = {
        recipeId: recipeRef.current.id,
        recipeName,
        metaName,
        bucketSelection: bucketSelectionRef.current,
        sandType,
        values: snapshotValuesFromGrams(valuesRef.current),
      };

      if (strategy === "update" && loadedSavedMix) {
        updateMix(loadedSavedMix.id, input);
      } else {
        const saved = saveMix(input);
        setLoadedSavedMixId(saved.id);
      }

      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    },
    [saveMix, updateMix, sandType, loadedSavedMix],
  );

  const handleLoad = useCallback(() => {
    setLoadPickerOpen(true);
  }, []);

  const handleSavedMixSelect = useCallback(
    (mix: SavedMixSnapshot) => {
      pushUndo();
      const recipe =
        recipes.find((r) => r.id === mix.recipeId) ?? recipeRef.current;
      if (recipe.id !== recipeRef.current.id) {
        setActiveRecipe(recipe);
        recipeRef.current = recipe;
      }
      setBucketSelection(mix.bucketSelection);
      bucketSelectionRef.current = mix.bucketSelection;
      const loaded = gramsFromSnapshot(mix.values);
      setValues(clampMixValuesToBucketMax(loaded, recipe, mix.bucketSelection, sandType));
      setActive(0);
      setLoadedSavedMixId(mix.id);
    },
    [pushUndo, recipes, sandType],
  );

  const scaleMix = useCallback((factor: number) => {
    pushUndo();
    const current = valuesRef.current;
    const total = current[0];
    let next = applyRecipeChange(recipeRef.current, "TOTAL", Math.round(total * factor));
    next = enforceBucketLimitOnChange(
      next,
      current,
      recipeRef.current,
      bucketSelectionRef.current,
      sandType,
    );
    setValues(next);
  }, [pushUndo, sandType]);

  const handleForceBucketChange = useCallback((size: BucketSize) => {
    pushUndo();
    const current = valuesRef.current;
    const next = clampMixValuesToBucketMax(current, recipeRef.current, size, sandType);
    setBucketSelection(size);
    setValues(next);
  }, [pushUndo, sandType]);

  const handleResetToRecommended = useCallback(() => {
    pushUndo();
    const recipe = recipeRef.current;
    setValues(initialMixValues(recipe, recipeBinderSum(recipe, initialBinderSum)));
  }, [pushUndo, initialBinderSum]);

  const measureCardConnectors = useCallback(() => {
    if (isLocked) {
      setConnectorLines([]);
      return;
    }
    const root = containerRef.current;
    const swipeEl = swipeAreaRef.current;
    if (!root || !swipeEl) {
      setConnectorLines([]);
      return;
    }
    const rootR = root.getBoundingClientRect();
    const swipeR = swipeEl.getBoundingClientRect();
    const lines: CardConnector[] = [];

    for (const pi of ingredientIndexes) {
      const cardEl = cardRefs.current[pi];
      if (!cardEl) continue;
      const cardR = cardEl.getBoundingClientRect();
      const x = cardR.left + cardR.width / 2 - rootR.left;
      const y1 = cardR.bottom - rootR.top;
      const y2 = swipeR.top - rootR.top;
      if (y2 <= y1) continue;
      lines.push({ x, y1, y2, color: entityAccentColor(PARAMS[pi].id, colorScheme), active: active === pi });
    }

    const totalEl = totalTileRef.current;
    if (totalEl) {
      const totalR = totalEl.getBoundingClientRect();
      const x = totalR.left + totalR.width / 2 - rootR.left;
      const y1 = swipeR.bottom - rootR.top;
      const y2 = totalR.top - rootR.top;
      if (y2 > y1) {
        lines.push({ x, y1, y2, color: entityAccentColor(PARAMS[0].id, colorScheme), active: active === 0 });
      }
    }

    setConnectorLines(lines);
  }, [active, ingredientIndexes, isLocked, colorScheme]);

  useLayoutEffect(() => {
    measureCardConnectors();
  }, [measureCardConnectors, values, swipeHeight, active]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measureCardConnectors());
    ro.observe(root);
    return () => ro.disconnect();
  }, [measureCardConnectors]);

  const clearDragBlocked = useCallback(() => {
    if (dragBlockedTimer.current !== null) {
      window.clearTimeout(dragBlockedTimer.current);
      dragBlockedTimer.current = null;
    }
    setDragBlocked(false);
  }, []);

  const triggerDragBlocked = useCallback(() => {
    setDragBlocked(true);
    navigator.vibrate?.(BUCKET_LIMIT_VIBRATE_MS);
    if (dragBlockedTimer.current !== null) {
      window.clearTimeout(dragBlockedTimer.current);
    }
    dragBlockedTimer.current = window.setTimeout(() => {
      dragBlockedTimer.current = null;
      setDragBlocked(false);
    }, DRAG_BLOCKED_MS);
  }, []);

  const clearDragOverlayHide = useCallback(() => {
    if (dragOverlayHideTimer.current !== null) {
      window.clearTimeout(dragOverlayHideTimer.current);
      dragOverlayHideTimer.current = null;
    }
  }, []);

  const showDragOverlay = useCallback(() => {
    clearDragOverlayHide();
    setDragFocus(true);
  }, [clearDragOverlayHide]);

  const scheduleHideDragOverlay = useCallback(() => {
    clearDragOverlayHide();
    dragOverlayHideTimer.current = window.setTimeout(() => {
      dragOverlayHideTimer.current = null;
      setDragFocus(false);
    }, DRAG_OVERLAY_HIDE_MS);
  }, [clearDragOverlayHide]);

  useEffect(() => () => {
    clearDragOverlayHide();
    clearDragBlocked();
  }, [clearDragOverlayHide, clearDragBlocked]);

  useEffect(() => {
    if (!isLocked) return;
    clearDragOverlayHide();
    clearDragBlocked();
    setDragFocus(false);
    if (isDragging.current) {
      isDragging.current = false;
      dragUndoSaved.current = false;
      setActiveZone(null);
      setDragDirection(null);
      flushValues();
    }
  }, [isLocked, clearDragOverlayHide, clearDragBlocked, flushValues]);

  const toggleLock = useCallback(() => {
    setIsLocked((prev) => !prev);
  }, []);

  const handleBack = useCallback(() => {
    setComplementValues(emptyComplementValues());
    setScreen("mixer");
  }, []);

  const handleForward = useCallback(() => {
    if (screen !== "mixer" || isLocked) return;
    setScreen("totals");
  }, [screen, isLocked]);

  const endSwipe = useCallback((e?: React.PointerEvent) => {
    if (!isDragging.current) return;
    if (e && swipeAreaRef.current?.hasPointerCapture(e.pointerId)) {
      swipeAreaRef.current.releasePointerCapture(e.pointerId);
    }
    isDragging.current = false;
    dragUndoSaved.current = false;
    setActiveZone(null);
    setDragDirection(null);
    clearDragBlocked();
    scheduleHideDragOverlay();
    flushValues();
  }, [flushValues, scheduleHideDragOverlay, clearDragBlocked]);

  const onSwipeDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    if (e.button !== 0) return;
    const el = swipeAreaRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const zi = zoneIndexFromX(e.clientX - rect.left, rect.width);

    if (!dragUndoSaved.current) {
      pushUndo();
      dragUndoSaved.current = true;
    }
    isDragging.current = true;
    showDragOverlay();
    setActiveZone(zi);
    setDragDirection(null);
    dragStartY.current = e.clientY;
    dragLastY.current  = e.clientY;
    dragBaseVal.current  = values[active];
    dragStepSize.current = ZONES[zi].step;
    el.setPointerCapture(e.pointerId);
  }, [values, active, pushUndo, showDragOverlay, isLocked]);

  const onSwipeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const el = swipeAreaRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (
      e.clientY < rect.top - SWIPE_DRAG_MARGIN_PX ||
      e.clientY > rect.bottom + SWIPE_DRAG_MARGIN_PX
    ) {
      return;
    }

    let clientY = e.clientY;
    const frameDy = clientY - dragLastY.current;
    if (Math.abs(frameDy) > SWIPE_MAX_DY_PER_FRAME) {
      clientY = dragLastY.current + Math.sign(frameDy) * SWIPE_MAX_DY_PER_FRAME;
    }
    dragLastY.current = clientY;

    if (frameDy < 0) setDragDirection("up");
    else if (frameDy > 0) setDragDirection("down");

    const step      = dragStepSize.current;
    const dy        = dragStartY.current - clientY;
    const swipeH    = el.offsetHeight > 0 ? el.offsetHeight : SWIPE_HEIGHT;
    const pxPerStep = swipeH / SWIPE_STEPS_PER_DRAG;
    const raw       = dragBaseVal.current + (dy / pxPerStep) * step;
    const snapped   = Math.round(raw / step) * step;
    const driver    = driverIdFromIndex(active);
    let next        = applyRecipeChange(recipeRef.current, driver, snapped);
    const bucket    = bucketSelectionRef.current;
    next = enforceBucketLimitOnChange(
      next,
      valuesRef.current,
      recipeRef.current,
      bucket,
      sandType,
    );
    if (bucket !== "none") {
      const nextLiters = mixLitersFromValues(next, sandType, recipeRef.current);
      if (isBucketAtMaxFill(nextLiters, bucket as BucketSize) && snapped > dragBaseVal.current) {
        dragBaseVal.current = next[active];
        dragStartY.current = clientY;
        triggerDragBlocked();
      }
    }
    commitValues(next);
  }, [active, commitValues, sandType, triggerDragBlocked]);

  const onSwipeEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    endSwipe(e);
  }, [endSwipe]);

  const activeParam = PARAMS[active];
  const col = entityAccentColor(activeParam.id, colorScheme);

  return (
    <div className="mobile-shell">
        <LongPressProgressProvider>
        <LongPressEdgeProvider edgeRef={containerRef}>
        <div className="app-frame-host">
        <div
          ref={containerRef}
          data-beam-canvas
          className="app-frame relative flex flex-col overflow-hidden select-none"
          style={{
            background: cv.app.background,
            fontFamily: "'DM Mono', monospace",
          }}
        >

      {screen === "mixer" &&
        connectorLines.map((line, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none"
          style={{
            position: "absolute",
            left: line.x - CONNECTOR_W / 2,
            top: line.y1,
            width: CONNECTOR_W,
            height: line.y2 - line.y1,
            background: line.active
              ? `${line.color}${ch.entityBorderActiveSuffix}`
              : RECIPE_RATIO_BORDER_COLOR,
            zIndex: dragFocus && !isLocked && line.active ? DRAG_FOCUS_Z : CARD_CONNECTOR_Z,
            transition: "top 0.2s ease, left 0.2s ease, height 0.2s ease, background-color 0.2s ease, z-index 0s",
          }}
        />
      ))}

      {screen === "totals" ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-x-hidden">
          <div className="recipe-context-gradient">
            <AppHeader
              isLocked={isLocked}
              onBack={handleBack}
              onSettingsClick={() => setSettingsOpen(true)}
              settingsActive={settingsOpen}
              subline={
                <RecipeHeaderSublineStack>
                  <RecipeHeaderMixContext loadedSavedMix={loadedSavedMix} muted={isLocked} />
                  <RecipeHeaderSubline>
                    <RecipeHeaderRecipeRow muted={isLocked}>
                      {recipeMenuLabel(activeRecipe)}
                    </RecipeHeaderRecipeRow>
                  </RecipeHeaderSubline>
                </RecipeHeaderSublineStack>
              }
            />
            <BatchTotalsScreen
              recipe={activeRecipe}
              values={values}
              complementValues={complementValues}
              entityIndexes={ingredientIndexes}
              multiplier={batchMultiplier}
              onMultiplierChange={setBatchMultiplier}
              onComplementChange={setComplementValues}
              sandType={sandType}
            />
          </div>
        </div>
      ) : (
      <>
      <div className="flex-1 min-h-0 flex flex-col overflow-x-hidden">
        <div className="recipe-context-gradient">
          <AppHeader
            isLocked={isLocked}
            onForward={handleForward}
            onSettingsClick={() => setSettingsOpen(true)}
            settingsActive={settingsOpen}
            subline={
              <div className={isLocked && !loadedSavedMix ? "pointer-events-none" : "pointer-events-auto"}>
                <RecipeHeaderSublineStack>
                  <RecipeSelect
                    recipes={recipes}
                    value={activeRecipe}
                    onChange={handleRecipeChange}
                    disabled={isLocked && !loadedSavedMix}
                    muted={isLocked && !loadedSavedMix}
                    allowReselectCurrent={loadedSavedMix != null}
                    bucketSelection={bucketSelection}
                    onBucketChange={setBucketSelection}
                    initialBinderSum={initialBinderSum}
                    sandType={sandType}
                    savedMixes={savedMixes}
                    loadedSavedMixId={loadedSavedMixId}
                    onSavedMixSelect={handleSavedMixSelect}
                  />
                </RecipeHeaderSublineStack>
              </div>
            }
          />
          <div
            className="shrink-0 app-gutter-x flex flex-col"
            style={{ paddingTop: "var(--recipe-zone-pt)", gap: "var(--recipe-meta-gap)" }}
          >
            <RecipeRatioRow recipe={activeRecipe} muted={isLocked} />
          </div>

          <div className="flex-1 min-h-0" aria-hidden="true" />
        </div>

        <div
          className="shrink-0 app-gutter-x flex flex-col"
          style={{
            gap: "var(--section-gap)",
            paddingBottom: "var(--app-bottom-inset)",
            pointerEvents: isLocked ? "none" : "auto",
          }}
        >
          <RecipeEditMixnameRow loadedSavedMix={loadedSavedMix} muted={isLocked} />
          <div
            ref={editRowRef}
            className="relative grid min-w-0"
            style={{
              gridTemplateColumns: `${BOTTOM_TOTAL_WIDTH} minmax(0, 1fr)`,
              gap: "var(--section-gap)",
              alignItems: "stretch",
            }}
          >
            <MixBucket
              ref={bucketRef}
              readoutRef={bucketReadoutRef}
              epoxyGrams={mixEpoxyGrams(activeRecipe, values)}
              sandGrams={mixSandGrams(activeRecipe, values)}
              bucketSelection={bucketSelection}
              onBucketChange={setBucketSelection}
              onForceBucketChange={handleForceBucketChange}
              sandType={sandType}
              muted={isLocked}
              disabled={isLocked}
            />
            <div ref={recBatchColRef} className="min-w-0 h-full">
            <RecBatchPanel
              recommendedTotalGrams={recommendedTotalGrams}
              recommendedForBucketGrams={recommendedForBucketGrams}
              currentMixTotalGrams={currentMixTotalGrams}
              bucketSelection={bucketSelection}
              mixFillPercent={mixFillPercent}
              onReset={handleResetToRecommended}
              onSave={handleSaveRequest}
              onLoad={handleLoad}
              saveFlash={saveFlash}
              loadedSavedMix={loadedSavedMix}
              canLoad={canLoad}
              disabled={isLocked}
              muted={isLocked}
              saveButtonRef={saveButtonRef}
              actionsBlockRef={actionsBlockRef}
              resetButtonRef={resetButtonRef}
              recPanelRef={recPanelRef}
              recReadoutRef={recReadoutRef}
            />
            </div>
            <LockedSaveOverlay
              isLocked={isLocked}
              anchorRef={editRowRef}
              bucketReadoutRef={bucketReadoutRef}
              recReadoutRef={recReadoutRef}
              actionsBlockRef={actionsBlockRef}
              ingredientCardsRef={ingredientCardsRef}
              saveButtonRef={saveButtonRef}
              onSave={handleSaveRequest}
              saveFlash={saveFlash}
              loadedSavedMix={loadedSavedMix}
              expandMs={LOCK_EXPAND_MS}
              expandEase={LOCK_EASE}
              zIndex={LOCK_UNLOCK_Z}
              surfaceBg={ENTITY_SURFACE_IDLE}
            />
          </div>

          <div ref={ingredientCardsRef} className="flex" style={{ gap: "var(--section-gap)" }}>
            {ingredientIndexes.map((pi) => {
              const p       = PARAMS[pi];
              const accent  = entityAccentColor(p.id, colorScheme);
              const isAct   = active === pi;
              const cardLit = isLocked || isAct;
              const chrome  = entityCardChrome(accent, cardLit);
              const cardBump = dragBlocked && isAct && !isLocked;
              return (
                <button
                  key={p.id}
                  ref={(el) => { cardRefs.current[pi] = el; }}
                  onClick={() => setActive(pi)}
                  className="flex-1 flex flex-col items-center rounded-xl relative overflow-hidden"
                  style={{
                    paddingTop: "var(--entity-card-pt)",
                    paddingBottom: "var(--entity-card-pb)",
                    background: chrome.background,
                    border: chrome.border,
                    boxShadow: chrome.boxShadow,
                    transition: CARD_CHROME_TRANSITION,
                    transform: cardBump ? "scale(1.035)" : undefined,
                    ...(dragFocus && isAct && !isLocked ? { position: "relative" as const, zIndex: DRAG_FOCUS_Z } : {}),
                  }}
                >
                  {dragBlocked && isAct && !isLocked && (
                    <CardLimitFlash />
                  )}
                  <div style={{
                    width: 22,
                    height: 3,
                    borderRadius: 2,
                    background: accent,
                    opacity: cardLit ? 1 : 0.4,
                    marginBottom: "var(--entity-card-bar-mb)",
                    boxShadow: cardLit ? `0 0 6px ${accent}` : "none",
                  }} />
                  <CardReadout
                    name={p.id}
                    value={fmt(values[pi], p.isKg)}
                    unit={p.isKg ? "kg" : "g"}
                    centered
                    nameColor={accent}
                    valueColor={entityValueColor(cardLit, colorScheme)}
                    unitColor={entityUnitColor(cardLit, colorScheme)}
                  />
                </button>
              );
            })}
          </div>

          {/* ── Control deck: swipe + bottom (floating TOTAL / SAVE animate here) ─ */}
          <div ref={controlDeckRef} className="relative shrink-0 flex flex-col" style={{ gap: "var(--section-gap)" }}>

          {/* ── Swipe area ─────────────────────────────────────────────────────── */}
      <div
        className="shrink-0"
        style={{
          zIndex: dragFocus && !isLocked ? DRAG_FOCUS_Z : 2,
          position: "relative",
          opacity: isLocked ? 0 : 1,
          transition: LOCK_FADE_TRANSITION,
          pointerEvents: isLocked ? "none" : "auto",
        }}
      >
        <div
          ref={swipeAreaRef}
          className="relative flex rounded-xl overflow-hidden touch-none cursor-ns-resize"
          style={{
            height: "var(--swipe-h)",
            minHeight: 120,
            border: `${ch.entityBorderWidth} solid ${col}${ch.entityBorderActiveSuffix}`,
            boxShadow: dragFocus && !isLocked
              ? `${mixerEntityActiveRing(col)}, ${mixerEntityCardShadow(col)}`
              : mixerEntityActiveRing(col),
            background: SWIPE_SURFACE_BASE,
            transition: CARD_CHROME_TRANSITION,
          }}
          onPointerDown={onSwipeDown}
          onPointerMove={onSwipeMove}
          onPointerUp={onSwipeEnd}
          onPointerCancel={onSwipeEnd}
          onLostPointerCapture={onSwipeEnd}
        >
          {ZONES.map((zone, zi) => {
            const isColAct = activeZone === zi;
            const upActive = isColAct && dragDirection === "up";
            const downActive = isColAct && dragDirection === "down";
            return (
              <div
                key={zi}
                className="relative flex flex-col items-center justify-between transition-all duration-150 pointer-events-none"
                style={{
                  flex: zone.weight,
                  zIndex: 1,
                  background: isColAct ? swipeZoneActive(col) : swipeZoneStripe(zi % 2 === 0),
                  borderRight: zi < ZONES.length - 1 ? MIXER_SWIPE_COLUMN_BORDER : "none",
                  padding: "10px 4px",
                }}
              >
                <SwipeChevronStack direction="up" active={upActive} color={col} />

                <span style={{
                  fontSize: isColAct ? "var(--text-swipe-col-active)" : "var(--text-swipe-col)", fontWeight: 500,
                  color: isColAct ? col : SWIPE_STEP_IDLE,
                  lineHeight: 1, transition: "all 0.15s",
                }} className="pointer-events-none">
                  {zone.label}
                </span>

                <SwipeChevronStack direction="down" active={downActive} color={col} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom layout spacer + secondary actions ──────────────────────── */}
      <div className="relative shrink-0">
        <div
          className="flex items-stretch"
          style={{ pointerEvents: isLocked ? "none" : "auto", gap: "var(--action-row-gap)" }}
        >
          <div style={{ flex: `0 0 ${BOTTOM_TOTAL_WIDTH}`, height: "var(--bottom-action-h)" }} aria-hidden />
          <div ref={bottomActionsColRef} className="flex flex-1 flex-col min-w-0 justify-center" style={{ gap: "var(--action-row-gap)" }}>
            <div className="flex" style={{ height: "var(--bottom-sub-row-h)", gap: "var(--action-row-gap)" }}>
              <div className="flex-1 min-w-0">
                <LongPressButton
                  ref={lockButtonRef}
                  label="Lock screen"
                  confirmAction="LOCK SCREEN"
                  onLongPress={toggleLock}
                  icon={<LockIcon locked={false} />}
                  className="w-full h-full"
                  style={{
                    visibility: isLocked || unlockOverlayActive ? "hidden" : "visible",
                  }}
                />
              </div>
              <LongPressButton
                label="Undo"
                confirmAction="UNDO"
                onLongPress={handleUndo}
                disabled={!canUndo || isLocked}
                icon={<UndoIcon />}
                className="flex-1 h-full"
              />
            </div>
            <div className="flex" style={{ height: "var(--bottom-sub-row-h)", gap: "var(--action-row-gap)" }}>
              <LongPressButton label="÷2" confirmAction="HALVE MIX" onLongPress={() => scaleMix(0.5)} disabled={!canHalveMixAction || isLocked} className="flex-1 h-full" labelSize="var(--text-action-md)" compact />
              <LongPressButton label="×2" confirmAction="DOUBLE MIX" onLongPress={() => scaleMix(2)} disabled={!canDoubleMixAction || isLocked} className="flex-1 h-full" labelSize="var(--text-action-md)" compact />
            </div>
          </div>
        </div>
      </div>

      <TotalTile
        ref={totalTileRef}
        color={entityAccentColor(totalParam.id, colorScheme)}
        colorScheme={colorScheme}
        entityId={totalParam.id}
        valueKg={fmt(values[0], totalParam.isKg)}
        isActive={isTotalAct || isLocked}
        expanded={isLocked}
        limitFlash={dragBlocked && isTotalAct && !isLocked}
        cardBump={dragBlocked && isTotalAct && !isLocked}
        onClick={isLocked ? undefined : () => setActive(0)}
        className="absolute"
        style={{
          position: "absolute",
          zIndex: dragFocus && !isLocked && isTotalAct ? DRAG_FOCUS_Z : dragFocus && !isLocked ? 2 : LOCK_PANEL_Z,
          transition: LOCK_TRANSITION,
          pointerEvents: isLocked || dragFocus ? "none" : "auto",
          ...(isLocked ? {
            top: SWIPE_PAD_TOP,
            left: 0,
            width: "100%",
            height: swipeHeight,
          } : {
            top: `calc(${swipeHeight}px + var(--section-gap))`,
            left: 0,
            width: "calc((100% - var(--bottom-row-gap)) * 0.48)",
            height: "var(--bottom-action-h)",
          }),
        }}
      />

      <LockedUnlockOverlay
        isLocked={isLocked}
        anchorRef={controlDeckRef}
        lockButtonRef={lockButtonRef}
        onUnlock={toggleLock}
        expandMs={LOCK_EXPAND_MS}
        expandEase={LOCK_EASE}
        zIndex={LOCK_UNLOCK_Z}
        surfaceBg={ENTITY_SURFACE_IDLE}
        expandedTop={SWIPE_PAD_TOP + swipeHeight + sectionGap}
        actionColRef={bottomActionsColRef}
        onOverlayActiveChange={setUnlockOverlayActive}
      />

      </div>
      </div>
      </div>
      </>
      )}

      {screen === "mixer" && isLocked && (
        <div
          className="absolute inset-0"
          style={{ zIndex: LOCK_SHIELD_Z, pointerEvents: "none" }}
          aria-hidden
        />
      )}

      {screen === "mixer" && dragFocus && !isLocked && (
        <div
          className="absolute inset-0"
          style={{
            zIndex: DRAG_OVERLAY_Z,
            pointerEvents: "auto",
            transition: "opacity 0.15s ease",
          }}
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{ background: MIXER_OVERLAY_HINT }}
          />
          <div
            className="absolute inset-0"
            style={{ background: col, opacity: 0.1 }}
          />
        </div>
      )}

        <LoadSavedMixesSheet
          open={screen === "mixer" && loadPickerOpen}
          onOpenChange={setLoadPickerOpen}
          onSelect={handleSavedMixSelect}
        />

        <SaveMixNameSheet
          mode="save"
          open={screen === "mixer" && saveNameSheetOpen}
          onOpenChange={setSaveNameSheetOpen}
          recipeName={recipeMenuLabel(activeRecipe)}
          existingMix={loadedSavedMix}
          savedMixes={savedMixes}
          batchNameInput={saveBatchNameInput}
          onConfirm={handleSaveConfirm}
        />

        <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />

        </div>
        </div>
        </LongPressEdgeProvider>
        </LongPressProgressProvider>
    </div>
  );
}
