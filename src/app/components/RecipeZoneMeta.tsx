import { useId, type ReactNode } from "react";

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
  label?: string;
  muted?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const labelId = useId();

  return (
    <div
      role="group"
      aria-label={label}
      aria-labelledby={label ? labelId : undefined}
      className={`w-full min-w-0 rounded-xl flex flex-col items-center justify-start ${className}`}
      style={{
        padding: label
          ? "var(--recipe-card-pt) var(--recipe-card-px) var(--recipe-card-pb)"
          : "var(--recipe-card-pt-alt) var(--recipe-card-px) var(--recipe-card-pt-alt)",
        gap: label ? "var(--feature-label-gap)" : 0,
      }}
    >
      {label ? (
        <span
          id={labelId}
          className="uppercase truncate max-w-full"
          style={{
            fontSize: "var(--text-recipe-meta-label)",
            letterSpacing: "0.12em",
            fontWeight: 700,
            color: muted ? RECIPE_ID_COLOR_MUTED : RECIPE_ID_COLOR,
            lineHeight: 1.1,
          }}
        >
          {label}
        </span>
      ) : null}
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
        fontSize: "var(--text-recipe-select)",
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

/** Recipe name row nested under the app header bar. */
export function RecipeHeaderSubline({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-header__subline w-full min-w-0 ${className}`}>
      {children}
    </div>
  );
}

export function RecipeHeaderSublineValue({
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
      className={`app-header__subline-label truncate max-w-full text-center ${className}`}
      style={{ color: muted ? RECIPE_VALUE_COLOR_MUTED : undefined }}
    >
      {children}
    </span>
  );
}
