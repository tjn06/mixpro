import type { CSSProperties } from "react";
import { formatMixAmount, MIX_PARAMS } from "../mixEntities";
import { recipeMenuLabel } from "../recipeTypes";
import type { BlendingRecipe } from "../recipeTypes";
import { getEntityMetaLabel } from "../recipe";
import { RecipeZoneMeta, RecipeZoneMetaValue } from "./RecipeZoneMeta";
import { EntityMixCard } from "./EntityMixCard";
import { BatchTotalsShareBar } from "./BatchTotalsShareBar";

const RECIPE_ZONE_PT = 12;
const RECIPE_RATIO_BG = "transparent";
const RECIPE_CONTAINER_PX = "4px 0";
const RECIPE_META_GAP = 8;
const ROW_GAP = 8;

const TITLE_COLOR = "#c0c0e0";
const MUTED = "#8888a8";
const VALUE_COLOR = "#c4c4dc";

const TABLE_TEXT: CSSProperties = {
  fontSize: "var(--text-totals-table)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  lineHeight: 1.35,
};

const ENTITY_COL_W = 104;

const MULTIPLIER_BTN = 32;

export interface BatchTotalsScreenProps {
  recipe: BlendingRecipe;
  values: number[];
  entityIndexes: number[];
  multiplier: number;
  onMultiplierChange: (next: number) => void;
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
        fontSize: "var(--text-totals-step)",
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

export function BatchTotalsScreen({
  recipe,
  values,
  entityIndexes,
  multiplier,
  onMultiplierChange,
}: BatchTotalsScreenProps) {
  const rows = [...entityIndexes.filter((i) => i !== 0), 0];

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

      <div className="flex-1 min-h-0 min-w-0 app-gutter-x flex flex-col justify-evenly">
        <div className="shrink-0 flex flex-col items-center min-w-0">
          <p
            style={{
              fontSize: "var(--text-totals-caption)",
              color: MUTED,
              letterSpacing: "0.14em",
              fontWeight: 500,
              marginBottom: 10,
              opacity: 0.85,
            }}
          >
            BATCHES
          </p>
          <div className="flex items-center justify-center min-w-0 max-w-full" style={{ gap: 28 }}>
            <StepButton
              label="Decrease batch count"
              onClick={() => onMultiplierChange(Math.max(1, multiplier - 1))}
              disabled={multiplier <= 1}
            />
            <div className="text-center min-w-[88px]">
              <p
                className="tabular-nums"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "var(--text-totals-hero)",
                  fontWeight: 300,
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
        </div>

        <div
          className="min-h-0 min-w-0 shrink flex flex-col overflow-x-hidden overflow-y-auto overscroll-contain"
          style={{ gap: ROW_GAP }}
        >
        {rows.map((pi) => {
          const p = MIX_PARAMS[pi];
          const sumGrams = values[pi] * multiplier;

          return (
            <div
              key={p.id}
              className="flex items-center min-w-0 w-full"
              style={{ justifyContent: "space-evenly" }}
            >
              <div
                className="box-border shrink-0"
                style={{ width: ENTITY_COL_W, minWidth: ENTITY_COL_W }}
              >
                <EntityMixCard
                  variant="table"
                  id={p.id}
                  color={p.color}
                  metaLabel={getEntityMetaLabel(recipe, p.id)}
                  value={formatMixAmount(values[pi], p.isKg)}
                  unit={p.isKg ? "kg" : "g"}
                />
              </div>

              <span
                className="tabular-nums text-center whitespace-nowrap shrink-0"
                style={{
                  ...TABLE_TEXT,
                  color: p.color,
                  fontWeight: 600,
                  textShadow: `0 0 8px ${p.color}33`,
                }}
              >
                ×{multiplier}
              </span>

              <span
                aria-hidden
                className="text-center whitespace-nowrap shrink-0"
                style={{
                  ...TABLE_TEXT,
                  color: MUTED,
                  fontWeight: 500,
                }}
              >
                =
              </span>

              <span
                className="tabular-nums text-center whitespace-nowrap shrink-0"
                style={{
                  ...TABLE_TEXT,
                  fontSize: "var(--text-totals-sum)",
                  color: VALUE_COLOR,
                  fontWeight: 600,
                  lineHeight: 1.1,
                }}
              >
                {formatMixAmount(sumGrams, p.isKg)}
                <span
                  style={{
                    color: MUTED,
                    fontWeight: 500,
                    marginLeft: 4,
                    fontSize: "var(--text-totals-unit)",
                  }}
                >
                  {p.isKg ? "kg" : "g"}
                </span>
              </span>
            </div>
          );
        })}
        </div>
      </div>

      <BatchTotalsShareBar
        recipe={recipe}
        values={values}
        entityIndexes={entityIndexes}
        multiplier={multiplier}
      />
    </div>
  );
}
