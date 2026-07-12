import { useState, type CSSProperties } from "react";
import { formatMixAmount, MIX_PARAMS } from "../mixEntities";
import { recipeMenuLabel } from "../recipeTypes";
import type { BlendingRecipe } from "../recipeTypes";
import { getEntityMetaLabel, hasComplementAmounts } from "../recipe";
import { RecipeZoneMeta, RecipeZoneMetaValue } from "./RecipeZoneMeta";
import { BatchTotalsShareBar } from "./BatchTotalsShareBar";
import { CARD_NAME_WEIGHT } from "../entityCardStyles";
import { MixerInputSheet } from "./MixerInputSheet";
import type { SandType } from "../mixVolume";

const RECIPE_RATIO_BG = "transparent";
const RECIPE_CONTAINER_PX = "4px 0";
const RECIPE_META_GAP = 8;

const TITLE_COLOR = "#c0c0e0";
const MUTED = "#8888a8";
const VALUE_COLOR = "#c4c4dc";
const TABLE_BORDER = "1px solid rgba(255,255,255,0.08)";
const BATCHES_CARD_BORDER = "1px solid rgba(255,255,255,0.10)";
const BATCHES_CARD_BG = "rgba(255,255,255,0.03)";
const COMPLEMENT_ACCENT = "#9b8cff";
const COMPLEMENT_BG = "rgba(155, 140, 255, 0.08)";
const COMPLEMENT_BORDER = "1px solid rgba(155, 140, 255, 0.28)";

const TABLE_TEXT: CSSProperties = {
  fontSize: "var(--text-totals-table)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  lineHeight: 1.35,
};

const TH_TEXT: CSSProperties = {
  ...TABLE_TEXT,
  fontSize: "var(--text-totals-caption)",
  letterSpacing: "0.12em",
  fontWeight: 600,
  color: MUTED,
  textTransform: "uppercase",
};

const MULT_TEXT: CSSProperties = {
  ...TABLE_TEXT,
  fontSize: "var(--text-totals-caption)",
  fontWeight: 600,
  color: MUTED,
  letterSpacing: "0.04em",
};

const CELL_PAD = "8px 4px";
const MULT_CELL_PAD = "8px 2px";

const MULTIPLIER_BTN = 24;
const MULTIPLIER_VALUE_SIZE = 22;
const MULTIPLIER_STEP_FONT = 15;
const MULTIPLIER_ROW_GAP = 14;

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
      className="flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
      style={{
        width: MULTIPLIER_BTN,
        height: MULTIPLIER_BTN,
        background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)",
        color: disabled ? "#3a3a50" : "#a8a8c4",
        fontSize: MULTIPLIER_STEP_FONT,
        fontWeight: 300,
        lineHeight: 1,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: disabled ? "none" : "inset 0 1px 0 rgba(255,255,255,0.06)",
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
          color: MUTED,
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
  const [complementSheetOpen, setComplementSheetOpen] = useState(false);
  const ingredientRows = entityIndexes.filter((i) => i !== 0);
  const hasComplement = hasComplementAmounts(complementValues);

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-x-hidden">
      <div
        className="shrink-0 app-gutter-x flex flex-col min-w-0"
        style={{ paddingTop: "var(--recipe-zone-pt)", gap: "var(--recipe-meta-gap)" }}
      >
        <div
          className="rounded-xl flex flex-col min-w-0"
          style={{
            background: RECIPE_RATIO_BG,
            padding: RECIPE_CONTAINER_PX,
            gap: RECIPE_META_GAP,
          }}
        >
          <RecipeZoneMeta>
            <RecipeZoneMetaValue>{recipeMenuLabel(recipe)}</RecipeZoneMetaValue>
          </RecipeZoneMeta>
        </div>
      </div>

      <div className="flex-1 min-h-0 min-w-0 app-gutter-x flex flex-col">
        <div
          className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto overscroll-contain flex flex-col"
          style={{ gap: 16, paddingBottom: 8 }}
        >
          <div
            className="w-full min-w-0 shrink-0 rounded-xl overflow-hidden"
            style={{
              background: BATCHES_CARD_BG,
              border: BATCHES_CARD_BORDER,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div
              className="shrink-0 flex flex-col items-center min-w-0"
              style={{
                padding: "10px 12px 10px",
                borderBottom: TABLE_BORDER,
              }}
            >
              <p
                style={{
                  fontSize: "var(--text-totals-caption)",
                  color: MUTED,
                  letterSpacing: "0.14em",
                  fontWeight: 500,
                  marginBottom: 6,
                  opacity: 0.85,
                }}
              >
                BATCHES
              </p>
              <div className="flex items-center justify-center min-w-0 max-w-full" style={{ gap: MULTIPLIER_ROW_GAP }}>
                <StepButton
                  label="Decrease batch count"
                  onClick={() => onMultiplierChange(Math.max(1, multiplier - 1))}
                  disabled={multiplier <= 1}
                />
                <div className="text-center min-w-[36px]">
                  <p
                    className="tabular-nums"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: MULTIPLIER_VALUE_SIZE,
                      fontWeight: 400,
                      color: TITLE_COLOR,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {multiplier}
                  </p>
                </div>
                <StepButton
                  label="Increase batch count"
                  onClick={() => onMultiplierChange(Math.min(999, multiplier + 1))}
                  disabled={multiplier >= 999}
                />
              </div>
              <p
                style={{
                  fontSize: "var(--text-totals-caption)",
                  color: MUTED,
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                  marginTop: 8,
                  opacity: 0.75,
                  textAlign: "center",
                }}
              >
                {hasComplement
                  ? `${multiplier} ${multiplier === 1 ? "batch" : "batches"} + complement → combined total`
                  : `${multiplier} ${multiplier === 1 ? "batch" : "batches"} → total`}
              </p>
              <p
                style={{
                  fontSize: "calc(var(--text-totals-caption) - 1px)",
                  color: MUTED,
                  letterSpacing: "0.04em",
                  fontWeight: 500,
                  marginTop: 4,
                  opacity: 0.6,
                  textAlign: "center",
                }}
              >
                Per batch locked — go back to edit batch size
              </p>
            </div>

            <table
              className="w-full min-w-0 border-collapse"
              style={{ tableLayout: "fixed" }}
            >
            <colgroup>
              <col style={{ width: "46%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "40%" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: TABLE_BORDER }}>
                <th scope="col" className="text-left" style={{ ...TH_TEXT, padding: CELL_PAD }}>
                  Item
                </th>
                <th scope="col" className="text-center" style={{ ...TH_TEXT, padding: MULT_CELL_PAD }}>
                  ×
                </th>
                <th scope="col" className="text-right" style={{ ...TH_TEXT, padding: CELL_PAD }}>
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
                      style={{ padding: CELL_PAD }}
                    >
                      <div className="min-w-0">
                        <span
                          className="block truncate"
                          style={{
                            fontSize: "var(--text-card-name)",
                            letterSpacing: "0.18em",
                            fontWeight: CARD_NAME_WEIGHT,
                            color: p.color,
                            lineHeight: 1.2,
                          }}
                        >
                          {p.id}
                        </span>
                        {metaLabel ? (
                          <span
                            className="block"
                            style={{
                              fontSize: "calc(var(--text-recipe-unit) - 1px)",
                              letterSpacing: "0.03em",
                              fontWeight: 600,
                              color: MUTED,
                              lineHeight: 1.2,
                              marginTop: 2,
                              textTransform: "capitalize",
                            }}
                          >
                            {metaLabel}
                          </span>
                        ) : null}
                        <div
                          className="tabular-nums"
                          style={{
                            ...TABLE_TEXT,
                            color: MUTED,
                            marginTop: metaLabel ? 4 : 6,
                            opacity: 0.72,
                          }}
                        >
                          <AmountCell grams={values[pi]} isKg={p.isKg} />
                          <span style={{ marginLeft: 4, fontSize: "var(--text-totals-unit)" }}>
                            / batch
                          </span>
                        </div>
                      </div>
                    </th>
                    <td
                      className="text-center align-middle"
                      style={{ padding: MULT_CELL_PAD }}
                    >
                      <MultCell value={multiplier} />
                    </td>
                    <td
                      className="text-right align-middle tabular-nums whitespace-nowrap"
                      style={{
                        ...TABLE_TEXT,
                        fontSize: "var(--text-totals-sum)",
                        color: VALUE_COLOR,
                        fontWeight: 600,
                        lineHeight: 1.1,
                        padding: CELL_PAD,
                      }}
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
                      style={{ padding: CELL_PAD }}
                    >
                      <div className="min-w-0">
                        <span
                          className="block truncate"
                          style={{
                            fontSize: "var(--text-card-name)",
                            letterSpacing: "0.18em",
                            fontWeight: CARD_NAME_WEIGHT,
                            color: p.color,
                            lineHeight: 1.2,
                          }}
                        >
                          {p.id}
                        </span>
                        <div
                          className="tabular-nums"
                          style={{
                            ...TABLE_TEXT,
                            color: MUTED,
                            marginTop: 6,
                            opacity: 0.72,
                          }}
                        >
                          <AmountCell grams={values[pi]} isKg={p.isKg} />
                          <span style={{ marginLeft: 4, fontSize: "var(--text-totals-unit)" }}>
                            / batch
                          </span>
                        </div>
                      </div>
                    </th>
                    <td className="text-center align-middle" style={{ padding: MULT_CELL_PAD }}>
                      <span style={{ ...MULT_TEXT, opacity: 0.35 }}>—</span>
                    </td>
                    <td
                      className="text-right align-middle tabular-nums whitespace-nowrap"
                      style={{
                        ...TABLE_TEXT,
                        fontSize: "var(--text-totals-sum)",
                        color: VALUE_COLOR,
                        fontWeight: 700,
                        lineHeight: 1.1,
                        padding: CELL_PAD,
                      }}
                    >
                      <AmountCell grams={batchTotalGrams} isKg={p.isKg} />
                    </td>
                  </tr>
                );
              })()}
            </tbody>
            </table>
          </div>

          <table
            className="w-full min-w-0 border-collapse shrink-0 rounded-xl overflow-hidden"
            style={{
              tableLayout: "fixed",
              background: hasComplement ? COMPLEMENT_BG : "rgba(255,255,255,0.02)",
              border: hasComplement
                ? COMPLEMENT_BORDER
                : "1px dashed rgba(155, 140, 255, 0.28)",
            }}
          >
            <colgroup>
              <col style={{ width: "46%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "40%" }} />
            </colgroup>
            {hasComplement ? (
              <>
                <thead>
                  <tr style={{ borderBottom: COMPLEMENT_BORDER }}>
                    <th
                      scope="col"
                      className="text-left"
                      style={{ ...TH_TEXT, padding: CELL_PAD, color: COMPLEMENT_ACCENT }}
                    >
                      Complement
                    </th>
                    <th
                      scope="col"
                      className="text-center"
                      style={{ ...TH_TEXT, padding: MULT_CELL_PAD }}
                    >
                      ×
                    </th>
                    <th scope="col" className="text-right" style={{ ...TH_TEXT, padding: CELL_PAD }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientRows.map((pi) => {
                    const p = MIX_PARAMS[pi];
                    const metaLabel = getEntityMetaLabel(recipe, p.id);

                    return (
                      <tr key={`complement-${p.id}`} style={{ borderBottom: TABLE_BORDER }}>
                        <th
                          scope="row"
                          className="text-left align-middle font-normal"
                          style={{ padding: CELL_PAD }}
                        >
                          <button
                            type="button"
                            onClick={() => setComplementSheetOpen(true)}
                            className="w-full text-left min-w-0"
                            style={{ cursor: "pointer", background: "transparent", border: 0, padding: 0 }}
                          >
                            <div className="min-w-0">
                              <span
                                className="block truncate"
                                style={{
                                  fontSize: "var(--text-card-name)",
                                  letterSpacing: "0.18em",
                                  fontWeight: CARD_NAME_WEIGHT,
                                  color: p.color,
                                  lineHeight: 1.2,
                                }}
                              >
                                {p.id}
                              </span>
                              {metaLabel ? (
                                <span
                                  className="block"
                                  style={{
                                    fontSize: "calc(var(--text-recipe-unit) - 1px)",
                                    letterSpacing: "0.03em",
                                    fontWeight: 600,
                                    color: MUTED,
                                    lineHeight: 1.2,
                                    marginTop: 2,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {metaLabel}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        </th>
                        <td className="text-center align-middle" style={{ padding: MULT_CELL_PAD }}>
                          <MultCell value={1} />
                        </td>
                        <td
                          className="text-right align-middle tabular-nums whitespace-nowrap"
                          style={{
                            ...TABLE_TEXT,
                            fontSize: "var(--text-totals-sum)",
                            color: VALUE_COLOR,
                            fontWeight: 600,
                            lineHeight: 1.1,
                            padding: CELL_PAD,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setComplementSheetOpen(true)}
                            className="w-full text-right"
                            style={{ cursor: "pointer", background: "transparent", border: 0, padding: 0 }}
                          >
                            <AmountCell grams={complementValues[pi]} isKg={p.isKg} />
                          </button>
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
                          style={{ padding: CELL_PAD }}
                        >
                          <button
                            type="button"
                            onClick={() => setComplementSheetOpen(true)}
                            className="w-full text-left"
                            style={{ cursor: "pointer", background: "transparent", border: 0, padding: 0 }}
                          >
                            <div className="min-w-0">
                              <span
                                className="block truncate"
                                style={{
                                  fontSize: "var(--text-card-name)",
                                  letterSpacing: "0.18em",
                                  fontWeight: CARD_NAME_WEIGHT,
                                  color: p.color,
                                  lineHeight: 1.2,
                                }}
                              >
                                {p.id}
                              </span>
                              <div
                                className="tabular-nums"
                                style={{
                                  ...TABLE_TEXT,
                                  color: MUTED,
                                  marginTop: 6,
                                  opacity: 0.72,
                                }}
                              >
                                <AmountCell grams={complementValues[pi]} isKg={p.isKg} />
                                <span style={{ marginLeft: 4, fontSize: "var(--text-totals-unit)" }}>
                                  / batch
                                </span>
                              </div>
                            </div>
                          </button>
                        </th>
                        <td className="text-center align-middle" style={{ padding: MULT_CELL_PAD }}>
                          <span style={{ ...MULT_TEXT, opacity: 0.35 }}>—</span>
                        </td>
                        <td
                          className="text-right align-middle tabular-nums whitespace-nowrap"
                          style={{
                            ...TABLE_TEXT,
                            fontSize: "var(--text-totals-sum)",
                            color: VALUE_COLOR,
                            fontWeight: 700,
                            lineHeight: 1.1,
                            padding: CELL_PAD,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setComplementSheetOpen(true)}
                            className="w-full text-right"
                            style={{ cursor: "pointer", background: "transparent", border: 0, padding: 0 }}
                          >
                            <AmountCell grams={complementValues[pi]} isKg={p.isKg} />
                          </button>
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </>
            ) : (
              <tbody>
                <tr>
                  <td colSpan={3} style={{ padding: "12px 10px" }}>
                    <button
                      type="button"
                      onClick={() => setComplementSheetOpen(true)}
                      className="w-full text-center transition-all duration-200 active:scale-[0.99]"
                      style={{
                        cursor: "pointer",
                        background: "transparent",
                        border: 0,
                        padding: 0,
                        fontSize: "var(--text-totals-table)",
                        letterSpacing: "0.12em",
                        fontWeight: 600,
                        color: COMPLEMENT_ACCENT,
                        lineHeight: 1.3,
                        opacity: 0.9,
                      }}
                    >
                      + Add complement
                    </button>
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>

      <BatchTotalsShareBar
        recipe={recipe}
        values={values}
        complementValues={complementValues}
        entityIndexes={entityIndexes}
        multiplier={multiplier}
      />

      <MixerInputSheet
        open={complementSheetOpen}
        onOpenChange={setComplementSheetOpen}
        title="Complement"
        subtitle="One extra batch — always ×1, added on top of your batches"
        recipe={recipe}
        values={complementValues}
        entityIndexes={entityIndexes}
        bucketSelection="none"
        sandType={sandType}
        onApply={onComplementChange}
      />
    </div>
  );
}
