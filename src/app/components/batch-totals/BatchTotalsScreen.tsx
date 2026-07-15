import { useState, useEffect, useLayoutEffect, useRef, useCallback, type CSSProperties, type ReactNode, type RefObject, Fragment } from "react";
import { createPortal } from "react-dom";
import { formatMixAmount, MIX_PARAMS } from "../../domain/mix/entities";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { getEntityMetaLabel, emptyComplementValues } from "../../domain/recipe/calc";
import { batchIngredientTotalGrams } from "../../domain/batch-totals/totals";
import type { ExtraBatchEntry } from "../../domain/batch-totals/extraBatches";
import { extraBatchSectionLabel, extraBatchTotalCount, hasExtraBatches } from "../../domain/batch-totals/extraBatches";
import { BatchTotalsShareBar } from "./BatchTotalsShareBar";
import {
  CARD_NAME_WEIGHT,
  entityValueColor,
} from "../../presentation/entityCardStyles";
import { entityAccentColor } from "../../presentation/entityAccent";
import { MixerInputSheet } from "../sheets/MixerInputSheet";
import { DeleteIcon, RenameIcon, ResetIcon } from "../shared/ActionIcons";
import type { SandType } from "../../domain/mix/volume";
import { useAppShellCompact } from "../../hooks/useAppShellCompact";
import { useSettingsStore } from "../../settings/store";
import type { ColorScheme } from "../../../theme/appearance";
import { cv } from "../../ui/tokens";

const bt = cv.batchTotals;

const TABLE_BORDER = bt.tableBorder;

const SECTION_HEADER: CSSProperties = {
  fontSize: "var(--text-totals-caption)",
  color: cv.text.muted,
  letterSpacing: "0.14em",
  fontWeight: 500,
  opacity: 0.85,
};

const HEADER_ICON_SIZE = 16;

const TABLE_TEXT: CSSProperties = {
  fontSize: "var(--text-totals-table)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  lineHeight: 1.35,
};

const TH_TEXT: CSSProperties = {
  ...TABLE_TEXT,
  fontSize: "var(--text-totals-table)",
  letterSpacing: "0.1em",
  fontWeight: 600,
  color: cv.text.muted,
  textTransform: "uppercase",
  lineHeight: 1.15,
};

const MULT_TEXT: CSSProperties = {
  ...TABLE_TEXT,
  fontSize: "var(--text-totals-mult)",
  fontWeight: 600,
  color: cv.text.muted,
  letterSpacing: "0.04em",
};

const CELL_PAD = "var(--totals-cell-py) var(--totals-cell-px)";
const MULT_CELL_PAD = "var(--totals-cell-py) var(--totals-cell-mult-px, 6px)";
const TABLE_TH_PAD = "var(--totals-th-py) var(--totals-th-px)";
const TABLE_TH_MULT_PAD = "var(--totals-th-py) var(--totals-th-mult-px, 8px)";

const SECTION_TITLE: CSSProperties = {
  ...SECTION_HEADER,
  fontSize: "var(--text-totals-table)",
  fontWeight: 600,
  letterSpacing: "0.12em",
  lineHeight: 1.2,
  textTransform: "uppercase",
  margin: 0,
  padding: "0 var(--totals-section-title-pad-x)",
};

function sectionTitleStyle(color?: string): CSSProperties {
  return color ? { ...SECTION_TITLE, color } : SECTION_TITLE;
}

function cellItemStyle(extra?: CSSProperties): CSSProperties {
  return { padding: CELL_PAD, borderRight: TABLE_BORDER, ...extra };
}

function cellMultStyle(extra?: CSSProperties): CSSProperties {
  return { padding: MULT_CELL_PAD, borderRight: TABLE_BORDER, ...extra };
}

function cellTotalStyle(extra?: CSSProperties): CSSProperties {
  return { padding: CELL_PAD, ...extra };
}

function thCellItemStyle(bg: string, extra?: CSSProperties): CSSProperties {
  return { padding: TABLE_TH_PAD, borderRight: TABLE_BORDER, background: bg, ...extra };
}

function thCellMultStyle(bg: string, extra?: CSSProperties): CSSProperties {
  return { padding: TABLE_TH_MULT_PAD, borderRight: TABLE_BORDER, background: bg, ...extra };
}

function thCellTotalStyle(bg: string, extra?: CSSProperties): CSSProperties {
  return { padding: TABLE_TH_PAD, background: bg, ...extra };
}

function cardHeaderStyle(variant: "batches" | "extra" = "batches"): CSSProperties {
  return {
    padding: "var(--totals-card-header-py) var(--totals-card-header-px)",
    background: variant === "extra" ? bt.extraCardHeaderBackground : bt.cardHeaderBackground,
    borderBottom: TABLE_BORDER,
    minHeight: "var(--totals-card-header-min-h, var(--totals-header-icon-btn))",
  };
}

function cardRoundBtnStyle(disabled?: boolean, color?: string): CSSProperties {
  return {
    width: "var(--totals-header-icon-btn)",
    height: "var(--totals-header-icon-btn)",
    minHeight: 0,
    borderRadius: "calc(var(--totals-header-icon-btn) / 2)",
    background: bt.cardHeaderBtnBackground,
    border: bt.cardHeaderBtnBorder,
    color: disabled ? cv.text.muted : color ?? cv.text.muted,
    opacity: disabled ? 0.35 : 1,
    cursor: disabled ? "default" : "pointer",
    padding: 0,
  };
}

const COL_ITEM = "46%";
const COL_MULT = "14%";
const COL_TOTAL = "40%";
const TABLE_COLS = `${COL_ITEM} ${COL_MULT} ${COL_TOTAL}`;
const SUMMARY_COLS = "minmax(0, 1fr) auto";

const PANEL_DRAG_THRESHOLD_PX = 16;
const PANEL_DRAG_FOLLOW = 0.72;
const PANEL_COLLAPSED_HEIGHT_FALLBACK = 96;
const PANEL_EXPANDED_HEIGHT_FALLBACK = 480;
const PANEL_SHARE_HEIGHT_FALLBACK = 140;

function shouldBlockHandleDrag(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      ".batch-totals-bottom-panel__actions button, .batch-totals-bottom-panel__actions input, .batch-totals-bottom-panel__actions a, .batch-totals-bottom-panel__body button, .batch-totals-bottom-panel__body input, .batch-totals-bottom-panel__body a",
    ),
  );
}

export function BatchTotalsBottomPanel({
  multiplier,
  extraBatches,
  totalGrams,
  colorScheme,
  recipe,
  values,
  entityIndexes,
  sourceExpanded,
  onSourceExpandedChange,
}: {
  multiplier: number;
  extraBatches: ExtraBatchEntry[];
  totalGrams: number;
  colorScheme: ColorScheme;
  recipe: BlendingRecipe;
  values: number[];
  entityIndexes: number[];
  sourceExpanded: boolean;
  onSourceExpandedChange: (next: boolean) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [holding, setHolding] = useState(false);
  const [expandAnimating, setExpandAnimating] = useState(false);
  const [tableUiReady, setTableUiReady] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState(PANEL_COLLAPSED_HEIGHT_FALLBACK);
  const [maxExpandHeight, setMaxExpandHeight] = useState(PANEL_EXPANDED_HEIGHT_FALLBACK);
  const [shareActionsHeight, setShareActionsHeight] = useState(PANEL_SHARE_HEIGHT_FALLBACK);
  const [footerGap, setFooterGap] = useState(12);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const actionsInnerRef = useRef<HTMLDivElement>(null);
  const compactSummaryRef = useRef<HTMLDivElement>(null);
  const lastCompactSummaryHeightRef = useRef(PANEL_COLLAPSED_HEIGHT_FALLBACK);
  const dragStartYRef = useRef<number | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const expandSettledRef = useRef(false);

  const isExpandedVisual = sourceExpanded || expandAnimating;

  useEffect(() => {
    if (sourceExpanded) return;
    setTableUiReady(false);
    setExpandAnimating(false);
    expandSettledRef.current = false;
  }, [sourceExpanded]);

  useEffect(() => {
    if (!expandAnimating) return;

    const sheet = sheetRef.current;
    if (!sheet) return;

    expandSettledRef.current = false;

    const settleExpand = () => {
      if (expandSettledRef.current) return;
      expandSettledRef.current = true;
      onSourceExpandedChange(true);
      setExpandAnimating(false);
      setTableUiReady(true);
    };

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== sheet || event.propertyName !== "height") return;
      settleExpand();
    };

    sheet.addEventListener("transitionend", onTransitionEnd);
    const fallback = window.setTimeout(settleExpand, 360);

    return () => {
      sheet.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [expandAnimating, onSourceExpandedChange]);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const route = panel?.closest(".batch-totals-route");
    if (!panel || !route) return;

    const measure = () => {
      const headerChrome = route.querySelector(".app-header-chrome");
      const headerBottom =
        headerChrome instanceof HTMLElement
          ? headerChrome.offsetTop + headerChrome.offsetHeight
          : 0;
      const routeTop = route.getBoundingClientRect().top;
      const headerH = Math.max(0, headerBottom - routeTop);
      const nextMax = Math.max(0, route.clientHeight - headerH);
      setMaxExpandHeight(nextMax || PANEL_EXPANDED_HEIGHT_FALLBACK);

      const handleEl = handleRef.current;
      const handleStyles = handleEl ? getComputedStyle(handleEl) : null;
      const handleMarginBottom = handleStyles ? parseFloat(handleStyles.marginBottom) || 0 : 0;
      const handleH = Math.max(0, (handleEl?.offsetHeight ?? 0) + handleMarginBottom);
      const footer = footerRef.current;
      const screen = route.querySelector(".batch-totals-screen");
      const screenStyles = screen instanceof HTMLElement ? getComputedStyle(screen) : null;
      const tokenHeight = screenStyles
        ? parseFloat(screenStyles.getPropertyValue("--batch-totals-summary-h-dual"))
        : 0;
      if (tokenHeight > 0) {
        lastCompactSummaryHeightRef.current = tokenHeight;
      }
      const summaryH = tokenHeight > 0 ? tokenHeight : lastCompactSummaryHeightRef.current;
      const footerStyles = footer ? getComputedStyle(footer) : null;
      const footerPad = footerStyles
        ? parseFloat(footerStyles.paddingBottom) || 0
        : 0;
      const nextCollapsed = handleH + summaryH + footerPad;
      if (nextCollapsed > 0) {
        setCollapsedHeight(nextCollapsed);
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(route);
    if (handleRef.current) ro.observe(handleRef.current);
    if (footerRef.current) ro.observe(footerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [sourceExpanded, shareOpen, multiplier, extraBatches, recipe.id, tableUiReady]);

  useLayoutEffect(() => {
    const el = actionsInnerRef.current;
    if (!el) return;

    const measure = () => {
      setShareActionsHeight(el.scrollHeight || PANEL_SHARE_HEIGHT_FALLBACK);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [multiplier, extraBatches.length, recipe.id]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const measure = () => {
      const raw = getComputedStyle(panel).getPropertyValue("--batch-totals-footer-gap").trim();
      const px = parseFloat(raw);
      if (px > 0) setFooterGap(px);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!sourceExpanded && !shareOpen && !expandAnimating) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (sourceExpanded || expandAnimating) {
        setTableUiReady(false);
        setExpandAnimating(false);
        expandSettledRef.current = true;
        if (sourceExpanded) onSourceExpandedChange(false);
        return;
      }
      setShareOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sourceExpanded, shareOpen, expandAnimating, onSourceExpandedChange]);

  const shareVisibleHeight = (() => {
    if (isExpandedVisual) return shareActionsHeight;

    if (shareOpen) {
      if (holding || dragOffset !== 0) {
        if (dragOffset > 0) {
          return Math.max(0, shareActionsHeight - dragOffset);
        }
        return shareActionsHeight;
      }
      return shareActionsHeight;
    }

    if (holding || dragOffset !== 0) {
      return Math.min(shareActionsHeight, Math.max(0, -dragOffset));
    }
    return 0;
  })();

  const shareFooterGap = shareVisibleHeight > 0 ? footerGap : 0;
  const shareStageHeight = collapsedHeight + footerGap + shareActionsHeight;
  const expandRange = Math.max(0, maxExpandHeight - shareStageHeight);

  const clampHandleDragOffset = useCallback(
    (dy: number) => {
      if (isExpandedVisual) {
        const max = expandRange * 0.92;
        return Math.min(max, Math.max(0, dy * PANEL_DRAG_FOLLOW));
      }
      if (shareOpen) {
        if (dy < 0) {
          const max = expandRange * 0.92;
          return Math.max(-max, dy * PANEL_DRAG_FOLLOW);
        }
        const max = shareActionsHeight * 0.92;
        return Math.min(max, Math.max(0, dy * PANEL_DRAG_FOLLOW));
      }
      const max = shareActionsHeight * 0.92;
      return Math.max(-max, Math.min(0, dy * PANEL_DRAG_FOLLOW));
    },
    [expandRange, shareActionsHeight, shareOpen, isExpandedVisual],
  );

  const resolvedSheetHeight = (() => {
    if (isExpandedVisual) {
      if (holding || dragOffset !== 0) {
        return Math.max(shareStageHeight, maxExpandHeight - dragOffset);
      }
      return maxExpandHeight;
    }

    if (shareOpen) {
      if (holding || dragOffset !== 0) {
        if (dragOffset < 0) {
          const extra = Math.min(expandRange, -dragOffset);
          return shareStageHeight + extra;
        }
        return collapsedHeight + shareFooterGap + Math.max(0, shareActionsHeight - dragOffset);
      }
      return shareStageHeight;
    }

    if (holding || dragOffset !== 0) {
      return collapsedHeight + shareFooterGap + shareVisibleHeight;
    }
    return collapsedHeight;
  })();

  const isShareRevealing = shareVisibleHeight > 0 || holding;

  useLayoutEffect(() => {
    const screen = panelRef.current?.closest(".batch-totals-screen");
    if (!(screen instanceof HTMLElement)) return;
    screen.style.setProperty("--batch-totals-panel-reserve", `${resolvedSheetHeight}px`);
  }, [resolvedSheetHeight]);

  const finishHandleDrag = useCallback(
    (clientY: number) => {
      const startY = dragStartYRef.current;
      dragStartYRef.current = null;
      setHolding(false);
      setDragOffset(0);

      if (startY == null) return;

      const dy = clientY - startY;

      if (isExpandedVisual) {
        if (dy >= PANEL_DRAG_THRESHOLD_PX) {
          setTableUiReady(false);
          setExpandAnimating(false);
          expandSettledRef.current = true;
          if (sourceExpanded) {
            onSourceExpandedChange(false);
          }
        }
        return;
      }

      if (shareOpen) {
        if (dy <= -PANEL_DRAG_THRESHOLD_PX) {
          setExpandAnimating(true);
          return;
        }
        if (dy >= PANEL_DRAG_THRESHOLD_PX) {
          setShareOpen(false);
        }
        return;
      }

      if (dy <= -PANEL_DRAG_THRESHOLD_PX) {
        setShareOpen(true);
      }
    },
    [shareOpen, isExpandedVisual, sourceExpanded, onSourceExpandedChange],
  );

  const handleDragPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (shouldBlockHandleDrag(event.target)) return;
      if (event.button !== 0) return;

      event.preventDefault();
      dragCleanupRef.current?.();

      dragStartYRef.current = event.clientY;
      setHolding(true);

      const onMove = (ev: PointerEvent) => {
        const startY = dragStartYRef.current;
        if (startY == null) return;
        setDragOffset(clampHandleDragOffset(ev.clientY - startY));
      };

      const onEnd = (ev: PointerEvent) => {
        finishHandleDrag(ev.clientY);
        cleanup();
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        dragCleanupRef.current = null;
      };

      dragCleanupRef.current = cleanup;
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [clampHandleDragOffset, finishHandleDrag],
  );

  const panelStageLabel = sourceExpanded
    ? "Batch sources expanded — drag handle down to show share"
    : shareOpen
      ? "Share actions — drag handle up for sources, down to collapse"
      : "Batch total — drag handle up for share actions";

  return (
    <div
      ref={panelRef}
      id="batch-totals-bottom-panel"
      className={`batch-totals-bottom-panel${
        isExpandedVisual ? " batch-totals-bottom-panel--source-expanded" : ""
      }${tableUiReady ? " batch-totals-bottom-panel--table-revealing" : ""}${
        shareOpen ? " batch-totals-bottom-panel--share-open" : ""
      }${isShareRevealing ? " batch-totals-bottom-panel--share-revealing" : ""}${
        holding ? " batch-totals-bottom-panel--holding" : ""
      }`}
    >
      <div
        ref={sheetRef}
        className="batch-totals-bottom-panel__sheet"
        style={{
          height: resolvedSheetHeight,
          transition: holding
            ? "none"
            : "height 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          className="batch-totals-bottom-panel__content"
          role="region"
          aria-expanded={sourceExpanded}
          aria-label={panelStageLabel}
        >
          <div
            ref={handleRef}
            className="batch-totals-bottom-panel__drag-zone"
            onPointerDown={handleDragPointerDown}
          >
            <div
              className={`batch-totals-grab-handle${holding ? " batch-totals-grab-handle--holding" : ""}`}
              aria-hidden
            >
              <span className="batch-totals-grab-handle__pill" />
            </div>
          </div>

          {tableUiReady ? (
            <div
              className="batch-totals-bottom-panel__body app-gutter-x batch-totals-bottom-panel__body--readonly"
              aria-label="Batch summary — total per ingredient"
            >
              <div className="batch-totals-bottom-panel__body-inner">
                <BatchTotalsEntityTotalTable
                  recipe={recipe}
                  values={values}
                  extraBatches={extraBatches}
                  entityIndexes={entityIndexes}
                  multiplier={multiplier}
                  colorScheme={colorScheme}
                />
              </div>
            </div>
          ) : null}

          <div
            ref={footerRef}
            className="batch-totals-bottom-panel__footer shrink-0 min-h-0"
          >
            <div className="batch-totals-bottom-panel__card-region app-gutter-x">
              <BatchTotalsSummaryBar
                multiplier={multiplier}
                extraBatches={extraBatches}
                totalGrams={totalGrams}
                colorScheme={colorScheme}
                compactSummaryRef={compactSummaryRef}
              />
            </div>

            <div
              className={`batch-totals-bottom-panel__actions app-gutter-x${
                holding ? " batch-totals-bottom-panel__actions--live" : ""
              }`}
              aria-hidden={!isShareRevealing}
              style={{
                height: shareVisibleHeight,
                overflow: "hidden",
                transition: holding
                  ? "none"
                  : "height 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div ref={actionsInnerRef} className="batch-totals-bottom-panel__actions-inner">
                <BatchTotalsShareBar
                  recipe={recipe}
                  values={values}
                  extraBatches={extraBatches}
                  entityIndexes={entityIndexes}
                  multiplier={multiplier}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface BatchTotalsScreenProps {
  recipe: BlendingRecipe;
  values: number[];
  extraBatches: ExtraBatchEntry[];
  entityIndexes: number[];
  multiplier: number;
  onMultiplierChange: (next: number) => void;
  onExtraBatchesChange: (next: ExtraBatchEntry[]) => void;
  sandType: SandType;
  totalsPanelExpanded?: boolean;
  onTotalsPanelExpandedChange?: (next: boolean) => void;
}

function StepButton({
  label,
  onClick,
  disabled,
  className = "",
  style,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const symbol = label === "Decrease batch count" ? "−" : "+";

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`batch-totals-card-header-btn flex items-center justify-center shrink-0 transition-colors duration-150 active:scale-95 ${className}`}
      style={{
        ...cardRoundBtnStyle(disabled),
        fontSize: "var(--totals-step-font-size)",
        fontWeight: 300,
        lineHeight: 1,
        ...style,
      }}
    >
      {symbol}
    </button>
  );
}

function AmountCell({
  grams,
  isKg,
  colorScheme,
}: {
  grams: number;
  isKg: boolean;
  colorScheme: ColorScheme;
}) {
  const unit = isKg ? "kg" : "g";
  return (
    <span
      className="tabular-nums whitespace-nowrap"
      style={{ color: entityValueColor(true, colorScheme) }}
    >
      {formatMixAmount(grams, isKg)}
      <span
        style={{
          color: cv.text.muted,
          fontWeight: 500,
          marginLeft: 3,
          fontSize: "var(--text-totals-unit)",
        }}
      >
        {unit}
      </span>
    </span>
  );
}

function MultCell({ value }: { value: number | string }) {
  return (
    <span className="tabular-nums" style={MULT_TEXT}>
      {typeof value === "number" ? `×${value}` : value}
    </span>
  );
}

const ITEM_META_STYLE: CSSProperties = {
  fontSize: "var(--text-totals-item-meta)",
  letterSpacing: "0.04em",
  fontWeight: 600,
  color: cv.text.muted,
  lineHeight: 1.2,
  textTransform: "capitalize",
};

function ItemNameWithMeta({
  id,
  color,
  metaLabel,
  letterSpacing = "0.18em",
}: {
  id: string;
  color: string;
  metaLabel?: string;
  letterSpacing?: string;
}) {
  return (
    <div className="min-w-0 flex items-baseline gap-1">
      <span
        className="truncate shrink-0"
        style={{
          fontSize: "var(--text-card-name)",
          letterSpacing,
          fontWeight: CARD_NAME_WEIGHT,
          color,
          lineHeight: 1.15,
        }}
      >
        {id}
      </span>
      {metaLabel ? (
        <span className="truncate min-w-0" style={ITEM_META_STYLE}>
          {metaLabel}
        </span>
      ) : null}
    </div>
  );
}

function PerBatchRow({ grams, isKg }: { grams: number; isKg: boolean }) {
  const unit = isKg ? "kg" : "g";

  return (
    <div
      className="tabular-nums whitespace-nowrap"
      style={{
        ...TABLE_TEXT,
        fontSize: "var(--text-totals-item-per-batch)",
        color: cv.text.muted,
        marginTop: 3,
        lineHeight: 1.15,
      }}
    >
      {formatMixAmount(grams, isKg)}
      <span style={{ fontWeight: 500 }}>{unit}</span>
      <span>/batch</span>
    </div>
  );
}

const ENTITY_TOTAL_COL_ITEM = "56%";
const ENTITY_TOTAL_COL_TOTAL = "44%";

const ENTITY_SUMMARY_TH_TEXT: CSSProperties = {
  color: cv.text.muted,
  letterSpacing: "0.1em",
  fontWeight: 600,
  textTransform: "uppercase",
  lineHeight: 1.15,
};

function entitySummaryThItemStyle(extra?: CSSProperties): CSSProperties {
  return {
    padding: "var(--entity-summary-th-py) 0",
    background: "transparent",
    fontSize: "var(--entity-summary-label-size)",
    ...ENTITY_SUMMARY_TH_TEXT,
    ...extra,
  };
}

function entitySummaryThTotalStyle(extra?: CSSProperties): CSSProperties {
  return entitySummaryThItemStyle(extra);
}

function entitySummaryCellItemStyle(extra?: CSSProperties): CSSProperties {
  return { padding: "var(--entity-summary-cell-py) 0", ...extra };
}

function BatchTotalsEntityTotalTable({
  recipe,
  values,
  extraBatches,
  entityIndexes,
  multiplier,
  colorScheme,
}: {
  recipe: BlendingRecipe;
  values: number[];
  extraBatches: ExtraBatchEntry[];
  entityIndexes: number[];
  multiplier: number;
  colorScheme: ColorScheme;
}) {
  const amountColor = entityValueColor(true, colorScheme);
  const ingredientRows = entityIndexes.filter((i) => i !== 0);

  return (
    <div className="batch-totals-entity-total-table min-w-0 w-full" aria-readonly>
      <table className="batch-totals-entity-total-table__grid w-full min-w-0 border-collapse" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: ENTITY_TOTAL_COL_ITEM }} />
          <col style={{ width: ENTITY_TOTAL_COL_TOTAL }} />
        </colgroup>
        <thead>
          <tr>
            <th
              colSpan={2}
              scope="colgroup"
              className="batch-totals-entity-summary__title app-header__recipe-value"
            >
              Summary
            </th>
          </tr>
          <tr className="batch-totals-entity-summary__columns-row">
            <th scope="col" className="text-left align-bottom" style={entitySummaryThItemStyle()}>
              Item
            </th>
            <th scope="col" className="text-right align-bottom" style={entitySummaryThTotalStyle()}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {ingredientRows.map((pi) => {
            const p = MIX_PARAMS[pi];
            const metaLabel = getEntityMetaLabel(recipe, p.id);
            const totalGrams = batchIngredientTotalGrams(values, extraBatches, pi, multiplier);

            return (
              <tr key={p.id}>
                <th scope="row" className="text-left align-middle font-normal" style={entitySummaryCellItemStyle()}>
                  <div className="min-w-0">
                    <ItemNameWithMeta
                      id={p.id}
                      color={entityAccentColor(p.id, colorScheme)}
                      metaLabel={metaLabel}
                    />
                  </div>
                </th>
                <td
                  className="text-right align-middle tabular-nums whitespace-nowrap"
                  style={cellTotalStyle({
                    fontSize: "var(--text-totals-row-amount)",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    lineHeight: 1.15,
                    color: amountColor,
                  })}
                >
                  <AmountCell grams={totalGrams} isKg={p.isKg} colorScheme={colorScheme} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SourceTableDataRow({
  pi,
  recipe,
  colorScheme,
  perBatchGrams,
  mult,
  amountColor,
  section = "batches",
}: {
  pi: number;
  recipe: BlendingRecipe;
  colorScheme: ColorScheme;
  perBatchGrams: number;
  mult: number;
  amountColor: string;
  section?: "batches" | "extra";
}) {
  const p = MIX_PARAMS[pi];
  const isTotal = pi === 0;
  const metaLabel = !isTotal ? getEntityMetaLabel(recipe, p.id) : undefined;
  const lineTotalGrams = perBatchGrams * mult;
  const rowBg = section === "extra" ? bt.extraBatchBackground : undefined;
  const cellExtra = rowBg ? { background: rowBg } : undefined;

  return (
    <tr
      style={{
        borderBottom: isTotal ? undefined : TABLE_BORDER,
        ...(isTotal ? { borderTop: TABLE_BORDER } : {}),
      }}
    >
      <th scope="row" className="text-left align-middle font-normal" style={cellItemStyle(cellExtra)}>
        <div className="min-w-0">
          {isTotal ? (
            <span
              className="block truncate"
              style={{
                fontSize: "var(--text-card-name)",
                letterSpacing: "0.18em",
                fontWeight: CARD_NAME_WEIGHT,
                color: entityAccentColor(p.id, colorScheme),
                lineHeight: 1.15,
              }}
            >
              {p.id}
            </span>
          ) : (
            <ItemNameWithMeta
              id={p.id}
              color={entityAccentColor(p.id, colorScheme)}
              metaLabel={metaLabel}
            />
          )}
          <PerBatchRow grams={perBatchGrams} isKg={p.isKg} />
        </div>
      </th>
      <td className="text-center align-middle" style={cellMultStyle(cellExtra)}>
        <MultCell value={mult} />
      </td>
      <td
        className="text-right align-middle tabular-nums whitespace-nowrap"
        style={cellTotalStyle({
          ...TABLE_TEXT,
          fontSize: isTotal ? "var(--text-totals-row-amount-total)" : "var(--text-totals-row-amount)",
          color: amountColor,
          fontWeight: isTotal ? 700 : 600,
          lineHeight: 1.15,
          ...cellExtra,
        })}
      >
        <AmountCell grams={lineTotalGrams} isKg={p.isKg} colorScheme={colorScheme} />
      </td>
    </tr>
  );
}

function MultiplierSectionHeader({
  title,
  titleColor,
  multiplier,
  onMultiplierChange,
  variant = "batches",
  trailing,
  showReset = false,
}: {
  title: string;
  titleColor?: string;
  multiplier: number;
  onMultiplierChange: (next: number) => void;
  variant?: "batches" | "extra";
  trailing?: ReactNode;
  showReset?: boolean;
}) {
  return (
    <div
      className="shrink-0 grid items-center min-w-0 w-full"
      style={{
        ...cardHeaderStyle(variant),
        gridTemplateColumns: TABLE_COLS,
      }}
    >
      <p style={sectionTitleStyle(titleColor)}>{title}</p>
      <div
        className="flex items-center justify-center"
        style={{ padding: "0 2px", position: "relative" }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ minWidth: 36, height: "var(--totals-header-icon-btn)" }}
        >
          <StepButton
            label="Decrease batch count"
            onClick={() => onMultiplierChange(Math.max(1, multiplier - 1))}
            disabled={multiplier <= 1}
            className="absolute"
            style={{ right: "100%", marginRight: "var(--totals-multiplier-row-gap, 12px)" }}
          />
          <p
            className="tabular-nums text-center"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "var(--totals-mult-value-size, 20px)",
              fontWeight: 400,
              color: cv.text.primary,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              margin: 0,
            }}
          >
            {multiplier}
          </p>
          <StepButton
            label="Increase batch count"
            onClick={() => onMultiplierChange(Math.min(999, multiplier + 1))}
            disabled={multiplier >= 999}
            className="absolute"
            style={{ left: "100%", marginLeft: "var(--totals-multiplier-row-gap, 12px)" }}
          />
        </div>
      </div>
      <div
        className="flex items-center justify-end shrink-0"
        style={{ gap: "var(--totals-header-action-gap)", padding: "0 var(--totals-header-cell-pad-x)" }}
      >
        {showReset ? (
          <IconHeaderButton
            label="Reset batch count"
            onClick={() => onMultiplierChange(1)}
            disabled={multiplier <= 1}
          >
            <ResetIcon size={HEADER_ICON_SIZE} />
          </IconHeaderButton>
        ) : null}
        {trailing}
      </div>
    </div>
  );
}

function BatchTotalsSourceTables({
  recipe,
  values,
  extraBatches,
  entityIndexes,
  multiplier,
  colorScheme,
  onMultiplierChange,
  onExtraBatchMultiplierChange,
  onAddExtraBatch,
  onEditExtraBatch,
  onRemoveExtraBatch,
}: {
  recipe: BlendingRecipe;
  values: number[];
  extraBatches: ExtraBatchEntry[];
  entityIndexes: number[];
  multiplier: number;
  colorScheme: ColorScheme;
  onMultiplierChange: (next: number) => void;
  onExtraBatchMultiplierChange: (index: number, next: number) => void;
  onAddExtraBatch: () => void;
  onEditExtraBatch: (index: number) => void;
  onRemoveExtraBatch: (index: number) => void;
}) {
  const amountColor = entityValueColor(true, colorScheme);
  const ingredientRows = entityIndexes.filter((i) => i !== 0);
  const batchRowIndexes = [...ingredientRows, 0];

  return (
    <div
      className="batch-totals-source-card w-full min-w-0 shrink-0 rounded-xl overflow-hidden"
      style={{ border: bt.batchesCardBorder }}
    >
      <MultiplierSectionHeader
        title="Batches"
        multiplier={multiplier}
        onMultiplierChange={onMultiplierChange}
        showReset
      />

      <div
        className="batch-totals-source-card__body"
        style={{
          background: bt.batchesCardBackground,
          boxShadow: bt.insetHighlight,
        }}
      >
        <table className="batch-totals-source-table w-full min-w-0 border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: COL_ITEM }} />
            <col style={{ width: COL_MULT }} />
            <col style={{ width: COL_TOTAL }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: TABLE_BORDER }}>
              <th scope="col" className="text-left" style={thCellItemStyle(bt.cardHeaderBackground, TH_TEXT)}>
                Item
              </th>
              <th scope="col" className="text-center" style={thCellMultStyle(bt.cardHeaderBackground, TH_TEXT)}>
                ×
              </th>
              <th scope="col" className="text-right" style={thCellTotalStyle(bt.cardHeaderBackground, TH_TEXT)}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {batchRowIndexes.map((pi) => (
              <SourceTableDataRow
                key={`batch-${MIX_PARAMS[pi].id}`}
                pi={pi}
                recipe={recipe}
                colorScheme={colorScheme}
                perBatchGrams={values[pi]}
                mult={multiplier}
                amountColor={amountColor}
              />
            ))}
            {extraBatches.map((entry, index) => (
              <Fragment key={`extra-section-${index}`}>
                <tr data-section-header>
                  <td colSpan={3} style={{ padding: 0, borderTop: TABLE_BORDER }}>
                    <MultiplierSectionHeader
                      title={extraBatchSectionLabel(index, extraBatches.length)}
                      titleColor={cv.extraBatch.label}
                      multiplier={entry.multiplier}
                      onMultiplierChange={(next) => onExtraBatchMultiplierChange(index, next)}
                      variant="extra"
                      trailing={
                        <>
                          <IconHeaderButton
                            label={`Edit ${extraBatchSectionLabel(index, extraBatches.length).toLowerCase()}`}
                            onClick={() => onEditExtraBatch(index)}
                            color={cv.extraBatch.label}
                          >
                            <RenameIcon size={HEADER_ICON_SIZE} />
                          </IconHeaderButton>
                          <IconHeaderButton
                            label={`Remove ${extraBatchSectionLabel(index, extraBatches.length).toLowerCase()}`}
                            onClick={() => onRemoveExtraBatch(index)}
                            color={cv.text.muted}
                          >
                            <DeleteIcon size={HEADER_ICON_SIZE} />
                          </IconHeaderButton>
                        </>
                      }
                    />
                  </td>
                </tr>
                {batchRowIndexes.map((pi) => (
                  <SourceTableDataRow
                    key={`extra-${index}-${MIX_PARAMS[pi].id}`}
                    pi={pi}
                    recipe={recipe}
                    colorScheme={colorScheme}
                    perBatchGrams={entry.values[pi]}
                    mult={entry.multiplier}
                    amountColor={amountColor}
                    section="extra"
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={onAddExtraBatch}
        className="batch-totals-add-extra-btn w-full flex items-center justify-center text-center"
        style={{
          cursor: "pointer",
          background: "transparent",
          border: 0,
          borderTop: TABLE_BORDER,
          minHeight: "var(--totals-add-extra-h, var(--action-row-h))",
          padding: "var(--totals-add-extra-py, 12px) 10px",
          fontSize: "var(--text-totals-section)",
          letterSpacing: "0.1em",
          fontWeight: 600,
          color: cv.extraBatch.label,
          lineHeight: 1.3,
        }}
      >
        Add extra batch
      </button>
    </div>
  );
}

function BatchTotalsSummaryBar({
  multiplier,
  extraBatches,
  totalGrams,
  colorScheme,
  compactSummaryRef,
}: {
  multiplier: number;
  extraBatches: ExtraBatchEntry[];
  totalGrams: number;
  colorScheme: ColorScheme;
  compactSummaryRef: RefObject<HTMLDivElement | null>;
}) {
  const totalParam = MIX_PARAMS[0];
  const amountColor = entityValueColor(true, colorScheme);
  const hasExtra = hasExtraBatches(extraBatches);
  const extraTotalCount = extraBatchTotalCount(extraBatches);

  const totalRow = (
    <div
      className="text-right min-w-0 flex items-center justify-end gap-2 shrink-0 batch-totals-summary-bar__total"
      style={{
        ...TABLE_TEXT,
        fontSize: "var(--text-totals-sum)",
        color: amountColor,
        fontWeight: 700,
        lineHeight: 1.1,
      }}
    >
      <span
        className="truncate shrink-0"
        style={{
          fontSize: "var(--text-card-name)",
          letterSpacing: "0.18em",
          fontWeight: CARD_NAME_WEIGHT,
          color: entityAccentColor(totalParam.id, colorScheme),
          lineHeight: 1.15,
        }}
      >
        {totalParam.id}
      </span>
      <AmountCell grams={totalGrams} isKg={totalParam.isKg} colorScheme={colorScheme} />
    </div>
  );

  return (
    <div className="min-w-0 w-full batch-totals-summary-bar">
      <div className="batch-totals-summary-bar__card w-full min-w-0 flex flex-col min-h-0">
        <div
          ref={compactSummaryRef}
          className="grid items-center min-w-0 w-full batch-totals-summary-bar__grid batch-totals-summary-bar__compact"
          style={{ gridTemplateColumns: SUMMARY_COLS }}
        >
          <div
            className={`batch-totals-summary-bar__batch-rows min-w-0${
              hasExtra ? " batch-totals-summary-bar__batch-rows--dual" : ""
            }`}
          >
            <div className="batch-totals-summary-bar__batch-row">
              <span style={sectionTitleStyle()}>Batches</span>
              <MultCell value={multiplier} />
            </div>
            <div
              className={`batch-totals-summary-bar__batch-row batch-totals-summary-bar__batch-row--extra${
                hasExtra ? " batch-totals-summary-bar__batch-row--visible" : ""
              }`}
              aria-hidden={!hasExtra}
            >
              <span style={sectionTitleStyle(cv.extraBatch.label)} title="Extra batch">
                Extra batch
              </span>
              <MultCell value={extraTotalCount} />
            </div>
          </div>
          {totalRow}
        </div>
      </div>
    </div>
  );
}

function IconHeaderButton({
  label,
  onClick,
  disabled,
  color = cv.text.muted,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="batch-totals-card-header-btn flex items-center justify-center shrink-0 transition-colors duration-150 active:scale-95"
      style={cardRoundBtnStyle(disabled, color)}
    >
      {children}
    </button>
  );
}

export function BatchTotalsScreen({
  recipe,
  values,
  extraBatches,
  entityIndexes,
  multiplier,
  onMultiplierChange,
  onExtraBatchesChange,
  sandType,
  totalsPanelExpanded = false,
  onTotalsPanelExpandedChange,
}: BatchTotalsScreenProps) {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const shellCompact = useAppShellCompact();
  const [extraBatchSheetOpen, setExtraBatchSheetOpen] = useState(false);
  const [editingExtraIndex, setEditingExtraIndex] = useState<number | null>(null);
  const [sheetPortal, setSheetPortal] = useState<HTMLElement | null>(null);
  const ingredientRows = entityIndexes.filter((i) => i !== 0);
  const batchTableRowCount = ingredientRows.length + 1;
  const denseTable = batchTableRowCount > 4;
  const compactSummary = shellCompact && denseTable;
  const grandTotalGrams = batchIngredientTotalGrams(
    values,
    extraBatches,
    0,
    multiplier,
  );

  const handleAddExtraBatch = () => {
    setEditingExtraIndex(-1);
    setExtraBatchSheetOpen(true);
  };

  const handleEditExtraBatch = (index: number) => {
    setEditingExtraIndex(index);
    setExtraBatchSheetOpen(true);
  };

  const handleRemoveExtraBatch = (index: number) => {
    onExtraBatchesChange(extraBatches.filter((_, i) => i !== index));
  };

  const handleExtraBatchMultiplierChange = (index: number, next: number) => {
    onExtraBatchesChange(
      extraBatches.map((entry, i) => (i === index ? { ...entry, multiplier: next } : entry)),
    );
  };

  const handleExtraBatchSheetApply = (nextValues: number[]) => {
    if (editingExtraIndex === null || editingExtraIndex === -1) {
      onExtraBatchesChange([...extraBatches, { values: nextValues, multiplier: 1 }]);
    } else {
      onExtraBatchesChange(
        extraBatches.map((entry, i) =>
          i === editingExtraIndex ? { ...entry, values: nextValues } : entry,
        ),
      );
    }
    setExtraBatchSheetOpen(false);
    setEditingExtraIndex(null);
  };

  const sheetValues =
    editingExtraIndex !== null && editingExtraIndex >= 0
      ? extraBatches[editingExtraIndex]?.values ?? emptyComplementValues()
      : emptyComplementValues();

  useEffect(() => {
    setSheetPortal(document.querySelector(".app-frame"));
  }, []);

  return (
    <div
      className={`batch-totals-screen flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden relative${compactSummary ? " batch-totals-screen--compact-summary" : !shellCompact ? " batch-totals-screen--tall" : ""}`}
      data-dense-table={denseTable ? "" : undefined}
    >
      <div
        className="batch-totals-screen__main app-gutter-x flex flex-col"
        style={{ paddingTop: compactSummary ? 0 : "var(--recipe-zone-pt)" }}
      >
        <div className="batch-totals-scroll-panel flex flex-col">
          <div className="batch-totals-scroll-panel__inner">
            <BatchTotalsSourceTables
              recipe={recipe}
              values={values}
              extraBatches={extraBatches}
              entityIndexes={entityIndexes}
              multiplier={multiplier}
              colorScheme={colorScheme}
              onMultiplierChange={onMultiplierChange}
              onExtraBatchMultiplierChange={handleExtraBatchMultiplierChange}
              onAddExtraBatch={handleAddExtraBatch}
              onEditExtraBatch={handleEditExtraBatch}
              onRemoveExtraBatch={handleRemoveExtraBatch}
            />
          </div>
        </div>
      </div>

      <BatchTotalsBottomPanel
        multiplier={multiplier}
        extraBatches={extraBatches}
        totalGrams={grandTotalGrams}
        colorScheme={colorScheme}
        recipe={recipe}
        values={values}
        entityIndexes={entityIndexes}
        sourceExpanded={totalsPanelExpanded}
        onSourceExpandedChange={onTotalsPanelExpandedChange ?? (() => {})}
      />

      {sheetPortal
        ? createPortal(
            <MixerInputSheet
              open={extraBatchSheetOpen}
              onOpenChange={(open) => {
                setExtraBatchSheetOpen(open);
                if (!open) setEditingExtraIndex(null);
              }}
              title={
                editingExtraIndex !== null && editingExtraIndex >= 0
                  ? extraBatchSectionLabel(editingExtraIndex, extraBatches.length)
                  : "Extra batch"
              }
              subtitle="One custom batch — added on top of your batches"
              recipe={recipe}
              values={sheetValues}
              entityIndexes={entityIndexes}
              bucketSelection="none"
              sandType={sandType}
              onApply={handleExtraBatchSheetApply}
            />,
            sheetPortal,
          )
        : null}
    </div>
  );
}
