import { useId, type ReactNode } from "react";
import { BASE_CONFIG_DISPLAY_NAME, savedMixDisplayName } from "../../saved-mixes/display";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import { BaseConfigIcon, ConfigNameIcon } from "../shared/ActionIcons";
import { componentTokens } from "../../ui/tokens";

const meta = componentTokens.recipeMeta;

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
            color: muted ? meta.idMuted : meta.id,
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
        color: muted ? meta.valueMuted : meta.value,
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

/** Two-line header sub strip — recipe select + context label (e.g. saved meta / locked recipe). */
export function RecipeHeaderSublineStack({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`app-header-sub-stack w-full min-w-0 flex flex-col items-center justify-center ${className}`}
      style={{ gap: "var(--header-subline-stack-gap, 2px)" }}
    >
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
      style={{ color: muted ? meta.valueMuted : undefined }}
    >
      {children}
    </span>
  );
}

/** Row 1 — recipe label + name (primary header context). */
export function RecipeHeaderRecipeRow({
  children,
  muted = false,
  className = "",
}: {
  children: ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`app-header__recipe-row${muted ? " app-header__recipe-row--muted" : ""} ${className}`.trim()}
      aria-label={`Recipe: ${typeof children === "string" ? children : undefined}`}
    >
      <span className="app-header__recipe-label">Recipe</span>
      <span className="app-header__recipe-sep" aria-hidden>
        :
      </span>
      <span className="app-header__recipe-value">{children}</span>
    </div>
  );
}

/** Row 2 — config name label + value (+ optional icon). */
function RecipeHeaderConfigNameRow({
  displayName,
  muted = false,
  variant,
}: {
  displayName: string;
  muted?: boolean;
  variant: "user" | "admin";
}) {
  const Icon = variant === "user" ? ConfigNameIcon : BaseConfigIcon;

  return (
    <div
      className={`app-header__config-name-row app-header__config-name-row--${variant}${
        muted ? " app-header__config-name-row--muted" : ""
      }`}
      aria-label={`Config name: ${displayName}`}
    >
      <span className="app-header__config-name-label">Config name</span>
      <span className="app-header__config-name-sep" aria-hidden>
        :
      </span>
      <span className="app-header__config-name-value">{displayName}</span>
      <span className="app-header__config-name-icon" aria-hidden>
        <Icon size={12} />
      </span>
    </div>
  );
}

/** Second header row — loaded save config name, or built-in base config. */
export function RecipeHeaderMixContext({
  loadedSavedMix,
  muted = false,
}: {
  loadedSavedMix: SavedMixSnapshot | null;
  muted?: boolean;
}) {
  const displayName = loadedSavedMix
    ? savedMixDisplayName(loadedSavedMix)
    : BASE_CONFIG_DISPLAY_NAME;

  return (
    <RecipeHeaderSubline>
      <RecipeHeaderConfigNameRow
        displayName={displayName}
        muted={muted}
        variant={loadedSavedMix ? "user" : "admin"}
      />
    </RecipeHeaderSubline>
  );
}
