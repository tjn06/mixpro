import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, forwardRef, type CSSProperties } from "react";
import { LongPressButton, LongPressEdgeProvider } from "./components/LongPressButton";
import { AppHeader } from "./components/AppHeader";
import {
  MixBucket,
  DEFAULT_BUCKET_SELECTION,
  type BucketSelection,
} from "./components/MixBucket";
import { reconcileBucketSelection, maxMixLitersForBucket, isBucketAtMaxFill, type BucketSize } from "./bucketTypes";
import { enforceBucketLimitOnChange, clampMixValuesToBucketMax, mixLitersFromValues } from "./bucketLimits";
import { estimateMixVolume, type SandType } from "./mixVolume";
import { LongPressProgressProvider } from "./components/LongPressProgressContext";
import {
  gramsFromSnapshot,
  snapshotValuesFromGrams,
  useSavedMixesStore,
} from "./stores/savedMixesStore";
import {
  applyRecipeChange,
  driverIdFromIndex,
  getIngredientLabel,
  getLockedRatioDisplay,
  initialMixValues,
  mixEpoxyGrams,
  mixSandGrams,
  recipeBinderSum,
  recipeIngredientIndexes,
} from "./recipe";
import { RecipeSelect } from "./components/RecipeSelect";
import { RecBatchPanel, LockIcon } from "./components/RecBatchPanel";
import { LockedSaveOverlay } from "./components/LockedSaveOverlay";
import { LockedUnlockOverlay } from "./components/LockedUnlockOverlay";
import { LoadSavedMixesSheet } from "./components/LoadSavedMixesSheet";
import { SaveMixNameSheet } from "./components/SaveMixNameSheet";
import type { SavedMixSnapshot } from "./types/savedMix";
import { UndoIcon } from "./components/ActionIcons";
import type { BlendingRecipe } from "./recipeTypes";
import { PRESET_RECIPES, recipeMenuLabel } from "./recipeTypes";
import { MIX_PARAMS as PARAMS, formatMixAmount as fmt } from "./mixEntities";
import { BatchTotalsScreen } from "./components/BatchTotalsScreen";

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
  { step: 1000, label: "1000 g", weight: 36 },
  { step: 100,  label: "100 g",  weight: 28 },
  { step: 10,   label: "10 g",   weight: 20 },
  { step: 1,    label: "1 g",    weight: 16 },
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
const SWIPE_ARROW_IDLE  = "#585878";
const SWIPE_STEP_IDLE   = "#424260";
const DRAG_OVERLAY_Z    = 4;
const CARD_CONNECTOR_Z  = 3;
const DRAG_FOCUS_Z      = 5;
const DRAG_OVERLAY_HIDE_MS = 320;
const DRAG_BLOCKED_MS = 120;
const CARD_LIMIT_FLASH_TINT_PCT = 50;
const BUCKET_LIMIT_VIBRATE_MS = [10, 28, 10] as const;
const LOCK_PANEL_Z      = 6;
const LOCK_SHIELD_Z     = 5;
const LOCK_UNLOCK_Z     = 7;
const LOCK_EXPAND_MS    = 360;
const LOCK_EASE         = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const UNDO_MAX = 20;
const BOTTOM_TOTAL_WIDTH = "48%";
const BOTTOM_SUB_ROW_H = 38;
const BOTTOM_ROW_GAP    = 8;
const BOTTOM_ACTION_H   = BOTTOM_SUB_ROW_H * 2 + BOTTOM_ROW_GAP;
/** Vertical gap between swipe, bottom deck, and the edit/cards block. */
const SECTION_ROW_GAP   = 12;
const SWIPE_PAD_TOP     = 0;
const BOTTOM_PAD_TOP    = SECTION_ROW_GAP;
const BOTTOM_PAD_BOTTOM = 28;
const LOCK_TRANSITION   = `top ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, left ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, width ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, height ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, bottom ${LOCK_EXPAND_MS}ms ${LOCK_EASE}`;
const LOCK_FADE_TRANSITION = `opacity ${LOCK_EXPAND_MS}ms ${LOCK_EASE}`;
const LOCK_TEXT_TRANSITION = `font-size ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, margin-top ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, width ${LOCK_EXPAND_MS}ms ${LOCK_EASE}, opacity ${LOCK_EXPAND_MS}ms ${LOCK_EASE}`;

/** Inactive ingredient card — readable values, muted chrome. */
const CARD_VALUE_INACTIVE = "#9a9ab4";
const CARD_UNIT_INACTIVE  = "#787898";

/** Opaque entity surfaces — kept subtle so white readouts stay crisp. */
const ENTITY_SURFACE_IDLE = "#0d0d1c";
const SWIPE_SURFACE_BASE  = "#09091a";
const ENTITY_TINT_LIT_PCT = 8;
const SWIPE_ZONE_ACTIVE_PCT = 3.5;
const SWIPE_STRIPE_A_PCT = 2;
const SWIPE_STRIPE_B_PCT = 0.8;

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
  return surfaceTint("#ffffff", even ? SWIPE_STRIPE_A_PCT : SWIPE_STRIPE_B_PCT, SWIPE_SURFACE_BASE);
}

/** Locked recipe ratio cards (read-only, above mix cards). */
/** Space below header chrome before recipe title + ratio cards (8pt grid; pairs with header `pb-3`). */
const RECIPE_ZONE_PT = 12;
const RECIPE_RATIO_BG = "transparent";
const RECIPE_RATIO_BORDER_COLOR = "rgba(255,255,255,0.14)";
const RECIPE_CONTAINER_PX = "4px 0";
const RECIPE_CARD_H = 96;
/** Matches bucket row `FEATURE_ROW_GAP` and mix-card `CARD_ROW_GAP`. */
const RECIPE_META_GAP = 8;
const RECIPE_CARD_PX = 6;
const RECIPE_META_LABEL_SIZE = 14;
const RECIPE_ID_SIZE = 12;
const RECIPE_SUBLABEL_SIZE = 10;
const RECIPE_META_VALUE_SIZE = 16;
const RECIPE_RATIO_SIZE = 16;
const RECIPE_UNIT_SIZE = 10;
const RECIPE_COLON_SIZE = 14;
const RECIPE_LABEL_GAP = 2;
const RECIPE_ID_SUBLABEL_GAP = 8;
const RECIPE_META_NAME_GAP = 8;
const RECIPE_ROW_GAP = 5;
/** High-contrast readouts on dark recipe cards — not pure white. */
const RECIPE_VALUE_COLOR = "#c4c4dc";
const RECIPE_VALUE_COLOR_MUTED = "#9898b4";
const RECIPE_ID_COLOR = "#8888a8";
const RECIPE_ID_COLOR_MUTED = "#686878";
const RECIPE_UNIT_COLOR = "#707088";
const RECIPE_COLON_COLOR = "#484860";
/** Matches mix-card row `gap-2` — colon slots use this width explicitly. */
const CARD_ROW_GAP = SECTION_ROW_GAP;

function RecipeRatioGapSeparator() {
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center pointer-events-none self-stretch"
      style={{ width: CARD_ROW_GAP }}
    >
      <span
        style={{
          fontSize: RECIPE_COLON_SIZE,
          color: RECIPE_COLON_COLOR,
          lineHeight: 1,
          fontWeight: 600,
        }}
      >
        :
      </span>
    </div>
  );
}

function RecipeRatioCard({
  id,
  sublabel,
  value,
  unit,
  muted,
}: {
  id: string;
  sublabel?: string;
  value: string;
  unit: string;
  muted: boolean;
}) {
  return (
    <div
      aria-hidden
      className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-between pointer-events-none"
      style={{
        height: RECIPE_CARD_H,
        padding: `7px ${RECIPE_CARD_PX}px 6px`,
        background: RECIPE_RATIO_BG,
      }}
    >
      <div
        className="flex flex-col items-center max-w-full min-h-0"
        style={{ gap: RECIPE_ID_SUBLABEL_GAP }}
      >
        <span
          className="uppercase truncate max-w-full"
          style={{
            fontSize: RECIPE_ID_SIZE,
            letterSpacing: "0.12em",
            fontWeight: 700,
            color: muted ? RECIPE_ID_COLOR_MUTED : RECIPE_ID_COLOR,
            lineHeight: 1.1,
          }}
        >
          {id}
        </span>
        {sublabel && (
          <span
            className="truncate max-w-full capitalize"
            style={{
              fontSize: RECIPE_SUBLABEL_SIZE,
              letterSpacing: "0.02em",
              fontWeight: 600,
              color: muted ? RECIPE_UNIT_COLOR : RECIPE_ID_COLOR,
              opacity: muted ? 0.75 : 0.9,
              lineHeight: 1.1,
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
      <span
        className="tabular-nums truncate max-w-full"
        style={{
          fontSize: RECIPE_RATIO_SIZE,
          letterSpacing: "-0.02em",
          fontWeight: 600,
          color: muted ? RECIPE_VALUE_COLOR_MUTED : RECIPE_VALUE_COLOR,
          lineHeight: 1,
          marginTop: RECIPE_ROW_GAP,
        }}
      >
        {value}
      </span>
      <span
        className="uppercase truncate max-w-full"
        style={{
          fontSize: RECIPE_UNIT_SIZE,
          letterSpacing: unit.length > 1 ? "0.1em" : "0.05em",
          fontWeight: 600,
          color: RECIPE_UNIT_COLOR,
          opacity: muted ? 0.7 : 1,
          lineHeight: 1.1,
          marginTop: RECIPE_LABEL_GAP,
        }}
      >
        {unit}
      </span>
    </div>
  );
}

function RecipeMetaCard({
  label,
  value,
  valueLine2,
  unit,
  muted,
  valueFontFamily,
}: {
  label: string;
  value: string;
  valueLine2?: string;
  unit?: string;
  muted: boolean;
  valueFontFamily?: string;
}) {
  return (
    <div
      aria-hidden
      className="flex-1 min-w-0 rounded-xl flex flex-col items-center justify-between pointer-events-none"
      style={{
        height: RECIPE_CARD_H,
        padding: `4px ${RECIPE_CARD_PX}px 6px`,
        background: RECIPE_RATIO_BG,
      }}
    >
      <span
        className="uppercase truncate max-w-full"
        style={{
          fontSize: RECIPE_META_LABEL_SIZE,
          letterSpacing: "0.12em",
          fontWeight: 700,
          color: muted ? RECIPE_ID_COLOR_MUTED : RECIPE_ID_COLOR,
          lineHeight: 1.1,
        }}
      >
        {label}
      </span>
      {valueLine2 ? (
        <div
          className="flex flex-col items-center max-w-full min-h-0"
          style={{ gap: RECIPE_LABEL_GAP, marginTop: RECIPE_META_NAME_GAP }}
        >
          <span
            className="truncate max-w-full text-center"
            style={{
              fontFamily: valueFontFamily,
              fontSize: RECIPE_META_VALUE_SIZE,
              letterSpacing: "0.04em",
              fontWeight: 600,
              color: muted ? RECIPE_VALUE_COLOR_MUTED : RECIPE_VALUE_COLOR,
              lineHeight: 1.15,
            }}
          >
            {value}
          </span>
          <span
            className="truncate max-w-full text-center"
            style={{
              fontFamily: valueFontFamily,
              fontSize: RECIPE_META_VALUE_SIZE,
              letterSpacing: "0.04em",
              fontWeight: 600,
              color: muted ? RECIPE_VALUE_COLOR_MUTED : RECIPE_VALUE_COLOR,
              lineHeight: 1.15,
            }}
          >
            {valueLine2}
          </span>
        </div>
      ) : (
        <span
          className="tabular-nums truncate max-w-full"
          style={{
            fontFamily: valueFontFamily,
            fontSize: unit ? RECIPE_RATIO_SIZE : RECIPE_META_VALUE_SIZE,
            letterSpacing: unit ? "-0.02em" : "0.04em",
            fontWeight: 600,
            color: muted ? RECIPE_VALUE_COLOR_MUTED : RECIPE_VALUE_COLOR,
            lineHeight: 1,
            marginTop: RECIPE_ROW_GAP,
          }}
        >
          {value}
        </span>
      )}
      <span
        className="uppercase truncate max-w-full"
        style={{
          fontSize: RECIPE_UNIT_SIZE,
          letterSpacing: unit && unit.length > 1 ? "0.1em" : "0.05em",
          fontWeight: 600,
          color: RECIPE_UNIT_COLOR,
          opacity: unit ? (muted ? 0.7 : 1) : 0,
          lineHeight: 1.1,
          marginTop: RECIPE_LABEL_GAP,
          visibility: unit ? "visible" : "hidden",
        }}
      >
        {unit ?? " "}
      </span>
    </div>
  );
}

/** Shared label / value / unit sizes for all param cards. */
const CARD_NAME_SIZE      = 12;
const CARD_NAME_WEIGHT    = 700;
const CARD_VALUE_SIZE     = 16;
const CARD_UNIT_SIZE      = 12;
const CARD_UNIT_WEIGHT    = 600;

/** Subtle selected-state glow in the entity's theme color. */
function entityCardShadow(color: string): string {
  return `0 0 14px ${color}55, 0 0 6px ${color}40`;
}

/** Entity border — 1.5px always (no layout shift). */
const ENTITY_BORDER_W = "1.5px";
const ENTITY_BORDER_ACTIVE = "aa";
/** Connector line between active card and swipe area. */
const CONNECTOR_W = 2.5;

function entityActiveRing(color: string): string {
  return `0 0 0 0.5px ${color}${ENTITY_BORDER_ACTIVE}`;
}

function entityCardChrome(color: string, lit: boolean): { border: string; boxShadow: string } {
  const border = lit
    ? `${ENTITY_BORDER_W} solid ${color}${ENTITY_BORDER_ACTIVE}`
    : `${ENTITY_BORDER_W} solid ${RECIPE_RATIO_BORDER_COLOR}`;
  if (!lit) return { border, boxShadow: "none" };
  return {
    border,
    // 0.5px ring + glow reads as ~2px active stroke without changing border-width
    boxShadow: `${entityActiveRing(color)}, ${entityCardShadow(color)}`,
  };
}

const CARD_CHROME_TRANSITION = "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, transform 0.1s ease-out";

function CardLimitFlash({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 rounded-xl pointer-events-none"
      style={{
        background: surfaceTint(color, CARD_LIMIT_FLASH_TINT_PCT, "transparent"),
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
      <span style={{
        fontSize: CARD_NAME_SIZE,
        letterSpacing: "0.18em",
        color: nameColor,
        fontWeight: CARD_NAME_WEIGHT,
      }}>
        {name}
      </span>
      <span className="tabular-nums" style={{
        fontSize: CARD_VALUE_SIZE,
        fontWeight: 600,
        color: valueColor,
        lineHeight: 1,
        marginTop: 4,
      }}>
        {value}
      </span>
      <span style={{
        fontSize: CARD_UNIT_SIZE,
        color: unitColor,
        letterSpacing: "0.08em",
        fontWeight: CARD_UNIT_WEIGHT,
        marginTop: 2,
      }}>
        {unit}
      </span>
    </div>
  );
}

const DESIGN_W = 390;
const DESIGN_H = 844;

type MixerScreen = "mixer" | "totals";

const TotalTile = forwardRef<HTMLButtonElement, {
  valueKg: string;
  color: string;
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
    background: cardLit ? entitySurfaceLit(color) : ENTITY_SURFACE_IDLE,
    transition: `${CARD_CHROME_TRANSITION}, ${LOCK_TRANSITION}`,
    transform: cardBump ? "scale(1.035)" : undefined,
    ...style,
  };
  const nameColor = color;
  const valueColor = cardLit ? "#ffffff" : CARD_VALUE_INACTIVE;
  const barOpacity = cardLit ? 1 : 0.4;

  if (expanded) {
    return (
      <button
        type="button"
        ref={ref}
        onClick={onClick}
        className={`flex flex-col items-center justify-center rounded-xl w-full h-full py-3.5 touch-none overflow-hidden relative ${className}`}
        style={tileStyle}
      >
        {limitFlash && <CardLimitFlash color={color} />}
        <div style={{
          width: 32,
          height: 4,
          borderRadius: 2,
          background: color,
          opacity: barOpacity,
          marginBottom: 12,
          boxShadow: cardLit ? `0 0 6px ${color}` : "none",
          transition: LOCK_TEXT_TRANSITION,
        }} />
        <span style={{
          fontSize: CARD_NAME_SIZE + 1,
          letterSpacing: "0.18em",
          color: nameColor,
          fontWeight: CARD_NAME_WEIGHT,
          transition: LOCK_TEXT_TRANSITION,
        }}>
          TOTAL
        </span>
        <span className="tabular-nums" style={{
          fontSize: 32,
          fontWeight: 600,
          color: valueColor,
          lineHeight: 1,
          marginTop: 8,
          transition: LOCK_TEXT_TRANSITION,
        }}>
          {valueKg}
        </span>
        <span style={{
          fontSize: CARD_UNIT_SIZE + 2,
          color: CARD_UNIT_INACTIVE,
          letterSpacing: "0.08em",
          fontWeight: CARD_UNIT_WEIGHT,
          marginTop: 4,
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
      className={`flex items-stretch justify-start rounded-xl px-3 py-3 w-full h-full touch-none overflow-hidden relative ${className}`}
      style={tileStyle}
    >
      {limitFlash && <CardLimitFlash color={color} />}
      <div style={{
        width: 3,
        flexShrink: 0,
        borderRadius: 2,
        background: color,
        opacity: barOpacity,
        marginRight: 10,
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
          unitColor={CARD_UNIT_INACTIVE}
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
  const [scale, setScale]           = useState(1);
  const [canUndo, setCanUndo]       = useState(false);
  const [saveFlash, setSaveFlash]   = useState(false);
  const [loadPickerOpen, setLoadPickerOpen] = useState(false);
  const [saveNameSheetOpen, setSaveNameSheetOpen] = useState(false);
  const [screen, setScreen] = useState<MixerScreen>("mixer");
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [dragFocus, setDragFocus]   = useState(false);
  const [dragDirection, setDragDirection] = useState<"up" | "down" | null>(null);
  const [dragBlocked, setDragBlocked] = useState(false);
  const [isLocked, setIsLocked]     = useState(false);
  const [unlockOverlayActive, setUnlockOverlayActive] = useState(false);
  const [connectorLines, setConnectorLines] = useState<CardConnector[]>([]);

  // /* LINE_MEASUREMENT_LEGACY */
  // const [lines, setLines] = useState<Line[]>([]);

  const shellRef       = useRef<HTMLDivElement>(null);
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
  const lockButtonRef   = useRef<HTMLButtonElement>(null);
  const ingredientCardsRef = useRef<HTMLDivElement>(null);
  const scaleRef       = useRef(1);
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

  const handleRecipeChange = useCallback(
    (next: BlendingRecipe) => {
      if (next.id === activeRecipe.id) return;
      setActiveRecipe(next);
      setValues(initialMixValues(next, recipeBinderSum(next, initialBinderSum)));
      setActive(0);
    },
    [activeRecipe.id, initialBinderSum],
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

  const saveMix = useSavedMixesStore((s) => s.saveMix);
  const canLoad = useSavedMixesStore((s) => s.mixes.length > 0);

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

  const handleSaveRequest = useCallback(() => {
    setSaveNameSheetOpen(true);
  }, []);

  const handleSaveConfirm = useCallback(
    (metaName?: string) => {
      const recipeName = recipeMenuLabel(recipeRef.current);
      saveMix({
        recipeId: recipeRef.current.id,
        recipeName,
        metaName,
        bucketSelection: bucketSelectionRef.current,
        sandType,
        values: snapshotValuesFromGrams(valuesRef.current),
      });
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    },
    [saveMix, sandType],
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

  const updateScale = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    const { clientWidth, clientHeight } = el;
    const s = Math.min(1, clientWidth / DESIGN_W, clientHeight / DESIGN_H);
    scaleRef.current = s;
    setScale(s);
  }, []);

  useEffect(() => {
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (shellRef.current) ro.observe(shellRef.current);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", updateScale);
    vv?.addEventListener("scroll", updateScale);
    return () => {
      ro.disconnect();
      vv?.removeEventListener("resize", updateScale);
      vv?.removeEventListener("scroll", updateScale);
    };
  }, [updateScale]);

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
    const s = scaleRef.current;
    const rootR = root.getBoundingClientRect();
    const swipeR = swipeEl.getBoundingClientRect();
    const lines: CardConnector[] = [];

    for (const pi of ingredientIndexes) {
      const cardEl = cardRefs.current[pi];
      if (!cardEl) continue;
      const cardR = cardEl.getBoundingClientRect();
      const x = (cardR.left + cardR.width / 2 - rootR.left) / s;
      const y1 = (cardR.bottom - rootR.top) / s;
      const y2 = (swipeR.top - rootR.top) / s;
      if (y2 <= y1) continue;
      lines.push({ x, y1, y2, color: PARAMS[pi].color, active: active === pi });
    }

    const totalEl = totalTileRef.current;
    if (totalEl) {
      const totalR = totalEl.getBoundingClientRect();
      const x = (totalR.left + totalR.width / 2 - rootR.left) / s;
      const y1 = (swipeR.bottom - rootR.top) / s;
      const y2 = (totalR.top - rootR.top) / s;
      if (y2 > y1) {
        lines.push({ x, y1, y2, color: PARAMS[0].color, active: active === 0 });
      }
    }

    setConnectorLines(lines);
  }, [active, ingredientIndexes, isLocked]);

  useLayoutEffect(() => {
    measureCardConnectors();
  }, [measureCardConnectors, scale, values]);

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
    const pxPerStep = (SWIPE_HEIGHT * scaleRef.current) / SWIPE_STEPS_PER_DRAG;
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
  const col  = activeParam.color;

  return (
    <div ref={shellRef} className="mobile-shell">
      <div
        className="mobile-shell__slot"
        style={{ width: DESIGN_W * scale, height: DESIGN_H * scale }}
      >
        <LongPressProgressProvider>
        <LongPressEdgeProvider edgeRef={containerRef}>
        <div
          ref={containerRef}
          data-beam-canvas
          className="relative flex flex-col overflow-hidden select-none"
          style={{
            width: DESIGN_W,
            height: DESIGN_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: "#07070f",
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
              ? `${line.color}${ENTITY_BORDER_ACTIVE}`
              : RECIPE_RATIO_BORDER_COLOR,
            zIndex: dragFocus && !isLocked && line.active ? DRAG_FOCUS_Z : CARD_CONNECTOR_Z,
            transition: "top 0.2s ease, left 0.2s ease, height 0.2s ease, background-color 0.2s ease, z-index 0s",
          }}
        />
      ))}

      {/* ── App header ─────────────────────────────────────────────────────── */}
      <AppHeader
        isLocked={isLocked}
        onBack={screen === "totals" ? handleBack : undefined}
        onForward={screen === "mixer" ? handleForward : undefined}
      />

      {screen === "totals" ? (
        <BatchTotalsScreen
          recipe={activeRecipe}
          values={values}
          entityIndexes={ingredientIndexes}
          multiplier={batchMultiplier}
          onMultiplierChange={setBatchMultiplier}
        />
      ) : (
      <>
      {/* ── Recipe (high) · editing area + mix cards (just above swipe) ───── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div
          className="shrink-0 px-4 flex flex-col"
          style={{ paddingTop: RECIPE_ZONE_PT, gap: RECIPE_META_GAP }}
        >
          <div
            className="rounded-xl flex flex-col min-w-0"
            style={{
              background: RECIPE_RATIO_BG,
              padding: RECIPE_CONTAINER_PX,
              gap: RECIPE_META_GAP,
            }}
          >
            <div className={isLocked ? "pointer-events-none" : "pointer-events-auto"}>
              <RecipeSelect
                recipes={recipes}
                value={activeRecipe}
                onChange={handleRecipeChange}
                disabled={isLocked}
              />
            </div>
            <div className="flex items-stretch pointer-events-none">
              {ingredientIndexes.map((pi, i) => {
                const p = PARAMS[pi];
                const { value, unit } = getLockedRatioDisplay(activeRecipe, p.id);
                return (
                  <React.Fragment key={`recipe-${p.id}`}>
                    {i > 0 && <RecipeRatioGapSeparator />}
                    <RecipeRatioCard
                      id={p.id}
                      sublabel={getIngredientLabel(activeRecipe, p.id)}
                      value={value}
                      unit={unit}
                      muted={isLocked}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="shrink-0 px-4 mt-auto flex flex-col"
          style={{
            gap: SECTION_ROW_GAP,
            paddingBottom: BOTTOM_PAD_BOTTOM,
            pointerEvents: isLocked ? "none" : "auto",
          }}
        >
          <div
            ref={editRowRef}
            className="relative grid min-w-0"
            style={{
              gridTemplateColumns: `${BOTTOM_TOTAL_WIDTH} minmax(0, 1fr)`,
              gap: CARD_ROW_GAP,
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
              onReset={handleResetToRecommended}
              onSave={handleSaveRequest}
              onLoad={handleLoad}
              saveFlash={saveFlash}
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
              expandMs={LOCK_EXPAND_MS}
              expandEase={LOCK_EASE}
              zIndex={LOCK_UNLOCK_Z}
              surfaceBg={ENTITY_SURFACE_IDLE}
              sectionRowGap={SECTION_ROW_GAP}
            />
          </div>

          <div ref={ingredientCardsRef} className="flex" style={{ gap: CARD_ROW_GAP }}>
            {ingredientIndexes.map((pi) => {
              const p       = PARAMS[pi];
              const isAct   = active === pi;
              const cardLit = isLocked || isAct;
              const chrome  = entityCardChrome(p.color, cardLit);
              const cardBump = dragBlocked && isAct && !isLocked;
              return (
                <button
                  key={p.id}
                  ref={(el) => { cardRefs.current[pi] = el; }}
                  onClick={() => setActive(pi)}
                  className="flex-1 flex flex-col items-center rounded-xl relative overflow-hidden"
                  style={{
                    paddingTop: 8,
                    paddingBottom: 12,
                    background: cardLit ? entitySurfaceLit(p.color) : ENTITY_SURFACE_IDLE,
                    border: chrome.border,
                    boxShadow: chrome.boxShadow,
                    transition: CARD_CHROME_TRANSITION,
                    transform: cardBump ? "scale(1.035)" : undefined,
                    ...(dragFocus && isAct && !isLocked ? { position: "relative" as const, zIndex: DRAG_FOCUS_Z } : {}),
                  }}
                >
                  {dragBlocked && isAct && !isLocked && (
                    <CardLimitFlash color={p.color} />
                  )}
                  <div style={{
                    width: 22,
                    height: 3,
                    borderRadius: 2,
                    background: p.color,
                    opacity: cardLit ? 1 : 0.4,
                    marginBottom: 6,
                    boxShadow: cardLit ? `0 0 6px ${p.color}` : "none",
                  }} />
                  <CardReadout
                    name={p.id}
                    value={fmt(values[pi], p.isKg)}
                    unit={p.isKg ? "kg" : "g"}
                    centered
                    nameColor={p.color}
                    valueColor={cardLit ? "#ffffff" : CARD_VALUE_INACTIVE}
                    unitColor={CARD_UNIT_INACTIVE}
                  />
                </button>
              );
            })}
          </div>

          {/* ── Control deck: swipe + bottom (floating TOTAL / SAVE animate here) ─ */}
          <div ref={controlDeckRef} className="relative shrink-0 flex flex-col" style={{ gap: SECTION_ROW_GAP }}>

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
            height: SWIPE_HEIGHT,
            border: `${ENTITY_BORDER_W} solid ${col}${ENTITY_BORDER_ACTIVE}`,
            boxShadow: dragFocus && !isLocked
              ? `${entityActiveRing(col)}, ${entityCardShadow(col)}`
              : entityActiveRing(col),
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
                  borderRight: zi < ZONES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  padding: "10px 4px",
                }}
              >
                <SwipeChevronStack direction="up" active={upActive} color={col} />

                <span style={{
                  fontSize: isColAct ? 14 : 13, fontWeight: 500,
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
          className="flex gap-2 items-stretch"
          style={{ pointerEvents: isLocked ? "none" : "auto" }}
        >
          <div style={{ flex: `0 0 ${BOTTOM_TOTAL_WIDTH}`, height: BOTTOM_ACTION_H }} aria-hidden />
          <div className="flex flex-1 flex-col gap-2 min-w-0 justify-center">
            <div className="flex gap-2" style={{ height: BOTTOM_SUB_ROW_H }}>
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
            <div className="flex gap-2" style={{ height: BOTTOM_SUB_ROW_H }}>
              <LongPressButton label="÷2" confirmAction="HALVE MIX" onLongPress={() => scaleMix(0.5)} className="flex-1 h-full" labelSize={14} compact />
              <LongPressButton label="×2" confirmAction="DOUBLE MIX" onLongPress={() => scaleMix(2)} className="flex-1 h-full" labelSize={14} compact />
            </div>
          </div>
        </div>
      </div>

      <TotalTile
        ref={totalTileRef}
        color={totalParam.color}
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
            height: SWIPE_HEIGHT,
          } : {
            top: SWIPE_PAD_TOP + SWIPE_HEIGHT + BOTTOM_PAD_TOP,
            left: 0,
            width: `calc((100% - ${BOTTOM_ROW_GAP}px) * 0.48)`,
            height: BOTTOM_ACTION_H,
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
        expandedTop={SWIPE_PAD_TOP + SWIPE_HEIGHT + BOTTOM_PAD_TOP}
        expandedHeight={BOTTOM_ACTION_H}
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
            background: `color-mix(in srgb, ${col} 10%, rgba(5, 5, 16, 0.68) 90%)`,
            pointerEvents: "auto",
            transition: "opacity 0.15s ease",
          }}
          aria-hidden
        />
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
          onConfirm={handleSaveConfirm}
        />

        </div>
        </LongPressEdgeProvider>
        </LongPressProgressProvider>
      </div>
    </div>
  );
}
