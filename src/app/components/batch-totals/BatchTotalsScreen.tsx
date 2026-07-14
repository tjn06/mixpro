import { useState, useEffect, useLayoutEffect, useRef, useCallback, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { formatMixAmount, MIX_PARAMS } from "../../domain/mix/entities";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { getEntityMetaLabel, hasComplementAmounts, emptyComplementValues } from "../../domain/recipe/calc";
import { batchIngredientTotalGrams } from "../../domain/batch-totals/totals";
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
  fontSize: "var(--text-totals-caption)",
  fontWeight: 600,
  color: cv.text.muted,
  letterSpacing: "0.04em",
};

const CELL_PAD = "5px 4px";
const MULT_CELL_PAD = "5px 2px";
const TABLE_TH_PAD = "6px 6px";
const TABLE_TH_MULT_PAD = "6px 4px";

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
      ".batch-totals-bottom-panel__actions button, .batch-totals-bottom-panel__actions input, .batch-totals-bottom-panel__actions a, .batch-totals-summary-bar__source-scroll button, .batch-totals-summary-bar__source-scroll input, .batch-totals-summary-bar__source-scroll a",
    ),
  );
}

export function BatchTotalsBottomPanel({
  multiplier,
  hasExtraBatch,
  totalGrams,
  colorScheme,
  recipe,
  values,
  complementValues,
  entityIndexes,
  sourceExpanded,
  onSourceExpandedChange,
}: {
  multiplier: number;
  hasExtraBatch: boolean;
  totalGrams: number;
  colorScheme: ColorScheme;
  recipe: BlendingRecipe;
  values: number[];
  complementValues: number[];
  entityIndexes: number[];
  sourceExpanded: boolean;
  onSourceExpandedChange: (next: boolean) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [holding, setHolding] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState(PANEL_COLLAPSED_HEIGHT_FALLBACK);
  const [maxExpandHeight, setMaxExpandHeight] = useState(PANEL_EXPANDED_HEIGHT_FALLBACK);
  const [shareActionsHeight, setShareActionsHeight] = useState(PANEL_SHARE_HEIGHT_FALLBACK);
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const actionsInnerRef = useRef<HTMLDivElement>(null);
  const compactSummaryRef = useRef<HTMLDivElement>(null);
  const lastCompactSummaryHeightRef = useRef(PANEL_COLLAPSED_HEIGHT_FALLBACK);
  const dragStartYRef = useRef<number | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

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

      const handleH = handleRef.current?.offsetHeight ?? 0;
      const footer = footerRef.current;
      const compactH = compactSummaryRef.current?.offsetHeight ?? 0;
      if (compactH > 0) {
        lastCompactSummaryHeightRef.current = compactH;
      }
      const summaryH = compactH > 0 ? compactH : lastCompactSummaryHeightRef.current;
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
    if (compactSummaryRef.current) ro.observe(compactSummaryRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [sourceExpanded, shareOpen, multiplier, hasExtraBatch, recipe.id]);

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
  }, [multiplier, hasExtraBatch, recipe.id]);

  useEffect(() => {
    if (!sourceExpanded && !shareOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (sourceExpanded) onSourceExpandedChange(false);
      else setShareOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sourceExpanded, shareOpen, onSourceExpandedChange]);

  const shareStageHeight = collapsedHeight + shareActionsHeight;
  const expandRange = Math.max(0, maxExpandHeight - shareStageHeight);

  const clampHandleDragOffset = useCallback(
    (dy: number) => {
      if (sourceExpanded) {
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
    [expandRange, shareActionsHeight, shareOpen, sourceExpanded],
  );

  const shareVisibleHeight = (() => {
    if (sourceExpanded) return shareActionsHeight;

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

  const resolvedSheetHeight = (() => {
    if (sourceExpanded) {
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
        return collapsedHeight + Math.max(0, shareActionsHeight - dragOffset);
      }
      return shareStageHeight;
    }

    if (holding || dragOffset !== 0) {
      return collapsedHeight + Math.min(shareActionsHeight, Math.max(0, -dragOffset));
    }
    return collapsedHeight;
  })();

  const isShareRevealing = shareVisibleHeight > 0 || holding;
  const isTableRevealing =
    sourceExpanded ||
    (shareOpen && (holding || dragOffset !== 0) && dragOffset < 0);

  const finishHandleDrag = useCallback(
    (clientY: number) => {
      const startY = dragStartYRef.current;
      dragStartYRef.current = null;
      setHolding(false);
      setDragOffset(0);

      if (startY == null) return;

      const dy = clientY - startY;

      if (sourceExpanded) {
        if (dy >= PANEL_DRAG_THRESHOLD_PX) {
          onSourceExpandedChange(false);
        }
        return;
      }

      if (shareOpen) {
        if (dy <= -PANEL_DRAG_THRESHOLD_PX) {
          onSourceExpandedChange(true);
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
    [shareOpen, sourceExpanded, onSourceExpandedChange],
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
        sourceExpanded ? " batch-totals-bottom-panel--source-expanded" : ""
      }${isTableRevealing ? " batch-totals-bottom-panel--table-revealing" : ""}${
        shareOpen ? " batch-totals-bottom-panel--share-open" : ""
      }${isShareRevealing ? " batch-totals-bottom-panel--share-revealing" : ""}${
        holding ? " batch-totals-bottom-panel--holding" : ""
      }`}
    >
      <div
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

          <div
            ref={footerRef}
            className={`batch-totals-bottom-panel__footer shrink-0 min-h-0${
              isTableRevealing ? " batch-totals-bottom-panel__footer--table-revealing" : ""
            }`}
          >
            <div className="batch-totals-bottom-panel__card-region app-gutter-x">
              <BatchTotalsSummaryBar
                multiplier={multiplier}
                hasExtraBatch={hasExtraBatch}
                totalGrams={totalGrams}
                colorScheme={colorScheme}
                recipe={recipe}
                values={values}
                complementValues={complementValues}
                entityIndexes={entityIndexes}
                sourceExpanded={sourceExpanded}
                isTableRevealing={isTableRevealing}
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
                  complementValues={complementValues}
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
  complementValues: number[];
  entityIndexes: number[];
  multiplier: number;
  onMultiplierChange: (next: number) => void;
  onComplementChange: (next: number[]) => void;
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
  fontSize: "calc(var(--text-recipe-unit) - 1px)",
  letterSpacing: "0.03em",
  fontWeight: 600,
  color: cv.text.muted,
  lineHeight: 1.2,
  textTransform: "capitalize",
};

function ItemNameWithMeta({
  id,
  color,
  metaLabel,
}: {
  id: string;
  color: string;
  metaLabel?: string;
}) {
  return (
    <div className="min-w-0 flex items-baseline gap-1">
      <span
        className="truncate shrink-0"
        style={{
          fontSize: "var(--text-card-name)",
          letterSpacing: "0.18em",
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
        fontSize: "var(--text-totals-caption)",
        color: cv.text.muted,
        marginTop: 3,
        opacity: 0.72,
        lineHeight: 1.15,
      }}
    >
      {formatMixAmount(grams, isKg)}
      <span style={{ fontWeight: 500 }}>{unit}</span>
      <span>/batch</span>
    </div>
  );
}

function TableOpSeparator({ symbol }: { symbol: "+" | "=" }) {
  return (
    <div
      className="grid w-full min-w-0 shrink-0 items-center"
      style={{ gridTemplateColumns: TABLE_COLS, height: "var(--totals-op-sep-h, 22px)" }}
      aria-hidden
    >
      <span />
      <span
        className="flex items-center justify-center tabular-nums"
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: "var(--totals-op-sep-font-size, 20px)",
          fontWeight: 400,
          color: cv.text.primary,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {symbol}
      </span>
      <span />
    </div>
  );
}

function TablePlusSeparator() {
  return <TableOpSeparator symbol="+" />;
}

function TableEqualsSeparator() {
  return <TableOpSeparator symbol="=" />;
}

const ENTITY_TOTAL_COL_ITEM = "56%";
const ENTITY_TOTAL_COL_TOTAL = "44%";

function BatchTotalsEntityTotalTable({
  recipe,
  values,
  complementValues,
  entityIndexes,
  multiplier,
  colorScheme,
  hasExtraBatch,
}: {
  recipe: BlendingRecipe;
  values: number[];
  complementValues: number[];
  entityIndexes: number[];
  multiplier: number;
  colorScheme: ColorScheme;
  hasExtraBatch: boolean;
}) {
  const amountColor = entityValueColor(true, colorScheme);
  const ingredientRows = entityIndexes.filter((i) => i !== 0);
  const batchLabel = `${multiplier} ${multiplier === 1 ? "batch" : "batches"}`;

  return (
    <div className="min-w-0 w-full" aria-readonly>
      {hasExtraBatch ? (
        <p
          className="shrink-0 min-w-0 truncate"
          style={{
            ...SECTION_HEADER,
            margin: "0 0 8px",
            padding: "0 2px",
          }}
        >
          {batchLabel} + extra batch
        </p>
      ) : null}
      <table className="w-full min-w-0 border-collapse" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: ENTITY_TOTAL_COL_ITEM }} />
          <col style={{ width: ENTITY_TOTAL_COL_TOTAL }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: TABLE_BORDER }}>
            <th scope="col" className="text-left" style={thCellItemStyle(bt.cardHeaderBackground, TH_TEXT)}>
              Item
            </th>
            <th scope="col" className="text-right" style={thCellTotalStyle(bt.cardHeaderBackground, TH_TEXT)}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {ingredientRows.map((pi) => {
            const p = MIX_PARAMS[pi];
            const metaLabel = getEntityMetaLabel(recipe, p.id);
            const totalGrams = batchIngredientTotalGrams(values, complementValues, pi, multiplier);

            return (
              <tr key={p.id} style={{ borderBottom: TABLE_BORDER }}>
                <th scope="row" className="text-left align-middle font-normal" style={cellItemStyle()}>
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
                    ...TABLE_TEXT,
                    fontSize: "var(--text-totals-sum)",
                    color: amountColor,
                    fontWeight: 600,
                    lineHeight: 1.1,
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

function BatchTotalsSourceTables({
  recipe,
  values,
  complementValues,
  entityIndexes,
  multiplier,
  colorScheme,
  hasExtraBatch,
  onMultiplierChange,
  onAddExtraBatch,
  onEditExtraBatch,
  onRemoveExtraBatch,
}: {
  recipe: BlendingRecipe;
  values: number[];
  complementValues: number[];
  entityIndexes: number[];
  multiplier: number;
  colorScheme: ColorScheme;
  hasExtraBatch: boolean;
  onMultiplierChange: (next: number) => void;
  onAddExtraBatch: () => void;
  onEditExtraBatch: () => void;
  onRemoveExtraBatch: () => void;
}) {
  const amountColor = entityValueColor(true, colorScheme);
  const ingredientRows = entityIndexes.filter((i) => i !== 0);

  const batchesHeader = (
    <div
      className="shrink-0 grid items-center min-w-0 w-full"
      style={{
        ...cardHeaderStyle("batches"),
        gridTemplateColumns: TABLE_COLS,
      }}
    >
      <p style={sectionTitleStyle()}>Batches</p>
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
      <div className="flex items-center justify-end" style={{ padding: "0 var(--totals-header-cell-pad-x)" }}>
        <IconHeaderButton
          label="Reset batch count"
          onClick={() => onMultiplierChange(1)}
          disabled={multiplier <= 1}
        >
          <ResetIcon size={HEADER_ICON_SIZE} />
        </IconHeaderButton>
      </div>
    </div>
  );

  const batchesBlock = (
    <div
      className="w-full min-w-0 shrink-0 rounded-xl overflow-hidden"
      style={{ border: bt.batchesCardBorder }}
    >
      {batchesHeader}

      <div
        style={{
          background: bt.batchesCardBackground,
          boxShadow: bt.insetHighlight,
        }}
      >
        <table className="w-full min-w-0 border-collapse" style={{ tableLayout: "fixed" }}>
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
            {ingredientRows.map((pi) => {
              const p = MIX_PARAMS[pi];
              const metaLabel = getEntityMetaLabel(recipe, p.id);
              const batchTotalGrams = values[pi] * multiplier;

              return (
                <tr key={p.id} style={{ borderBottom: TABLE_BORDER }}>
                  <th scope="row" className="text-left align-middle font-normal" style={cellItemStyle()}>
                    <div className="min-w-0">
                      <ItemNameWithMeta
                        id={p.id}
                        color={entityAccentColor(p.id, colorScheme)}
                        metaLabel={metaLabel}
                      />
                      <PerBatchRow grams={values[pi]} isKg={p.isKg} />
                    </div>
                  </th>
                  <td className="text-center align-middle" style={cellMultStyle()}>
                    <MultCell value={multiplier} />
                  </td>
                  <td
                    className="text-right align-middle tabular-nums whitespace-nowrap"
                    style={cellTotalStyle({
                      ...TABLE_TEXT,
                      fontSize: "var(--text-totals-sum)",
                      color: amountColor,
                      fontWeight: 600,
                      lineHeight: 1.1,
                    })}
                  >
                    <AmountCell grams={batchTotalGrams} isKg={p.isKg} colorScheme={colorScheme} />
                  </td>
                </tr>
              );
            })}
            {(() => {
              const pi = 0;
              const p = MIX_PARAMS[pi];
              const batchTotalGrams = values[pi] * multiplier;

              return (
                <tr style={{ borderTop: TABLE_BORDER }}>
                  <th scope="row" className="text-left align-middle font-normal" style={cellItemStyle()}>
                    <div className="min-w-0">
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
                      <PerBatchRow grams={values[pi]} isKg={p.isKg} />
                    </div>
                  </th>
                  <td className="text-center align-middle" style={cellMultStyle()}>
                    <MultCell value={multiplier} />
                  </td>
                  <td
                    className="text-right align-middle tabular-nums whitespace-nowrap"
                    style={cellTotalStyle({
                      ...TABLE_TEXT,
                      fontSize: "var(--text-totals-sum)",
                      color: amountColor,
                      fontWeight: 700,
                      lineHeight: 1.1,
                    })}
                  >
                    <AmountCell grams={batchTotalGrams} isKg={p.isKg} colorScheme={colorScheme} />
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );

  const extraBatchBlock = (
    <div
      className="w-full min-w-0 shrink-0 rounded-xl overflow-hidden"
      style={{
        background: hasExtraBatch ? undefined : bt.emptyCardBackground,
        border: hasExtraBatch ? bt.extraBatchBorder : bt.extraBatchDashedBorder,
      }}
    >
      {hasExtraBatch ? (
        <>
          <div className="flex items-center justify-between gap-2 min-w-0 w-full" style={cardHeaderStyle("extra")}>
            <p style={sectionTitleStyle(cv.extraBatch.label)}>Extra batch</p>
            <div
              className="flex items-center shrink-0"
              style={{ gap: "var(--totals-header-action-gap)", padding: "0 var(--totals-header-cell-pad-x)" }}
            >
              <IconHeaderButton label="Edit extra batch" onClick={onEditExtraBatch} color={cv.extraBatch.label}>
                <RenameIcon size={HEADER_ICON_SIZE} />
              </IconHeaderButton>
              <IconHeaderButton label="Remove extra batch" onClick={onRemoveExtraBatch} color={cv.text.muted}>
                <DeleteIcon size={HEADER_ICON_SIZE} />
              </IconHeaderButton>
            </div>
          </div>
          <div style={{ background: bt.extraBatchBackground }}>
            <table className="w-full min-w-0 border-collapse" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: COL_ITEM }} />
                <col style={{ width: COL_MULT }} />
                <col style={{ width: COL_TOTAL }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: TABLE_BORDER }}>
                  <th scope="col" className="text-left" style={thCellItemStyle(bt.extraTableThBackground, TH_TEXT)}>
                    Item
                  </th>
                  <th scope="col" className="text-center" style={thCellMultStyle(bt.extraTableThBackground, TH_TEXT)}>
                    ×
                  </th>
                  <th scope="col" className="text-right" style={thCellTotalStyle(bt.extraTableThBackground, TH_TEXT)}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {ingredientRows.map((pi) => {
                  const p = MIX_PARAMS[pi];
                  const metaLabel = getEntityMetaLabel(recipe, p.id);

                  return (
                    <tr key={`extra-${p.id}`} style={{ borderBottom: TABLE_BORDER }}>
                      <th scope="row" className="text-left align-middle font-normal" style={cellItemStyle()}>
                        <div className="min-w-0">
                          <ItemNameWithMeta
                            id={p.id}
                            color={entityAccentColor(p.id, colorScheme)}
                            metaLabel={metaLabel}
                          />
                          <PerBatchRow grams={complementValues[pi]} isKg={p.isKg} />
                        </div>
                      </th>
                      <td className="text-center align-middle" style={cellMultStyle()}>
                        <MultCell value={1} />
                      </td>
                      <td
                        className="text-right align-middle tabular-nums whitespace-nowrap"
                        style={cellTotalStyle({
                          ...TABLE_TEXT,
                          fontSize: "var(--text-totals-sum)",
                          color: amountColor,
                          fontWeight: 600,
                          lineHeight: 1.1,
                        })}
                      >
                        <AmountCell grams={complementValues[pi]} isKg={p.isKg} colorScheme={colorScheme} />
                      </td>
                    </tr>
                  );
                })}
                {(() => {
                  const pi = 0;
                  const p = MIX_PARAMS[pi];

                  return (
                    <tr style={{ borderTop: TABLE_BORDER }}>
                      <th scope="row" className="text-left align-middle font-normal" style={cellItemStyle()}>
                        <div className="min-w-0">
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
                          <PerBatchRow grams={complementValues[pi]} isKg={p.isKg} />
                        </div>
                      </th>
                      <td className="text-center align-middle" style={cellMultStyle()}>
                        <MultCell value={1} />
                      </td>
                      <td
                        className="text-right align-middle tabular-nums whitespace-nowrap"
                        style={cellTotalStyle({
                          ...TABLE_TEXT,
                          fontSize: "var(--text-totals-sum)",
                          color: amountColor,
                          fontWeight: 700,
                          lineHeight: 1.1,
                        })}
                      >
                        <AmountCell grams={complementValues[pi]} isKg={p.isKg} colorScheme={colorScheme} />
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onAddExtraBatch}
          className="w-full flex items-center justify-center text-center"
          style={{
            cursor: "pointer",
            background: "transparent",
            border: 0,
            minHeight: "var(--action-row-h)",
            padding: "0 10px",
            fontSize: "var(--text-totals-table)",
            letterSpacing: "0.12em",
            fontWeight: 600,
            color: cv.extraBatch.label,
            lineHeight: 1.3,
            opacity: 0.9,
          }}
        >
          + Add extra batch
        </button>
      )}
    </div>
  );

  return (
    <>
      {batchesBlock}
      <div className="flex-1 min-h-0 min-w-0 flex flex-col justify-evenly">
        <TablePlusSeparator />
        {extraBatchBlock}
        <TableEqualsSeparator />
      </div>
    </>
  );
}

function BatchTotalsSummaryBar({
  multiplier,
  hasExtraBatch,
  totalGrams,
  colorScheme,
  recipe,
  values,
  complementValues,
  entityIndexes,
  sourceExpanded,
  isTableRevealing,
  compactSummaryRef,
}: {
  multiplier: number;
  hasExtraBatch: boolean;
  totalGrams: number;
  colorScheme: ColorScheme;
  recipe: BlendingRecipe;
  values: number[];
  complementValues: number[];
  entityIndexes: number[];
  sourceExpanded: boolean;
  isTableRevealing: boolean;
  compactSummaryRef: RefObject<HTMLDivElement | null>;
}) {
  const totalParam = MIX_PARAMS[0];
  const amountColor = entityValueColor(true, colorScheme);
  const showTable = sourceExpanded || isTableRevealing;

  const totalRow = (
    <div
      className={`text-right min-w-0 flex items-center justify-end gap-2 shrink-0 batch-totals-summary-bar__total${
        showTable ? " batch-totals-summary-bar__total--footer" : ""
      }`}
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
    <div
      className={`min-w-0 w-full batch-totals-summary-bar${
        hasExtraBatch ? " batch-totals-summary-bar--with-extra" : ""
      }${showTable ? " batch-totals-summary-bar--expanded" : ""}`}
    >
      <div
        className="batch-totals-summary-bar__card w-full min-w-0 rounded-xl overflow-hidden flex flex-col min-h-0"
        style={{
          border: bt.batchesCardBorder,
          background: bt.batchesCardBackground,
          boxShadow: bt.insetHighlight,
        }}
      >
        {showTable ? (
          <>
            <div
              className="batch-totals-summary-bar__source-scroll batch-totals-summary-bar__source-scroll--readonly flex-1 min-h-0 overflow-y-auto overscroll-contain"
              aria-label="Total consumption by entity"
            >
              <BatchTotalsEntityTotalTable
                recipe={recipe}
                values={values}
                complementValues={complementValues}
                entityIndexes={entityIndexes}
                multiplier={multiplier}
                colorScheme={colorScheme}
                hasExtraBatch={hasExtraBatch}
              />
            </div>
            {totalRow}
          </>
        ) : (
          <div
            ref={compactSummaryRef}
            className="grid items-center min-w-0 w-full batch-totals-summary-bar__grid batch-totals-summary-bar__compact"
            style={{ gridTemplateColumns: SUMMARY_COLS }}
          >
            <div className="batch-totals-summary-bar__batch-rows min-w-0">
              <div className="batch-totals-summary-bar__batch-row">
                <span style={sectionTitleStyle()}>Batches</span>
                <MultCell value={multiplier} />
              </div>
              {hasExtraBatch ? (
                <div className="batch-totals-summary-bar__batch-row">
                  <span style={sectionTitleStyle(cv.extraBatch.label)} title="Extra batch">
                    Extra batch
                  </span>
                  <MultCell value={1} />
                </div>
              ) : null}
            </div>
            {totalRow}
          </div>
        )}
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
  complementValues,
  entityIndexes,
  multiplier,
  onMultiplierChange,
  onComplementChange,
  sandType,
  totalsPanelExpanded = false,
  onTotalsPanelExpandedChange,
}: BatchTotalsScreenProps) {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const shellCompact = useAppShellCompact();
  const [extraBatchSheetOpen, setExtraBatchSheetOpen] = useState(false);
  const [sheetPortal, setSheetPortal] = useState<HTMLElement | null>(null);
  const ingredientRows = entityIndexes.filter((i) => i !== 0);
  const batchTableRowCount = ingredientRows.length + 1;
  const denseTable = batchTableRowCount > 4;
  const compactSummary = shellCompact && denseTable;
  const hasExtraBatch = hasComplementAmounts(complementValues);
  const grandTotalGrams = batchIngredientTotalGrams(
    values,
    complementValues,
    0,
    multiplier,
  );

  const handleRemoveExtraBatch = () => {
    onComplementChange(emptyComplementValues());
  };

  useEffect(() => {
    setSheetPortal(document.querySelector(".app-frame"));
  }, []);

  return (
    <div
      className={`batch-totals-screen flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden relative${compactSummary ? " batch-totals-screen--compact-summary" : !shellCompact ? " batch-totals-screen--tall" : ""}${totalsPanelExpanded ? " batch-totals-screen--panel-expanded" : ""}`}
      data-dense-table={denseTable ? "" : undefined}
    >
      <div
        className="batch-totals-screen__main app-gutter-x flex flex-col"
        style={{ paddingTop: compactSummary ? 0 : "var(--recipe-zone-pt)" }}
      >
        <div className="batch-totals-scroll-panel flex flex-col">
          <div className="flex min-h-full flex-col">
            <BatchTotalsSourceTables
              recipe={recipe}
              values={values}
              complementValues={complementValues}
              entityIndexes={entityIndexes}
              multiplier={multiplier}
              colorScheme={colorScheme}
              hasExtraBatch={hasExtraBatch}
              onMultiplierChange={onMultiplierChange}
              onAddExtraBatch={() => setExtraBatchSheetOpen(true)}
              onEditExtraBatch={() => setExtraBatchSheetOpen(true)}
              onRemoveExtraBatch={handleRemoveExtraBatch}
            />
          </div>
        </div>
      </div>

      <BatchTotalsBottomPanel
        multiplier={multiplier}
        hasExtraBatch={hasExtraBatch}
        totalGrams={grandTotalGrams}
        colorScheme={colorScheme}
        recipe={recipe}
        values={values}
        complementValues={complementValues}
        entityIndexes={entityIndexes}
        sourceExpanded={totalsPanelExpanded}
        onSourceExpandedChange={onTotalsPanelExpandedChange ?? (() => {})}
      />

      {sheetPortal
        ? createPortal(
            <MixerInputSheet
              open={extraBatchSheetOpen}
              onOpenChange={setExtraBatchSheetOpen}
              title="Extra batch"
              subtitle="One custom batch — added on top of your batches"
              recipe={recipe}
              values={complementValues}
              entityIndexes={entityIndexes}
              bucketSelection="none"
              sandType={sandType}
              onApply={onComplementChange}
            />,
            sheetPortal,
          )
        : null}
    </div>
  );
}
