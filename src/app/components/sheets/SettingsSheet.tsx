import { CloseIcon } from "../shared/ActionIcons";
import {
  SHEET_FIELD_LABEL,
  SHEET_LIST_ROW_CLASS,
  SHEET_SUBTITLE,
  SHEET_TITLE,
  SHEET_COVER_HEADER_STYLE,
  SHEET_COVER_FORM_SPACING,
} from "./sheetChrome";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { useSettingsStore } from "../../settings/store";
import type { ColorScheme } from "../../../theme/appearance";
import { cv } from "../../ui/tokens";

const SHEET_PAD_X = 20;
const ROW_H = 52;

export interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

/** App settings — opens from the header gear. */
export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  return (
    <AppFrameCoverSheet
      open={open}
      zIndex={32}
      ariaLabelledBy="settings-sheet-title"
    >
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_HEADER_STYLE}
      >
        <h2 id="settings-sheet-title" style={SHEET_TITLE}>
          Settings
        </h2>
        <p style={{ ...SHEET_SUBTITLE, maxWidth: 280, textAlign: "center" }}>
          Display and accessibility
        </p>
      </header>

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-none"
        style={{
          paddingLeft: SHEET_PAD_X,
          paddingRight: SHEET_PAD_X,
          paddingTop: SHEET_COVER_FORM_SPACING.subtitleToSubinfo,
          paddingBottom: SHEET_COVER_FORM_SPACING.formBottomInset,
        }}
      >
        <div
          className={`${SHEET_LIST_ROW_CLASS} rounded-2xl w-full max-w-[360px] mx-auto flex flex-col`}
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
      </div>

      <SheetFooter
        buttons={[
          {
            key: "close",
            label: "Close",
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}
