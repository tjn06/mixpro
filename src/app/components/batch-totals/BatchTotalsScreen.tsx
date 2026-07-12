import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { formatMixAmount, MIX_PARAMS } from "../../domain/mix/entities";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { getEntityMetaLabel, hasComplementAmounts, emptyComplementValues } from "../../domain/recipe/calc";
import { batchIngredientTotalGrams } from "../../domain/batch-totals/totals";
import { BatchTotalsShareBar } from "./BatchTotalsShareBar";
import { CARD_NAME_WEIGHT } from "../../presentation/entityCardStyles";
import { MixerInputSheet } from "../sheets/MixerInputSheet";
import { DeleteIcon, RenameIcon, ResetIcon } from "../shared/ActionIcons";
import type { SandType } from "../../domain/mix/volume";
import { useAppShellCompact } from "../../hooks/useAppShellCompact";

import { theme } from "../../../theme";

const { colors: c, borders: b, surfaces: s } = theme;

const TABLE_BORDER = b.table;

const SECTION_HEADER: CSSProperties = {
  fontSize: "var(--text-totals-caption)",
  color: c.muted,
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
  color: c.muted,
  textTransform: "uppercase",
  lineHeight: 1.15,
};

const MULT_TEXT: CSSProperties = {
  ...TABLE_TEXT,
  fontSize: "var(--text-totals-caption)",
  fontWeight: 600,
  color: c.muted,
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
    background: variant === "extra" ? s.extraCardHeaderBg : s.cardHeaderBg,
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
    background: s.cardHeaderBtnBg,
    border: b.cardHeaderBtn,
    color: disabled ? c.muted : color ?? c.muted,
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

export interface BatchTotalsScreenProps {
  recipe: BlendingRecipe;
  values: number[];
  complementValues: number[];
  entityIndexes: number[];
  multiplier: number;
  onMultiplierChange: (next: number) => void;
  onComplementChange: (next: number[]) => void;
  sandType: SandType;
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

function AmountCell({ grams, isKg }: { grams: number; isKg: boolean }) {
  const unit = isKg ? "kg" : "g";
  return (
    <span className="tabular-nums whitespace-nowrap">
      {formatMixAmount(grams, isKg)}
      <span
        style={{
          color: c.muted,
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
  color: c.muted,
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
        color: c.muted,
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
          color: c.title,
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

function SummaryPlus() {
  return (
    <span
      className="tabular-nums shrink-0"
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: "var(--totals-mult-value-size, 20px)",
        fontWeight: 400,
        color: c.title,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
      aria-hidden
    >
      +
    </span>
  );
}

function BatchTotalsSummaryBar({
  multiplier,
  hasExtraBatch,
  totalGrams,
}: {
  multiplier: number;
  hasExtraBatch: boolean;
  totalGrams: number;
}) {
  const totalParam = MIX_PARAMS[0];

  return (
    <div className="shrink-0 min-w-0 w-full">
      <div
        className="w-full min-w-0 rounded-xl overflow-hidden"
        style={{
          border: b.batchesCard,
          background: s.batchesCardBg,
          boxShadow: s.insetHighlight,
        }}
      >
        <div
          className="grid items-center min-w-0 w-full"
          style={{ gridTemplateColumns: SUMMARY_COLS }}
        >
          <div
            className="min-w-0 flex items-center flex-nowrap"
            style={{ ...cellItemStyle({ borderRight: "none" }), gap: "4px 6px" }}
          >
            <span style={sectionTitleStyle()}>Batches</span>
            <MultCell value={multiplier} />
            {hasExtraBatch ? (
              <>
                <SummaryPlus />
                <span
                  style={sectionTitleStyle(c.extraBatchAccent)}
                  title="Extra batch"
                >
                  EX. BCH
                </span>
                <MultCell value={1} />
              </>
            ) : null}
          </div>
          <div
            className="text-right min-w-0 flex items-baseline justify-end gap-2 shrink-0"
            style={cellTotalStyle({
              ...TABLE_TEXT,
              fontSize: "var(--text-totals-sum)",
              color: c.value,
              fontWeight: 700,
              lineHeight: 1.1,
            })}
          >
            <span
              className="truncate shrink-0"
              style={{
                fontSize: "var(--text-card-name)",
                letterSpacing: "0.18em",
                fontWeight: CARD_NAME_WEIGHT,
                color: totalParam.color,
                lineHeight: 1.15,
              }}
            >
              {totalParam.id}
            </span>
            <AmountCell grams={totalGrams} isKg={totalParam.isKg} />
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
  color = c.muted,
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
}: BatchTotalsScreenProps) {
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
      className={`batch-totals-screen flex-1 min-h-0 min-w-0 flex flex-col overflow-x-hidden${compactSummary ? " batch-totals-screen--compact-summary" : !shellCompact ? " batch-totals-screen--tall" : ""}`}
      data-dense-table={denseTable ? "" : undefined}
    >
      <div
        className="flex-1 min-h-0 min-w-0 app-gutter-x flex flex-col"
        style={{ paddingTop: compactSummary ? 0 : "var(--recipe-zone-pt)" }}
      >
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-x-auto overflow-y-auto overscroll-contain batch-totals-scroll-panel">
          <div className="flex min-h-full flex-col">
            <div
              className="w-full min-w-0 shrink-0 rounded-xl overflow-hidden"
              style={{ border: b.batchesCard }}
            >
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
                      color: c.title,
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

            <div
              style={{
                background: s.batchesCardBg,
                boxShadow: s.insetHighlight,
              }}
            >
            <table
              className="w-full min-w-0 border-collapse"
              style={{ tableLayout: "fixed" }}
            >
            <colgroup>
              <col style={{ width: COL_ITEM }} />
              <col style={{ width: COL_MULT }} />
              <col style={{ width: COL_TOTAL }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: TABLE_BORDER }}>
                <th scope="col" className="text-left" style={thCellItemStyle(s.tableThBg, TH_TEXT)}>
                  Item
                </th>
                <th scope="col" className="text-center" style={thCellMultStyle(s.tableThBg, TH_TEXT)}>
                  ×
                </th>
                <th scope="col" className="text-right" style={thCellTotalStyle(s.tableThBg, TH_TEXT)}>
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
                    <th
                      scope="row"
                      className="text-left align-middle font-normal"
                      style={cellItemStyle()}
                    >
                      <div className="min-w-0">
                        <ItemNameWithMeta id={p.id} color={p.color} metaLabel={metaLabel} />
                        <PerBatchRow grams={values[pi]} isKg={p.isKg} />
                      </div>
                    </th>
                    <td
                      className="text-center align-middle"
                      style={cellMultStyle()}
                    >
                      <MultCell value={multiplier} />
                    </td>
                    <td
                      className="text-right align-middle tabular-nums whitespace-nowrap"
                      style={cellTotalStyle({
                        ...TABLE_TEXT,
                        fontSize: "var(--text-totals-sum)",
                        color: c.value,
                        fontWeight: 600,
                        lineHeight: 1.1,
                      })}
                    >
                      <AmountCell grams={batchTotalGrams} isKg={p.isKg} />
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
                    <th
                      scope="row"
                      className="text-left align-middle font-normal"
                      style={cellItemStyle()}
                    >
                      <div className="min-w-0">
                        <span
                          className="block truncate"
                          style={{
                            fontSize: "var(--text-card-name)",
                            letterSpacing: "0.18em",
                            fontWeight: CARD_NAME_WEIGHT,
                            color: p.color,
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
                        color: c.value,
                        fontWeight: 700,
                        lineHeight: 1.1,
                      })}
                    >
                      <AmountCell grams={batchTotalGrams} isKg={p.isKg} />
                    </td>
                  </tr>
                );
              })()}
            </tbody>
            </table>
            </div>
          </div>

          <div className="flex-1 min-h-0 min-w-0 flex flex-col justify-evenly">
            <TablePlusSeparator />

            <div
              className="w-full min-w-0 shrink-0 rounded-xl overflow-hidden"
              style={{
                background: hasExtraBatch ? undefined : s.emptyCardBg,
                border: hasExtraBatch ? b.extraBatch : b.extraBatchDashed,
              }}
            >
            {hasExtraBatch ? (
              <>
                <div
                  className="flex items-center justify-between gap-2 min-w-0 w-full"
                  style={cardHeaderStyle("extra")}
                >
                  <p style={sectionTitleStyle(c.extraBatchAccent)}>Extra batch</p>
                  <div
                    className="flex items-center shrink-0"
                    style={{ gap: "var(--totals-header-action-gap)", padding: "0 var(--totals-header-cell-pad-x)" }}
                  >
                    <IconHeaderButton
                      label="Edit extra batch"
                      onClick={() => setExtraBatchSheetOpen(true)}
                      color={c.extraBatchAccent}
                    >
                      <RenameIcon size={HEADER_ICON_SIZE} />
                    </IconHeaderButton>
                    <IconHeaderButton
                      label="Remove extra batch"
                      onClick={handleRemoveExtraBatch}
                      color={c.muted}
                    >
                      <DeleteIcon size={HEADER_ICON_SIZE} />
                    </IconHeaderButton>
                  </div>
                </div>
                <div style={{ background: s.extraBatchBg }}>
                <table
                  className="w-full min-w-0 border-collapse"
                  style={{ tableLayout: "fixed" }}
                >
                  <colgroup>
                    <col style={{ width: COL_ITEM }} />
                    <col style={{ width: COL_MULT }} />
                    <col style={{ width: COL_TOTAL }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: TABLE_BORDER }}>
                      <th scope="col" className="text-left" style={thCellItemStyle(s.extraTableThBg, TH_TEXT)}>
                        Item
                      </th>
                      <th scope="col" className="text-center" style={thCellMultStyle(s.extraTableThBg, TH_TEXT)}>
                        ×
                      </th>
                      <th scope="col" className="text-right" style={thCellTotalStyle(s.extraTableThBg, TH_TEXT)}>
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
                          <th
                            scope="row"
                            className="text-left align-middle font-normal"
                            style={cellItemStyle()}
                          >
                            <div className="min-w-0">
                              <ItemNameWithMeta id={p.id} color={p.color} metaLabel={metaLabel} />
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
                              color: c.value,
                              fontWeight: 600,
                              lineHeight: 1.1,
                            })}
                          >
                            <AmountCell grams={complementValues[pi]} isKg={p.isKg} />
                          </td>
                        </tr>
                      );
                    })}
                    {(() => {
                      const pi = 0;
                      const p = MIX_PARAMS[pi];

                      return (
                        <tr style={{ borderTop: TABLE_BORDER }}>
                          <th
                            scope="row"
                            className="text-left align-middle font-normal"
                            style={cellItemStyle()}
                          >
                            <div className="min-w-0">
                              <span
                                className="block truncate"
                                style={{
                                  fontSize: "var(--text-card-name)",
                                  letterSpacing: "0.18em",
                                  fontWeight: CARD_NAME_WEIGHT,
                                  color: p.color,
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
                              color: c.value,
                              fontWeight: 700,
                              lineHeight: 1.1,
                            })}
                          >
                            <AmountCell grams={complementValues[pi]} isKg={p.isKg} />
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
                onClick={() => setExtraBatchSheetOpen(true)}
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
                  color: c.extraBatchAccent,
                  lineHeight: 1.3,
                  opacity: 0.9,
                }}
              >
                + Add extra batch
              </button>
            )}
            </div>

            <TableEqualsSeparator />
          </div>
          </div>
        </div>
      </div>

      <div
        className="shrink-0 app-gutter-x flex flex-col min-w-0 w-full"
        style={{
          gap: 8,
          paddingBottom: "var(--space-4)",
        }}
      >
        <BatchTotalsSummaryBar
          multiplier={multiplier}
          hasExtraBatch={hasExtraBatch}
          totalGrams={grandTotalGrams}
        />

        <BatchTotalsShareBar
          recipe={recipe}
          values={values}
          complementValues={complementValues}
          entityIndexes={entityIndexes}
          multiplier={multiplier}
        />
      </div>

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
