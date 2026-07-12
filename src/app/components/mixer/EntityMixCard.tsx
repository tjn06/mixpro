import type { CSSProperties } from "react";
import {
  CARD_CHROME_TRANSITION,
  cardReadoutNameStyle,
  cardReadoutUnitStyle,
  cardReadoutValueStyle,
  entityCardChrome,
  entityCardReadoutStyle,
} from "../../presentation/entityCardStyles";

export interface EntityMixCardProps {
  id: string;
  color: string;
  value: string;
  unit: string;
  /** Human-readable line under id (Resin, Epoxy, Filler, …). */
  metaLabel?: string;
  lit?: boolean;
  /** Larger readout for TOTAL row on totals screen. */
  emphasized?: boolean;
  /** Tighter horizontal layout for totals table rows. */
  variant?: "default" | "table";
  className?: string;
  style?: CSSProperties;
}

/** Read-only entity card — same chrome as mixer ingredient cards. */
export function EntityMixCard({
  id,
  color,
  value,
  unit,
  metaLabel,
  lit = true,
  emphasized = false,
  variant = "default",
  className = "",
  style,
}: EntityMixCardProps) {
  const chrome = entityCardChrome(color, lit);
  const readout = entityCardReadoutStyle(color, lit);

  const metaStyle: CSSProperties = {
    fontSize: emphasized ? "var(--text-recipe-sublabel)" : "calc(var(--text-recipe-unit) - 1px)",
    letterSpacing: "0.03em",
    fontWeight: 600,
    color: readout.unitColor,
    lineHeight: 1.1,
    marginTop: emphasized ? 2 : 1,
    textTransform: "capitalize",
  };

  if (variant === "table") {
    const nameStyle = {
      ...cardReadoutNameStyle(readout.nameColor),
      fontSize: emphasized ? "var(--text-recipe-meta-label)" : "var(--text-card-name)",
    };
    const valueStyle = {
      ...cardReadoutValueStyle(readout.valueColor),
      fontSize: emphasized ? "calc(var(--text-card-value) + 4px)" : "var(--text-card-value)",
      marginTop: 0,
    };
    const unitStyle = {
      ...cardReadoutUnitStyle(readout.unitColor),
      fontSize: emphasized ? "calc(var(--text-card-unit) + 1px)" : "var(--text-card-unit)",
      marginTop: 0,
    };

    return (
      <div
        className={`flex flex-col items-start rounded-xl relative overflow-hidden min-w-0 w-full box-border ${className}`}
        style={{
          padding: emphasized ? "9px 10px" : "6px 8px",
          background: chrome.background,
          border: chrome.border,
          boxShadow: chrome.boxShadow,
          transition: CARD_CHROME_TRANSITION,
          maxWidth: "100%",
          ...style,
        }}
      >
        <span className="truncate max-w-full" style={nameStyle}>{id}</span>
        {metaLabel ? (
          <span className="max-w-full" style={metaStyle}>
            {metaLabel}
          </span>
        ) : null}
        <div
          className="flex items-baseline min-w-0 max-w-full"
          style={{
            marginTop: emphasized ? "var(--recipe-row-gap)" : "var(--entity-card-readout-mt)",
            gap: 4,
          }}
        >
          <span className="tabular-nums shrink-0" style={valueStyle}>
            {value}
          </span>
          <span className="shrink-0" style={unitStyle}>{unit}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center rounded-xl relative overflow-hidden ${className}`}
      style={{
        paddingTop: "var(--entity-card-pt)",
        paddingBottom: "var(--entity-card-pb)",
        background: chrome.background,
        border: chrome.border,
        boxShadow: chrome.boxShadow,
        transition: CARD_CHROME_TRANSITION,
        ...style,
      }}
    >
      <div
        style={{
          width: 22,
          height: 3,
          borderRadius: 2,
          background: color,
          opacity: readout.barOpacity,
          marginBottom: "var(--entity-card-bar-mb)",
          boxShadow: lit ? `0 0 6px ${color}` : "none",
        }}
      />
      <div className="flex flex-col items-center min-w-0">
        <span style={cardReadoutNameStyle(readout.nameColor)}>{id}</span>
        <span className="tabular-nums" style={cardReadoutValueStyle(readout.valueColor)}>
          {value}
        </span>
        <span style={cardReadoutUnitStyle(readout.unitColor)}>{unit}</span>
      </div>
    </div>
  );
}
