import type { ReactNode } from "react";
import { componentTokens } from "../../ui/tokens";

const footer = componentTokens.sheetFooterButton;

export const SHEET_FOOTER_H = 64;
export const SHEET_FOOTER_PAD_X = "max(20px, var(--safe-left), var(--safe-right))";
export const SHEET_FOOTER_BTN_H = footer.height;
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
      <span className="sheet-footer-tooltip-label">{label}</span>
      <span
        className="sheet-footer-tooltip-line"
        style={{ height: TOOLTIP_LINE_H, marginTop: 4 }}
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
      className="sheet-footer-btn w-full min-w-0 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-[0.98]"
      style={{
        height: SHEET_FOOTER_BTN_H,
        color: accentColor,
        cursor: disabled ? "not-allowed" : "pointer",
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
      className="sheet-footer-chrome shrink-0 flex items-center relative z-[11]"
      style={{
        height: SHEET_FOOTER_H,
        paddingLeft: SHEET_FOOTER_PAD_X,
        paddingRight: SHEET_FOOTER_PAD_X,
        gap: SHEET_FOOTER_GAP,
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
