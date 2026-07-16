import { forwardRef, type CSSProperties } from "react";
import {
  CARD_CHROME_TRANSITION,
  entityCardChrome,
  entityUnitColor,
  entityValueColor,
} from "../../presentation/entityCardStyles";
import type { ColorScheme } from "../../../theme/appearance";
import { MixerCardLimitFlash, MixerCardReadout } from "./MixerSwipeParts";

/** Compact TOTAL tile — same proportions as the mix-screen bottom TOTAL card. */
export const MixerTotalTile = forwardRef<
  HTMLButtonElement,
  {
    valueKg: string;
    color: string;
    colorScheme: ColorScheme;
    isActive: boolean;
    limitFlash?: boolean;
    cardBump?: boolean;
    onClick?: () => void;
    className?: string;
    style?: CSSProperties;
  }
>(function MixerTotalTile(
  {
    valueKg,
    color,
    colorScheme,
    isActive: cardLit,
    limitFlash = false,
    cardBump = false,
    onClick,
    className = "",
    style,
  },
  ref,
) {
  const chrome = entityCardChrome(color, cardLit);

  return (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      className={`flex items-stretch justify-start rounded-xl w-full h-full touch-none overflow-hidden relative ${className}`}
      style={{
        border: chrome.border,
        boxShadow: chrome.boxShadow,
        background: chrome.background,
        transition: CARD_CHROME_TRANSITION,
        transform: cardBump ? "scale(1.035)" : undefined,
        padding: "var(--total-tile-pad-y) var(--total-tile-pad-x)",
        ...style,
      }}
    >
      {limitFlash ? <MixerCardLimitFlash /> : null}
      <div
        style={{
          width: "var(--total-tile-bar-w)",
          flexShrink: 0,
          borderRadius: 2,
          background: color,
          opacity: cardLit ? 1 : 0.4,
          marginRight: "var(--total-tile-bar-gap)",
          boxShadow: cardLit ? `0 0 6px ${color}` : "none",
          transition: CARD_CHROME_TRANSITION,
        }}
      />
      <div className="flex flex-1 flex-col items-start justify-center min-w-0">
        <MixerCardReadout
          name="TOTAL"
          value={valueKg}
          unit="kg"
          nameColor={color}
          valueColor={entityValueColor(cardLit, colorScheme)}
          unitColor={entityUnitColor(cardLit, colorScheme)}
        />
      </div>
    </button>
  );
});

/** Mix-screen bottom TOTAL column width (action column takes the rest). */
export const MIXER_BOTTOM_TOTAL_WIDTH = "48%";
