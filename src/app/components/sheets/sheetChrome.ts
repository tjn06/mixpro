import type { CSSProperties } from "react";
import { cv } from "../../ui/tokens";

/** Sheet dialog title — matches recipe/card headline scale. */
export const SHEET_TITLE_CLASS = "sheet-title";

/** Sheet helper line under the title. */
export const SHEET_SUBTITLE_CLASS = "sheet-subtitle";

/** Uppercase label above a sheet text field. */
export const SHEET_FIELD_LABEL_CLASS = "sheet-field-label";

/** @deprecated Use SHEET_TITLE_CLASS — kept for gradual migration. */
export const SHEET_TITLE: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: "var(--text-recipe-select)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: cv.text.primary,
  lineHeight: 1.15,
  margin: 0,
};

/** @deprecated Use SHEET_SUBTITLE_CLASS */
export const SHEET_SUBTITLE: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: "var(--text-ui-md)",
  fontWeight: 500,
  letterSpacing: "0.04em",
  color: cv.text.secondary,
  lineHeight: 1.4,
  marginTop: 6,
  marginBottom: 0,
};

/** @deprecated Use SHEET_FIELD_LABEL_CLASS */
export const SHEET_FIELD_LABEL: CSSProperties = {
  display: "block",
  fontSize: "var(--text-recipe-meta-label)",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: cv.text.muted,
  lineHeight: 1.1,
};

export const SHEET_FIELD_INPUT_CLASS = "sheet-field-input w-full outline-none";
export const SHEET_FIELD_INPUT_ERROR_CLASS = "sheet-field-input--error";

/** iOS Safari skips focus-zoom at 16px and above. */
export const SHEET_FIELD_INPUT_FONT_SIZE = 16;

/** Layout-only overrides — colors come from .sheet-field-input CSS vars. */
export function sheetFieldInputStyle(overrides?: CSSProperties): CSSProperties {
  return {
    boxSizing: "border-box",
    height: 40,
    borderRadius: 12,
    padding: "0 14px",
    fontFamily: "'Outfit', sans-serif",
    fontSize: SHEET_FIELD_INPUT_FONT_SIZE,
    fontWeight: 500,
    letterSpacing: "0.03em",
    ...overrides,
  };
}

export const SHEET_PANEL_CLASS = "sheet-panel-chrome load-sheet-panel";
/** Megamenu-style full-bleed cover below header subline. */
export const APP_FRAME_COVER_SHEET_CLASS = "app-frame-cover-sheet";

/** Compact header padding for app-frame cover sheets (iOS ~16pt rhythm). */
export const SHEET_COVER_HEADER_STYLE: CSSProperties = {
  paddingLeft: 20,
  paddingRight: 20,
  paddingTop: 16,
  paddingBottom: 12,
};

/** iOS-aligned vertical rhythm for cover-sheet forms (pt ≈ px at 1x). */
export const SHEET_COVER_FORM_SPACING = {
  /** Subtitle → read-only meta block */
  headerToMeta: 16,
  /** Uppercase label → read-only value */
  metaLabelToValue: 6,
  /** Field label → text input */
  labelToField: 8,
  /** Text input → secondary action */
  fieldToAction: 12,
  /** Input / action → validation line */
  fieldToMessage: 8,
  /** Editable block → footer */
  formBottomInset: 16,
} as const;
export const SHEET_OVERLAY_LIGHT_CLASS = "load-sheet-dim sheet-panel-overlay-light";
export const SHEET_OVERLAY_MEDIUM_CLASS = "mixer-input-sheet-dim sheet-panel-overlay-medium";
export const SHEET_LIST_ROW_CLASS = "sheet-list-row";
