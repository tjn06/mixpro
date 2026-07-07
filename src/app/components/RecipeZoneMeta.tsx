import React, { useId, type ReactNode } from "react";

/** Match `RecipeRatioCard` horizontal padding in BatchMixer. */
export const RECIPE_META_CARD_PX = 6;
export const RECIPE_META_LABEL_GAP = 4;

const RECIPE_META_LABEL_SIZE = 14;
const RECIPE_META_VALUE_SIZE = 16;
const RECIPE_ID_COLOR = "#8888a8";
const RECIPE_ID_COLOR_MUTED = "#686878";
const RECIPE_VALUE_COLOR = "#c4c4dc";
const RECIPE_VALUE_COLOR_MUTED = "#9898b4";

export function RecipeZoneMeta({
  label,
  muted = false,
  children,
  className = "",
}: {
  label: string;
  muted?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const labelId = useId();

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={`w-full min-w-0 rounded-xl flex flex-col items-center justify-start ${className}`}
      style={{
        padding: `7px ${RECIPE_META_CARD_PX}px 6px`,
        gap: RECIPE_META_LABEL_GAP,
      }}
    >
      <span
        id={labelId}
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
      {children}
    </div>
  );
}

export function RecipeZoneMetaValue({
  children,
  muted = false,
  className = "",
}: {
  children: ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`truncate max-w-full text-center ${className}`}
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: RECIPE_META_VALUE_SIZE,
        letterSpacing: "0.04em",
        fontWeight: 600,
        color: muted ? RECIPE_VALUE_COLOR_MUTED : RECIPE_VALUE_COLOR,
        lineHeight: 1.15,
      }}
    >
      {children}
    </span>
  );
}
