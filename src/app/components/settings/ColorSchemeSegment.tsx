import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../settings/store";
import type { ColorScheme } from "../../../theme/appearance";

/** Dark / Light segment — same control in Settings and the nav drawer. */
export function ColorSchemeSegment() {
  const { t } = useTranslation("common");
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);

  const options: { value: ColorScheme; label: string }[] = [
    { value: "dark", label: t("settings.schemeDark") },
    { value: "light", label: t("settings.schemeLight") },
  ];

  return (
    <div
      className="settings-scheme-segment"
      role="radiogroup"
      aria-label={t("settings.colorSchemeAria")}
    >
      {options.map((option) => {
        const active = colorScheme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className="settings-scheme-segment__btn"
            data-active={active ? "" : undefined}
            onClick={() => setColorScheme(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
