import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../settings/store";
import {
  APP_LANGUAGES,
  type AppLanguage,
} from "../../i18n/language";

/** Svenska / English segment — UI language only (not share reports). */
export function LanguageSegment() {
  const { t } = useTranslation("common");
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const setUiLanguage = useSettingsStore((s) => s.setUiLanguage);

  const labels: Record<AppLanguage, string> = {
    sv: t("settings.langSv"),
    en: t("settings.langEn"),
  };

  return (
    <div
      className="settings-scheme-segment"
      role="radiogroup"
      aria-label={t("settings.uiLanguageAria")}
    >
      {APP_LANGUAGES.map((value) => {
        const active = uiLanguage === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            className="settings-scheme-segment__btn"
            data-active={active ? "" : undefined}
            onClick={() => setUiLanguage(value)}
          >
            {labels[value]}
          </button>
        );
      })}
    </div>
  );
}
