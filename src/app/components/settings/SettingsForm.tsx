import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../settings/store";
import { cv } from "../../ui/tokens";
import { SHEET_LIST_ROW_CLASS } from "../sheets/sheetChrome";
import { ColorSchemeSegment } from "./ColorSchemeSegment";
import { LanguageSegment } from "./LanguageSegment";

const ROW_H = 56;

const labelStyle = {
  fontFamily: "var(--font-ui, 'Outfit', sans-serif)",
  fontSize: "var(--text-page-body)",
  fontWeight: 600,
  letterSpacing: "0.01em",
  color: cv.text.primary,
} as const;

const hintStyle = {
  fontFamily: "var(--font-ui, 'Outfit', sans-serif)",
  fontSize: "var(--text-page-secondary)",
  fontWeight: 500,
  letterSpacing: "0.01em",
  color: cv.text.muted,
  lineHeight: 1.4,
} as const;

const sectionStyle = {
  fontFamily: "var(--font-ui, 'Outfit', sans-serif)",
  fontSize: "var(--text-page-section)",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: cv.text.muted,
  lineHeight: 1.2,
  marginBottom: 4,
};

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: cv.border.subtle,
        margin: "4px 0",
      }}
    />
  );
}

function ColorSchemeRow() {
  const { t } = useTranslation("common");
  return (
    <div
      className="flex items-center justify-between gap-4 w-full"
      style={{ minHeight: ROW_H }}
    >
      <span className="flex flex-col min-w-0" style={{ gap: 4 }}>
        <span style={labelStyle}>{t("settings.colorScheme")}</span>
        <span style={hintStyle}>{t("settings.colorSchemeHint")}</span>
      </span>
      <ColorSchemeSegment />
    </div>
  );
}

function ContrastToggleRow() {
  const { t } = useTranslation("common");
  const contrast = useSettingsStore((s) => s.contrast);
  const toggleHighContrast = useSettingsStore((s) => s.toggleHighContrast);
  const highContrast = contrast === "high";

  return (
    <div
      className="flex items-center justify-between gap-4 w-full"
      style={{ minHeight: ROW_H }}
    >
      <span className="flex flex-col min-w-0" style={{ gap: 4 }}>
        <span style={labelStyle}>{t("settings.highContrast")}</span>
        <span style={hintStyle}>{t("settings.highContrastHint")}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={highContrast}
        aria-label={t("settings.highContrastAria")}
        onClick={toggleHighContrast}
        className="settings-toggle shrink-0"
        data-active={highContrast ? "" : undefined}
      />
    </div>
  );
}

function LanguageRow() {
  const { t } = useTranslation("common");
  return (
    <div
      className="flex items-center justify-between gap-4 w-full"
      style={{ minHeight: ROW_H }}
    >
      <span className="flex flex-col min-w-0" style={{ gap: 4 }}>
        <span style={labelStyle}>{t("settings.uiLanguage")}</span>
        <span style={hintStyle}>{t("settings.uiLanguageHint")}</span>
      </span>
      <LanguageSegment />
    </div>
  );
}

/** Shared settings controls — used by Settings page. */
export function SettingsForm() {
  const { t } = useTranslation("common");
  return (
    <div className="flex w-full flex-col" style={{ gap: 12 }}>
      <div
        className={`${SHEET_LIST_ROW_CLASS} rounded-2xl w-full flex flex-col`}
        style={{ padding: "12px 16px", gap: 8 }}
      >
        <p style={sectionStyle}>{t("settings.sectionDisplay")}</p>
        <ColorSchemeRow />
        <Divider />
        <ContrastToggleRow />
      </div>

      <div
        className={`${SHEET_LIST_ROW_CLASS} rounded-2xl w-full flex flex-col`}
        style={{ padding: "12px 16px", gap: 8 }}
      >
        <p style={sectionStyle}>{t("settings.sectionLanguage")}</p>
        <LanguageRow />
      </div>
    </div>
  );
}
