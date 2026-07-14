import React from "react";
import type { BlendingRecipe } from "../../domain/recipe/types";
import {
  getIngredientLabel,
  getLockedRatioDisplay,
  recipeIngredientIndexes,
} from "../../domain/recipe/calc";
import { MIX_PARAMS } from "../../domain/mix/entities";
import { componentTokens } from "../../ui/tokens";

const swipe = componentTokens.mixerSwipe;
const meta = componentTokens.recipeMeta;

const RECIPE_RATIO_BG = swipe.recipeRatioBackground;
const RECIPE_VALUE_COLOR = meta.value;
const RECIPE_VALUE_COLOR_MUTED = meta.valueMuted;
const RECIPE_ID_COLOR = meta.id;
const RECIPE_ID_COLOR_MUTED = meta.idMuted;
const RECIPE_UNIT_COLOR = meta.unit;
const RECIPE_COLON_COLOR = meta.colon;
const RECIPE_CONTAINER_PX = "4px 0";

function RecipeRatioGapSeparator() {
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center pointer-events-none self-stretch"
      style={{ width: "var(--section-gap)" }}
    >
      <span
        style={{
          fontSize: "var(--text-recipe-colon)",
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
        height: "var(--recipe-card-h)",
        padding: "var(--recipe-card-pt) var(--recipe-card-px) var(--recipe-card-pb)",
        background: RECIPE_RATIO_BG,
      }}
    >
      <div
        className="flex flex-col items-center max-w-full min-h-0"
        style={{ gap: "var(--recipe-id-sublabel-gap)" }}
      >
        <span
          className="uppercase truncate max-w-full"
          style={{
            fontSize: "var(--text-recipe-id)",
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
              fontSize: "var(--text-recipe-sublabel)",
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
          fontSize: "var(--text-recipe-ratio)",
          letterSpacing: "-0.02em",
          fontWeight: 600,
          color: muted ? RECIPE_VALUE_COLOR_MUTED : RECIPE_VALUE_COLOR,
          lineHeight: 1,
          marginTop: "var(--recipe-row-gap)",
        }}
      >
        {value}
      </span>
      <span
        className="uppercase truncate max-w-full"
        style={{
          fontSize: "var(--text-recipe-unit)",
          letterSpacing: unit.length > 1 ? "0.1em" : "0.05em",
          fontWeight: 600,
          color: RECIPE_UNIT_COLOR,
          opacity: muted ? 0.7 : 1,
          lineHeight: 1.1,
          marginTop: "var(--recipe-label-gap)",
        }}
      >
        {unit}
      </span>
    </div>
  );
}

export interface RecipeRatioRowProps {
  recipe: BlendingRecipe;
  muted?: boolean;
  className?: string;
}

/** Locked recipe ratio cards (read-only) — A Resin 2 PARTS : B Hardener 1 PARTS : … */
export function RecipeRatioRow({ recipe, muted = false, className = "" }: RecipeRatioRowProps) {
  const ingredientIndexes = recipeIngredientIndexes(recipe);

  return (
    <div
      className={`rounded-xl flex flex-col min-w-0${className ? ` ${className}` : ""}`}
      style={{
        background: RECIPE_RATIO_BG,
        padding: RECIPE_CONTAINER_PX,
        gap: "var(--recipe-meta-gap)",
      }}
    >
      <div className="flex items-stretch pointer-events-none">
        {ingredientIndexes.map((pi, i) => {
          const p = MIX_PARAMS[pi];
          const { value, unit } = getLockedRatioDisplay(recipe, p.id);
          return (
            <React.Fragment key={`recipe-${p.id}`}>
              {i > 0 && <RecipeRatioGapSeparator />}
              <RecipeRatioCard
                id={p.id}
                sublabel={getIngredientLabel(recipe, p.id)}
                value={value}
                unit={unit}
                muted={muted}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
