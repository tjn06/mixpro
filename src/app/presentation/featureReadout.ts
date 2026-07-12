import type { CSSProperties } from "react";
import { theme } from "../../theme";

/** Shared panel chrome — bucket + rec. batch columns. */
export const FEATURE_PANEL_BG = theme.surfaces.transparent;
export const FEATURE_PANEL_BORDER = theme.borders.panel;

export const FEATURE_TITLE_COLOR = theme.colors.muted;
export const FEATURE_TITLE_COLOR_MUTED = theme.colors.mutedDim;
export const FEATURE_VALUE_COLOR = theme.colors.value;
export const FEATURE_VALUE_COLOR_MUTED = theme.colors.recipeValueMuted;

export const FEATURE_TITLE_STYLE: CSSProperties = {
  fontSize: "var(--text-feature-title)",
  letterSpacing: "0.12em",
  fontWeight: 700,
  lineHeight: 1.1,
};

export const FEATURE_VALUE_FONT: CSSProperties = {
  fontSize: "var(--text-feature-value)",
  fontWeight: 600,
  lineHeight: 1.2,
};

/** Shared value text layout — inherits DM Mono; ellipsis on x only so descenders (g, j…) show. */
export const FEATURE_VALUE_TEXT_CLASS =
  "block w-full whitespace-nowrap tabular-nums text-center overflow-x-hidden overflow-y-visible text-ellipsis";

/** Dropdown trigger — Outfit + letter-spacing (menu labels); readout span uses DM Mono. */
export const BUCKET_VALUE_STYLE: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: "var(--text-feature-value)",
  fontWeight: 600,
  letterSpacing: "0.06em",
  lineHeight: 1.2,
};

export const FEATURE_VALUE_SLOT_STYLE: CSSProperties = {
  width: "var(--feature-value-row-w)",
  maxWidth: "100%",
  height: "var(--feature-value-row-h)",
  minHeight: "var(--feature-value-row-h)",
  flexShrink: 0,
  position: "relative",
  overflow: "visible",
};
