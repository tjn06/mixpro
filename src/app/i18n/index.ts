import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_UI_LANGUAGE,
  normalizeAppLanguage,
  type AppLanguage,
} from "./language";
import enCommon from "./locales/en/common.json";
import svCommon from "./locales/sv/common.json";

/**
 * Phase 0 i18n — UI strings only.
 * Share/report builders keep their own `BatchReportLanguage` and must not
 * read global `i18n.language` for report body copy.
 */
void i18n.use(initReactI18next).init({
  resources: {
    sv: { common: svCommon },
    en: { common: enCommon },
  },
  lng: DEFAULT_UI_LANGUAGE,
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common"],
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

export function setUiLanguage(language: AppLanguage): void {
  const next = normalizeAppLanguage(language);
  if (i18n.language === next) return;
  void i18n.changeLanguage(next);
}

export { i18n };
export default i18n;
