import type { ReactNode } from "react";
import { theme } from "../../../theme";

const { colors: c, borders: b, surfaces: s } = theme;

export const SHEET_FOOTER_H = 64;
export const SHEET_FOOTER_PAD_X = "max(20px, var(--safe-left), var(--safe-right))";
export const SHEET_FOOTER_BTN_H = 44;
const SHEET_FOOTER_GAP = 8;
const SHEET_FOOTER_ICON = 18;
const TOOLTIP_LINE_H = 7;

export interface SheetFooterButton {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  accentColor?: string;
  disabled?: boolean;
  /** Short label floated above the button — does not affect layout. */
  tooltip?: string;
}

interface SheetFooterProps {
  buttons: SheetFooterButton[];
}

function SheetFooterTooltip({ label }: { label: string }) {
  return (
    <div
      className="absolute left-1/2 flex flex-col items-center pointer-events-none"
      style={{
        bottom: "100%",
        transform: "translateX(-50%)",
        marginBottom: 4,
        zIndex: 1,
      }}
      aria-hidden
    >
      <span
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: "var(--text-ui-xs)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: c.muted,
          whiteSpace: "nowrap",
          lineHeight: 1.1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: "block",
          width: 1,
          height: TOOLTIP_LINE_H,
          marginTop: 4,
          background: "rgba(255,255,255,0.22)",
          borderRadius: 1,
        }}
      />
    </div>
  );
}

function SheetIconButton({
  label,
  icon,
  onClick,
  accentColor,
  disabled = false,
}: SheetFooterButton) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-full min-w-0 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-[0.98]"
      style={{
        height: SHEET_FOOTER_BTN_H,
        background: c.entitySurfaceIdle,
        border: b.sheetBtn,
        color: accentColor ?? c.title,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.42 : 1,
      }}
    >
      <span
        className="flex shrink-0 items-center justify-center"
        style={{ width: SHEET_FOOTER_ICON, height: SHEET_FOOTER_ICON }}
      >
        {icon}
      </span>
    </button>
  );
}

/** Bottom action row — icon-only tap buttons sharing one row. */
export function SheetFooter({ buttons }: SheetFooterProps) {
  return (
    <footer
      className="shrink-0 flex items-center relative z-[11]"
      style={{
        height: SHEET_FOOTER_H,
        paddingLeft: SHEET_FOOTER_PAD_X,
        paddingRight: SHEET_FOOTER_PAD_X,
        gap: SHEET_FOOTER_GAP,
        background: s.loadSheetPanel,
      }}
    >
      {buttons.map((btn) => (
        <div key={btn.key} className="relative flex flex-1 min-w-0 justify-center">
          {btn.tooltip ? <SheetFooterTooltip label={btn.tooltip} /> : null}
          <SheetIconButton {...btn} />
        </div>
      ))}
    </footer>
  );
}

export const SHEET_FOOTER_ICON_SIZE = SHEET_FOOTER_ICON;
