/** Entity card chrome + swipe surface tuning (shared math constants). */
export const themeChrome = {
  /**
   * Same width for idle + selected/drag — only color changes.
   * Changing width on select would reflow/flicker the card.
   */
  entityBorderWidth: "3px",
  entityBorderActiveSuffix: "aa",
  cardChromeTransition:
    "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, transform 0.1s ease-out",
  /** Keep accent readable on white; idle gray is darker so selected still lifts. */
  entityTintLitPct: 14,
  swipeZoneActivePct: 3.5,
  swipeStripeAPct: 2,
  swipeStripeBPct: 0.8,
  cardLimitFlashTintPct: 50,
  /** Match entity/swipe border width so the stem reads continuous. */
  connectorWidth: 3,
} as const;
