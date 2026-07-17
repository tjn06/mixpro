import { useSettingsStore } from "../../settings/store";
import type { ColorScheme } from "../../../theme/appearance";

const SCHEME_OPTIONS: { value: ColorScheme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

/** Dark / Light segment — same control in Settings and the nav drawer. */
export function ColorSchemeSegment() {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);

  return (
    <div
      className="settings-scheme-segment"
      role="radiogroup"
      aria-label="Color scheme"
    >
      {SCHEME_OPTIONS.map((option) => {
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
