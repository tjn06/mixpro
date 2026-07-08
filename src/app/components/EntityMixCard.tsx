import type { CSSProperties } from "react";
import {
  CARD_CHROME_TRANSITION,
  CARD_NAME_SIZE,
  CARD_UNIT_SIZE,
  CARD_VALUE_SIZE,
  cardReadoutNameStyle,
  cardReadoutUnitStyle,
  cardReadoutValueStyle,
  entityCardChrome,
  entityCardReadoutStyle,
} from "../entityCardStyles";

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
    fontSize: emphasized ? 10 : 9,
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
      fontSize: emphasized ? 14 : CARD_NAME_SIZE,
    };
    const valueStyle = {
      ...cardReadoutValueStyle(readout.valueColor),
      fontSize: emphasized ? 20 : CARD_VALUE_SIZE,
      marginTop: emphasized ? 5 : 4,
    };
    const unitStyle = {
      ...cardReadoutUnitStyle(readout.unitColor),
      fontSize: emphasized ? 13 : CARD_UNIT_SIZE,
      marginTop: emphasized ? 3 : 2,
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
          <span className="truncate max-w-full" style={metaStyle}>
            {metaLabel}
          </span>
        ) : null}
        <span className="tabular-nums truncate max-w-full" style={valueStyle}>
          {value}
        </span>
        <span className="truncate max-w-full" style={unitStyle}>{unit}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center rounded-xl relative overflow-hidden ${className}`}
      style={{
        paddingTop: 8,
        paddingBottom: 12,
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
          marginBottom: 6,
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
