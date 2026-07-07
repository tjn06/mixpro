import type { CSSProperties } from "react";

/** Shared panel chrome — bucket + rec. batch columns. */
export const FEATURE_PANEL_PAD = "7px 6px 6px";

export const FEATURE_LABEL_GAP = 4;
/** Gap from value row to content below (bucket SVG / action buttons). */
export const FEATURE_CONTENT_GAP = 8;

export const FEATURE_TITLE_SIZE = 12;
export const FEATURE_VALUE_SIZE = 16;
export const FEATURE_TITLE_COLOR = "#8888a8";
export const FEATURE_TITLE_COLOR_MUTED = "#686878";
export const FEATURE_VALUE_COLOR = "#c4c4dc";
export const FEATURE_VALUE_COLOR_MUTED = "#9898b4";

/** Fixed value slot — identical width + height in both columns. */
export const FEATURE_VALUE_ROW_W = 104;
export const FEATURE_VALUE_ROW_H = 20;

export const FEATURE_TITLE_STYLE: CSSProperties = {
  fontSize: FEATURE_TITLE_SIZE,
  letterSpacing: "0.12em",
  fontWeight: 700,
  lineHeight: 1.1,
};

export const FEATURE_VALUE_FONT: CSSProperties = {
  fontSize: FEATURE_VALUE_SIZE,
  fontWeight: 600,
  lineHeight: 1,
};

/** Shared value text layout — matches mix-card numeric readouts (inherits DM Mono). */
export const FEATURE_VALUE_TEXT_CLASS =
  "block w-full whitespace-nowrap tabular-nums text-center truncate";

/** Dropdown trigger — Outfit + letter-spacing (menu labels); readout span uses DM Mono. */
export const BUCKET_VALUE_STYLE: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: FEATURE_VALUE_SIZE,
  fontWeight: 600,
  letterSpacing: "0.06em",
  lineHeight: 1,
};

export const FEATURE_VALUE_SLOT_STYLE: CSSProperties = {
  width: FEATURE_VALUE_ROW_W,
  maxWidth: "100%",
  height: FEATURE_VALUE_ROW_H,
  minHeight: FEATURE_VALUE_ROW_H,
  flexShrink: 0,
  position: "relative",
};

/** Total label + value slot height — both columns align on the same rows. */
export const FEATURE_READOUT_BLOCK_H =
  Math.ceil(FEATURE_TITLE_SIZE * 1.1) + FEATURE_LABEL_GAP + FEATURE_VALUE_ROW_H;
