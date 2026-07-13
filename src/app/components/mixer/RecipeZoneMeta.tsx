import { useId, type ReactNode } from "react";
import { savedMixDisplayName } from "../../saved-mixes/display";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import { ConfigNameIcon } from "../shared/ActionIcons";
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
  "aria-hidden": ariaHidden,
}: {
  children: ReactNode;
  className?: string;
  "aria-hidden"?: boolean;
}) {
  return (
    <div
      className={`app-header__subline w-full min-w-0 ${className}`.trim()}
      aria-hidden={ariaHidden}
    >
      {children}
    </div>
  );
}

/** Two-line header sub strip — mixname slot + recipe row (recipe sits above ratio cards). */
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

/** Row 2 — recipe label + name (sits directly above ratio cards). */
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

/** Row 1 — saved mix label + name (reserved slot; visible only when a save is loaded). */
function RecipeHeaderMixnameRow({
  displayName,
  muted = false,
}: {
  displayName: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`app-header__config-name-row app-header__config-name-row--user${
        muted ? " app-header__config-name-row--muted" : ""
      }`}
      aria-label={`Mix name: ${displayName}`}
    >
      <span className="app-header__config-name-label">Mixname</span>
      <span className="app-header__config-name-sep" aria-hidden>
        :
      </span>
      <span className="app-header__config-name-value">{displayName}</span>
      <span className="app-header__config-name-icon" aria-hidden>
        <ConfigNameIcon size={12} />
      </span>
    </div>
  );
}

/** Top header row — saved mix name when loaded; empty placeholder keeps stack height stable. */
export function RecipeHeaderMixContext({
  loadedSavedMix,
  muted = false,
}: {
  loadedSavedMix: SavedMixSnapshot | null;
  muted?: boolean;
}) {
  const displayName = loadedSavedMix ? savedMixDisplayName(loadedSavedMix) : null;

  return (
    <RecipeHeaderSubline
      className="app-header__mixname-slot"
      aria-hidden={displayName == null}
    >
      {displayName ? (
        <RecipeHeaderMixnameRow displayName={displayName} muted={muted} />
      ) : null}
    </RecipeHeaderSubline>
  );
}
