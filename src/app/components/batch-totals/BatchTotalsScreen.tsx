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
import {
  ScrollEdgeFadeOverlays,
  useScrollEdgeFades,
} from "../sheets/scrollEdgeFades";
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
  letterSpacing: "0.1em",
  fontWeight: 500,
};

const HEADER_ICON_SIZE = 14;

const TABLE_TEXT: CSSProperties = {
  fontSize: "var(--text-totals-table)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  lineHeight: 1.35,
};

const TH_TEXT: CSSProperties = {
  ...TABLE_TEXT,
  fontSize: "var(--text-totals-table)",
  letterSpacing: "0.08em",
  fontWeight: 600,
  color: cv.text.muted,
  textTransform: "uppercase",
  lineHeight: 1.15,
};

const MULT_TEXT: CSSProperties = {
  ...TABLE_TEXT,
  fontSize: "var(--text-totals-mult)",
  fontWeight: 600,
  color: cv.text.secondary,
  letterSpacing: "0.02em",
};

const CELL_PAD = "var(--totals-cell-py) var(--totals-cell-px)";
const MULT_CELL_PAD = "var(--totals-cell-py) var(--totals-cell-mult-px, 6px)";
const TABLE_TH_PAD = "var(--totals-th-py) var(--totals-th-px)";
const TABLE_TH_MULT_PAD = "var(--totals-th-py) var(--totals-th-mult-px, 8px)";

const SECTION_TITLE: CSSProperties = {
  ...SECTION_HEADER,
  fontSize: "var(--text-totals-table)",
  fontWeight: 500,
  letterSpacing: "0.12em",
  lineHeight: 1.2,
  textTransform: "uppercase",
  margin: 0,
  padding: "0 var(--totals-section-title-pad-x)",
  color: cv.text.dimmed,
};

function sectionTitleStyle(color?: string): CSSProperties {
  return color ? { ...SECTION_TITLE, color } : SECTION_TITLE;
}

function cellTotalStyle(extra?: CSSProperties): CSSProperties {
  return { padding: CELL_PAD, ...extra };
}

function sourceCellItemStyle(extra?: CSSProperties): CSSProperties {
  return {
    paddingBlock: "var(--totals-cell-py)",
    paddingInlineEnd: "var(--totals-cell-px)",
    ...extra,
  };
}

function sourceCellMultStyle(extra?: CSSProperties): CSSProperties {
  return {
    paddingBlock: "var(--totals-cell-py)",
    paddingInline: "var(--totals-cell-mult-px, 6px)",
    ...extra,
  };
}

function sourceThCellItemStyle(extra?: CSSProperties): CSSProperties {
  return {
    paddingBlock: "var(--totals-th-py)",
    paddingInlineEnd: "var(--totals-th-px)",
    background: "transparent",
    ...extra,
  };
}

function sourceThCellMultStyle(extra?: CSSProperties): CSSProperties {
  return {
    paddingBlock: "var(--totals-th-py)",
    paddingInline: "var(--totals-th-mult-px, 8px)",
    background: "transparent",
    ...extra,
  };
}

function sourceThCellTotalStyle(extra?: CSSProperties): CSSProperties {
  return {
    paddingBlock: "var(--totals-th-py)",
    paddingInlineStart: "var(--totals-th-px)",
    background: "transparent",
    ...extra,
  };
}

function sourceCellTotalStyle(extra?: CSSProperties): CSSProperties {
  return {
    paddingBlock: "var(--totals-cell-py)",
    paddingInlineStart: "var(--totals-cell-px)",
    ...extra,
  };
}

function cardHeaderStyle(variant: "batches" | "extra" = "batches"): CSSProperties {
  return {
    padding:
      "var(--totals-card-header-py) var(--batch-totals-content-gutter, var(--totals-card-header-px))",
    background: variant === "extra" ? bt.extraCardHeaderBackground : bt.cardHeaderBackground,
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
/** 1:1 finger follow — sheet height tracks drag delta exactly within stage bounds. */
const PANEL_DRAG_FOLLOW = 1;
const PANEL_COLLAPSED_HEIGHT_FALLBACK = 96;
const PANEL_EXPANDED_HEIGHT_FALLBACK = 480;
const PANEL_SHARE_HEIGHT_FALLBACK = 140;

type PanelStage = "collapsed" | "share" | "expanded";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function nearestPanelStage(
  height: number,
  collapsed: number,
  share: number,
  expanded: number,
): PanelStage {
  const candidates: { stage: PanelStage; h: number }[] = [
    { stage: "collapsed", h: collapsed },
    { stage: "share", h: share },
    { stage: "expanded", h: expanded },
  ];
  let best = candidates[0];
  let bestDist = Math.abs(height - best.h);
  for (let i = 1; i < candidates.length; i++) {
    const dist = Math.abs(height - candidates[i].h);
    if (dist < bestDist) {
      best = candidates[i];
      bestDist = dist;
    }
  }
  return best.stage;
}

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
  const [dragHeight, setDragHeight] = useState<number | null>(null);
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
  const dragStartHeightRef = useRef(0);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const expandSettledRef = useRef(false);

  const shareStageHeight = collapsedHeight + footerGap + shareActionsHeight;
  const settledSheetHeight = sourceExpanded || expandAnimating
    ? maxExpandHeight
    : shareOpen
      ? shareStageHeight
      : collapsedHeight;

  const dragging = holding || dragHeight != null;
  const resolvedSheetHeight = dragHeight ?? settledSheetHeight;

  /** Share strip height implied by absolute sheet height (continuous scrub). */
  const shareVisibleHeight = (() => {
    if (resolvedSheetHeight <= collapsedHeight + 0.5) return 0;
    if (resolvedSheetHeight >= shareStageHeight - 0.5) return shareActionsHeight;
    return clamp(resolvedSheetHeight - collapsedHeight - footerGap, 0, shareActionsHeight);
  })();

  const isShareRevealing = shareVisibleHeight > 0 || holding;
  const isExpandedVisual =
    sourceExpanded ||
    expandAnimating ||
    (dragging && resolvedSheetHeight > shareStageHeight + 1);

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

  useLayoutEffect(() => {
    const screen = panelRef.current?.closest(".batch-totals-screen");
    if (!(screen instanceof HTMLElement)) return;
    screen.style.setProperty("--batch-totals-panel-reserve", `${resolvedSheetHeight}px`);
  }, [resolvedSheetHeight]);

  const applyPanelStage = useCallback(
    (stage: PanelStage) => {
      if (stage === "expanded") {
        setShareOpen(true);
        if (!sourceExpanded) {
          setExpandAnimating(true);
        } else {
          setTableUiReady(true);
        }
        return;
      }

      setTableUiReady(false);
      setExpandAnimating(false);
      expandSettledRef.current = true;
      if (sourceExpanded) onSourceExpandedChange(false);
      setShareOpen(stage === "share");
    },
    [onSourceExpandedChange, sourceExpanded],
  );

  const finishHandleDrag = useCallback(
    (clientY: number) => {
      const startY = dragStartYRef.current;
      const startHeight = dragStartHeightRef.current;
      dragStartYRef.current = null;
      setHolding(false);
      setDragHeight(null);

      if (startY == null) return;

      const dy = clientY - startY;
      if (Math.abs(dy) < PANEL_DRAG_THRESHOLD_PX) {
        // Tiny motion — stay on the stage we started from.
        return;
      }

      const liveHeight = clamp(
        startHeight - dy * PANEL_DRAG_FOLLOW,
        collapsedHeight,
        maxExpandHeight,
      );

      applyPanelStage(
        nearestPanelStage(liveHeight, collapsedHeight, shareStageHeight, maxExpandHeight),
      );
    },
    [applyPanelStage, collapsedHeight, maxExpandHeight, shareStageHeight],
  );

  const handleDragPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (shouldBlockHandleDrag(event.target)) return;
      if (event.button !== 0) return;

      event.preventDefault();
      dragCleanupRef.current?.();

      dragStartYRef.current = event.clientY;
      dragStartHeightRef.current = settledSheetHeight;
      setDragHeight(settledSheetHeight);
      setHolding(true);

      const onMove = (ev: PointerEvent) => {
        const startY = dragStartYRef.current;
        if (startY == null) return;
        const dy = (ev.clientY - startY) * PANEL_DRAG_FOLLOW;
        setDragHeight(
          clamp(dragStartHeightRef.current - dy, collapsedHeight, maxExpandHeight),
        );
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
    [collapsedHeight, finishHandleDrag, maxExpandHeight, settledSheetHeight],
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
      }${isExpandedVisual ? " batch-totals-bottom-panel--table-revealing" : ""}${
        shareOpen || isShareRevealing ? " batch-totals-bottom-panel--share-open" : ""
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

          {isExpandedVisual ? (
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
                batchesRelocated={isExpandedVisual}
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
  letterSpacing: "0.02em",
  fontWeight: 500,
  color: cv.text.secondary,
  lineHeight: 1.25,
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
        color: cv.text.secondary,
        marginTop: 2,
        lineHeight: 1.2,
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

function entitySummaryCellItemStyle(extra?: CSSProperties): CSSProperties {
  return { padding: "var(--entity-summary-cell-py) 0", ...extra };
}

function SummaryBatchRows({
  multiplier,
  extraBatches,
  className = "",
}: {
  multiplier: number;
  extraBatches: ExtraBatchEntry[];
  className?: string;
}) {
  const hasExtra = hasExtraBatches(extraBatches);
  const extraTotalCount = extraBatchTotalCount(extraBatches);

  return (
    <div
      className={`batch-totals-summary-bar__batch-rows min-w-0${
        hasExtra ? " batch-totals-summary-bar__batch-rows--dual" : ""
      }${className ? ` ${className}` : ""}`}
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
  );
}

/** Compact status chips for the expanded summary intro (mock-style badge). */
function SummaryBatchChips({
  multiplier,
  extraBatches,
}: {
  multiplier: number;
  extraBatches: ExtraBatchEntry[];
}) {
  const hasExtra = hasExtraBatches(extraBatches);
  const extraTotalCount = extraBatchTotalCount(extraBatches);

  return (
    <div className="batch-totals-entity-summary__chips" aria-label="Batch counts">
      <span className="batch-totals-entity-summary__chip">
        Batches <span className="batch-totals-entity-summary__chip-mult">×{multiplier}</span>
      </span>
      {hasExtra ? (
        <span className="batch-totals-entity-summary__chip batch-totals-entity-summary__chip--extra">
          Extra <span className="batch-totals-entity-summary__chip-mult">×{extraTotalCount}</span>
        </span>
      ) : null}
    </div>
  );
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
      <header className="batch-totals-entity-summary__intro">
        <h2 className="batch-totals-entity-summary__title">Summary</h2>
        <p className="batch-totals-entity-summary__subtitle">
          Combined totals for each ingredient across all batches.
        </p>
        <SummaryBatchChips multiplier={multiplier} extraBatches={extraBatches} />
      </header>
      <table className="batch-totals-entity-total-table__grid w-full min-w-0 border-collapse" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: ENTITY_TOTAL_COL_ITEM }} />
          <col style={{ width: ENTITY_TOTAL_COL_TOTAL }} />
        </colgroup>
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
                    paddingBlock: "var(--entity-summary-cell-py)",
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
}: {
  pi: number;
  recipe: BlendingRecipe;
  colorScheme: ColorScheme;
  perBatchGrams: number;
  mult: number;
  amountColor: string;
}) {
  const p = MIX_PARAMS[pi];
  const isTotal = pi === 0;
  const metaLabel = !isTotal ? getEntityMetaLabel(recipe, p.id) : undefined;
  const lineTotalGrams = perBatchGrams * mult;
  const totalCellExtra = isTotal
    ? ({ paddingTop: "calc(var(--totals-cell-py) + 6px)" } satisfies CSSProperties)
    : undefined;

  return (
    <tr {...(isTotal ? { "data-total-row": true } : undefined)}>
      <th scope="row" className="text-left align-middle font-normal" style={sourceCellItemStyle(totalCellExtra)}>
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
      <td className="text-center align-middle" style={sourceCellMultStyle(totalCellExtra)}>
        <MultCell value={mult} />
      </td>
      <td
        className="text-right align-middle tabular-nums whitespace-nowrap"
        style={sourceCellTotalStyle({
          ...TABLE_TEXT,
          fontSize: isTotal ? "var(--text-totals-row-amount-total)" : "var(--text-totals-row-amount)",
          color: amountColor,
          fontWeight: isTotal ? 700 : 600,
          lineHeight: 1.15,
          ...totalCellExtra,
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
          style={{ minWidth: 32, height: "var(--totals-header-icon-btn)" }}
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
    <div className="batch-totals-source-card w-full min-w-0 shrink-0 overflow-hidden">
      <MultiplierSectionHeader
        title="Batches"
        multiplier={multiplier}
        onMultiplierChange={onMultiplierChange}
        showReset
      />

      <div className="batch-totals-source-card__body">
        <table className="batch-totals-source-table w-full min-w-0 border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: COL_ITEM }} />
            <col style={{ width: COL_MULT }} />
            <col style={{ width: COL_TOTAL }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="text-left" style={sourceThCellItemStyle(TH_TEXT)}>
                Item
              </th>
              <th scope="col" className="text-center" style={sourceThCellMultStyle(TH_TEXT)}>
                ×
              </th>
              <th scope="col" className="text-right" style={sourceThCellTotalStyle(TH_TEXT)}>
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
                  <td colSpan={3} style={{ padding: 0 }}>
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
        className="text-btn batch-totals-add-extra-btn w-full flex items-center justify-center gap-2 text-center"
      >
        <span className="batch-totals-add-extra-btn__icon" aria-hidden>
          +
        </span>
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
  batchesRelocated = false,
}: {
  multiplier: number;
  extraBatches: ExtraBatchEntry[];
  totalGrams: number;
  colorScheme: ColorScheme;
  compactSummaryRef: RefObject<HTMLDivElement | null>;
  /** When true, batch rows live in the expanded table header; footer shows TOTAL left + amount right. */
  batchesRelocated?: boolean;
}) {
  const totalParam = MIX_PARAMS[0];
  const amountColor = entityValueColor(true, colorScheme);

  const totalLabel = (
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
  );

  const totalAmount = (
    <span
      className="tabular-nums whitespace-nowrap shrink-0"
      style={{
        ...TABLE_TEXT,
        fontSize: "var(--text-totals-sum)",
        color: amountColor,
        fontWeight: 700,
        lineHeight: 1.1,
      }}
    >
      <AmountCell grams={totalGrams} isKg={totalParam.isKg} colorScheme={colorScheme} />
    </span>
  );

  return (
    <div className="min-w-0 w-full batch-totals-summary-bar">
      <div className="batch-totals-summary-bar__card w-full min-w-0 flex flex-col min-h-0">
        <div
          ref={compactSummaryRef}
          className={`grid items-center min-w-0 w-full batch-totals-summary-bar__grid batch-totals-summary-bar__compact${
            batchesRelocated ? " batch-totals-summary-bar__compact--total-only" : ""
          }`}
          style={{ gridTemplateColumns: SUMMARY_COLS }}
        >
          {batchesRelocated ? (
            <div className="batch-totals-summary-bar__total-label min-w-0 flex items-center">
              {totalLabel}
            </div>
          ) : (
            <SummaryBatchRows multiplier={multiplier} extraBatches={extraBatches} />
          )}
          <div className="text-right min-w-0 flex items-center justify-end gap-2 shrink-0 batch-totals-summary-bar__total">
            {!batchesRelocated ? totalLabel : null}
            {totalAmount}
          </div>
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
  const scrollPanelRef = useRef<HTMLDivElement>(null);
  const scrollToTableBottomRef = useRef(false);
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
    const isCreate = editingExtraIndex === null || editingExtraIndex === -1;
    if (isCreate) {
      scrollToTableBottomRef.current = true;
    }
    if (isCreate) {
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

  useLayoutEffect(() => {
    if (!scrollToTableBottomRef.current) return;
    scrollToTableBottomRef.current = false;
    const panel = scrollPanelRef.current;
    if (!panel) return;
    requestAnimationFrame(() => {
      panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" });
    });
  }, [extraBatches]);

  const scrollEdges = useScrollEdgeFades(
    scrollPanelRef,
    true,
    `${extraBatches.length}:${compactSummary}:${denseTable}`,
  );

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
        className="batch-totals-screen__main flex flex-col"
        style={{ paddingTop: compactSummary ? 0 : "var(--recipe-zone-pt)" }}
      >
        <div className="scroll-edge-fade-viewport batch-totals-scroll-fade-viewport flex flex-col">
          <ScrollEdgeFadeOverlays
            fromTop={scrollEdges.fromTop}
            fromBottom={false}
          />
          <div ref={scrollPanelRef} className="batch-totals-scroll-panel flex flex-col">
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
