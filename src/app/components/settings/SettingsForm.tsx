import { useSettingsStore } from "../../settings/store";
import type { ColorScheme } from "../../../theme/appearance";
import { cv } from "../../ui/tokens";
import { SHEET_FIELD_LABEL, SHEET_LIST_ROW_CLASS } from "../sheets/sheetChrome";

const ROW_H = 52;

const SCHEME_OPTIONS: { value: ColorScheme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

function ColorSchemeRow() {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const setColorScheme = useSettingsStore((s) => s.setColorScheme);

  return (
    <div
      className="flex items-center justify-between gap-4 w-full"
      style={{ minHeight: ROW_H }}
    >
      <span className="flex flex-col min-w-0" style={{ gap: 4 }}>
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "var(--text-ui-md)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: cv.text.primary,
          }}
        >
          Color scheme
        </span>
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "var(--text-ui-xs)",
            fontWeight: 500,
            letterSpacing: "0.03em",
            color: cv.text.muted,
            lineHeight: 1.35,
          }}
        >
          Dark or light appearance
        </span>
      </span>
      <div
        className="settings-scheme-segment shrink-0"
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
    </div>
  );
}

function ContrastToggleRow() {
  const contrast = useSettingsStore((s) => s.contrast);
  const toggleHighContrast = useSettingsStore((s) => s.toggleHighContrast);
  const highContrast = contrast === "high";

  return (
    <div
      className="flex items-center justify-between gap-4 w-full"
      style={{ minHeight: ROW_H }}
    >
      <span className="flex flex-col min-w-0" style={{ gap: 4 }}>
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "var(--text-ui-md)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: cv.text.primary,
          }}
        >
          High contrast
        </span>
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "var(--text-ui-xs)",
            fontWeight: 500,
            letterSpacing: "0.03em",
            color: cv.text.muted,
            lineHeight: 1.35,
          }}
        >
          Brighter text and borders for outdoor use
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={highContrast}
        aria-label="High contrast mode"
        onClick={toggleHighContrast}
        className="settings-toggle shrink-0"
        data-active={highContrast ? "" : undefined}
      />
    </div>
  );
}

/** Shared settings controls — used by Settings page. */
export function SettingsForm() {
  return (
    <div
      className={`${SHEET_LIST_ROW_CLASS} rounded-2xl w-full flex flex-col`}
      style={{ padding: "12px 16px", gap: 8 }}
    >
      <p style={{ ...SHEET_FIELD_LABEL, marginBottom: 4 }}>Display</p>
      <ColorSchemeRow />
      <div
        style={{
          height: 1,
          background: cv.border.subtle,
          margin: "4px 0",
        }}
      />
      <ContrastToggleRow />
    </div>
  );
}
