import type { CSSProperties, ReactNode } from "react";
import { formatMixAmount, MIX_PARAMS } from "../../domain/mix/entities";
import { getEntityMetaLabel, recipeIngredientIndexes } from "../../domain/recipe/calc";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { gramsFromSlotValues } from "../../saved-batch-totals/batches";
import type { SessionBatchItem } from "../../sessions/types";
import {
  CARD_NAME_WEIGHT,
  entityValueColor,
} from "../../presentation/entityCardStyles";
import { entityAccentColor } from "../../presentation/entityAccent";
import { DeleteIcon, RenameIcon } from "../shared/ActionIcons";
import type { ColorScheme } from "../../../theme/appearance";
import { cv } from "../../ui/tokens";
import { sessionBatchTotalGrams } from "../../domain/sessions/totals";

const bt = cv.batchTotals;
const HEADER_ICON_SIZE = 14;

const TABLE_TEXT: CSSProperties = {
  fontSize: "var(--text-totals-table)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  lineHeight: 1.35,
};

const TH_TEXT: CSSProperties = {
  ...TABLE_TEXT,
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

const COL_ITEM = "46%";
const COL_MULT = "14%";
const COL_TOTAL = "40%";
const TABLE_COLS = `${COL_ITEM} ${COL_MULT} ${COL_TOTAL}`;

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

function StepButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const symbol = label === "Decrease batch count" ? "−" : "+";
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="batch-totals-card-header-btn flex items-center justify-center shrink-0 transition-colors duration-150 active:scale-95"
      style={{
        ...cardRoundBtnStyle(disabled),
        fontSize: "var(--totals-step-font-size)",
        fontWeight: 300,
        lineHeight: 1,
      }}
    >
      {symbol}
    </button>
  );
}

function IconHeaderButton({
  label,
  onClick,
  color = cv.text.muted,
  children,
}: {
  label: string;
  onClick: () => void;
  color?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="batch-totals-card-header-btn flex items-center justify-center shrink-0 transition-colors duration-150 active:scale-95"
      style={cardRoundBtnStyle(false, color)}
    >
      {children}
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

export function SessionMixCard({
  batch,
  recipe,
  colorScheme,
  expanded,
  onExpandedChange,
  onMultiplierChange,
  onEdit,
  onRemove,
}: {
  batch: SessionBatchItem;
  recipe: BlendingRecipe | null;
  colorScheme: ColorScheme;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  onMultiplierChange: (next: number) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const values = gramsFromSlotValues(batch.values);
  const mult = Math.max(1, batch.multiplier);
  const totalGrams = sessionBatchTotalGrams(batch);
  const amountColor = entityValueColor(true, colorScheme);
  const totalParam = MIX_PARAMS[0];
  const ingredientIndexes = recipe
    ? recipeIngredientIndexes(recipe)
    : [0, 1, 2, 3, 4].filter((i) => (values[i] ?? 0) > 0 || i === 0);
  const batchRowIndexes = [
    ...ingredientIndexes.filter((i) => i !== 0),
    0,
  ];

  return (
    <div className="batch-totals-source-card session-mix-card w-full min-w-0 shrink-0 overflow-hidden">
      <div
        className="shrink-0 grid items-center min-w-0 w-full session-mix-card__header"
        style={{
          padding:
            "var(--totals-card-header-py) var(--batch-totals-content-gutter, var(--totals-card-header-px))",
          background: bt.cardHeaderBackground,
          minHeight: "var(--totals-card-header-min-h, var(--totals-header-icon-btn))",
          gridTemplateColumns: TABLE_COLS,
        }}
      >
        <button
          type="button"
          className="session-mix-card__title-btn min-w-0 text-left"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
        >
          <p
            className="truncate"
            style={{
              fontSize: "var(--text-totals-table)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              lineHeight: 1.2,
              textTransform: "uppercase",
              margin: 0,
              color: cv.text.primary,
            }}
          >
            {batch.name}
          </p>
          {!expanded ? (
            <span
              className="tabular-nums whitespace-nowrap"
              style={{
                ...TABLE_TEXT,
                fontSize: "var(--text-totals-sum)",
                color: amountColor,
                fontWeight: 700,
                lineHeight: 1.2,
                marginTop: 4,
                display: "block",
              }}
            >
              <AmountCell
                grams={totalGrams}
                isKg={totalParam.isKg}
                colorScheme={colorScheme}
              />
            </span>
          ) : null}
        </button>

        <div className="flex items-center justify-center" style={{ padding: "0 2px", position: "relative" }}>
          <div
            className="relative flex items-center justify-center"
            style={{ minWidth: 32, height: "var(--totals-header-icon-btn)" }}
          >
            <div
              className="absolute"
              style={{ right: "100%", marginRight: "var(--totals-multiplier-row-gap, 12px)" }}
            >
              <StepButton
                label="Decrease batch count"
                onClick={() => onMultiplierChange(Math.max(1, mult - 1))}
                disabled={mult <= 1}
              />
            </div>
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
              {mult}
            </p>
            <div
              className="absolute"
              style={{ left: "100%", marginLeft: "var(--totals-multiplier-row-gap, 12px)" }}
            >
              <StepButton
                label="Increase batch count"
                onClick={() => onMultiplierChange(Math.min(999, mult + 1))}
                disabled={mult >= 999}
              />
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end shrink-0"
          style={{
            gap: "var(--totals-header-action-gap)",
            padding: "0 var(--totals-header-cell-pad-x)",
          }}
        >
          <IconHeaderButton label={`Edit ${batch.name}`} onClick={onEdit}>
            <RenameIcon size={HEADER_ICON_SIZE} />
          </IconHeaderButton>
          <IconHeaderButton
            label={`Remove ${batch.name}`}
            onClick={onRemove}
            color={cv.text.muted}
          >
            <DeleteIcon size={HEADER_ICON_SIZE} />
          </IconHeaderButton>
        </div>
      </div>

      {expanded ? (
        <div className="batch-totals-source-card__body">
          <table
            className="batch-totals-source-table w-full min-w-0 border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: COL_ITEM }} />
              <col style={{ width: COL_MULT }} />
              <col style={{ width: COL_TOTAL }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="text-left" style={{ ...TH_TEXT, padding: "var(--totals-th-py) var(--totals-th-px)" }}>
                  Item
                </th>
                <th scope="col" className="text-center" style={{ ...TH_TEXT, padding: "var(--totals-th-py) var(--totals-th-mult-px, 8px)" }}>
                  ×
                </th>
                <th scope="col" className="text-right" style={{ ...TH_TEXT, padding: "var(--totals-th-py) var(--totals-th-px)" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {batchRowIndexes.map((pi) => {
                const p = MIX_PARAMS[pi];
                const isTotal = pi === 0;
                const perBatch = values[pi] ?? 0;
                const lineTotal = perBatch * mult;
                const metaLabel =
                  !isTotal && recipe ? getEntityMetaLabel(recipe, p.id) : undefined;

                return (
                  <tr key={p.id} {...(isTotal ? { "data-total-row": true } : undefined)}>
                    <th
                      scope="row"
                      className="text-left align-middle font-normal"
                      style={{
                        paddingBlock: "var(--totals-cell-py)",
                        paddingInlineEnd: "var(--totals-cell-px)",
                        ...(isTotal
                          ? { paddingTop: "calc(var(--totals-cell-py) + 6px)" }
                          : null),
                      }}
                    >
                      <div className="min-w-0">
                        <div className="min-w-0 flex items-baseline gap-1">
                          <span
                            className="truncate shrink-0"
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
                          {metaLabel ? (
                            <span
                              className="truncate min-w-0"
                              style={{
                                fontSize: "var(--text-totals-item-meta)",
                                letterSpacing: "0.02em",
                                fontWeight: 500,
                                color: cv.text.secondary,
                                lineHeight: 1.25,
                                textTransform: "capitalize",
                              }}
                            >
                              {metaLabel}
                            </span>
                          ) : null}
                        </div>
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
                          {formatMixAmount(perBatch, p.isKg)}
                          <span style={{ fontWeight: 500 }}>{p.isKg ? "kg" : "g"}</span>
                          <span>/batch</span>
                        </div>
                      </div>
                    </th>
                    <td
                      className="text-center align-middle"
                      style={{
                        paddingBlock: "var(--totals-cell-py)",
                        paddingInline: "var(--totals-cell-mult-px, 6px)",
                      }}
                    >
                      <span className="tabular-nums" style={MULT_TEXT}>
                        ×{mult}
                      </span>
                    </td>
                    <td
                      className="text-right align-middle tabular-nums whitespace-nowrap"
                      style={{
                        ...TABLE_TEXT,
                        paddingBlock: "var(--totals-cell-py)",
                        paddingInlineStart: "var(--totals-cell-px)",
                        fontSize: isTotal
                          ? "var(--text-totals-row-amount-total)"
                          : "var(--text-totals-row-amount)",
                        color: amountColor,
                        fontWeight: isTotal ? 700 : 600,
                        lineHeight: 1.15,
                      }}
                    >
                      <AmountCell
                        grams={lineTotal}
                        isKg={p.isKg}
                        colorScheme={colorScheme}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
