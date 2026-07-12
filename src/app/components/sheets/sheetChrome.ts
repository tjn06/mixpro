import type { CSSProperties } from "react";
import { theme } from "../../../theme";

const { colors: c, borders: b, surfaces: s } = theme;

/** Sheet dialog title — matches recipe/card headline scale. */
export const SHEET_TITLE: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: "var(--text-recipe-select)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  color: c.title,
  lineHeight: 1.15,
  margin: 0,
};

/** Sheet helper line under the title. */
export const SHEET_SUBTITLE: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: "var(--text-ui-md)",
  fontWeight: 500,
  letterSpacing: "0.04em",
  color: c.muted,
  lineHeight: 1.4,
  marginTop: 6,
  marginBottom: 0,
};

/** Uppercase label above a sheet text field. */
export const SHEET_FIELD_LABEL: CSSProperties = {
  display: "block",
  fontSize: "var(--text-recipe-meta-label)",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: c.muted,
  lineHeight: 1.1,
};

export const SHEET_FIELD_INPUT_CLASS = "sheet-field-input w-full outline-none";

/** Flat inset field styling — distinct from raised sheet action buttons. */
export function sheetFieldInputStyle(overrides?: CSSProperties): CSSProperties {
  return {
    boxSizing: "border-box",
    height: 40,
    borderRadius: 12,
    padding: "0 14px",
    background: s.inputBg,
    border: b.input,
    color: c.title,
    fontFamily: "'Outfit', sans-serif",
    fontSize: "var(--text-ui-md)",
    fontWeight: 500,
    letterSpacing: "0.03em",
    cursor: "text",
    ...overrides,
  };
}
