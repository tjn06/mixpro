import type { ReactNode } from "react";
import { theme } from "../../../theme";

const { colors: c, borders: b, surfaces: s } = theme;

export const SHEET_FOOTER_H = 64;
export const SHEET_FOOTER_PAD_X = 20;
export const SHEET_FOOTER_BTN_H = 44;
const SHEET_FOOTER_GAP = 8;
const SHEET_FOOTER_ICON = 18;

export interface SheetFooterButton {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  accentColor?: string;
}

interface SheetFooterProps {
  buttons: SheetFooterButton[];
}

function SheetIconButton({
  label,
  icon,
  onClick,
  variant = "secondary",
  accentColor,
}: SheetFooterButton) {
  const isPrimary = variant === "primary";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex-1 min-w-0 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-[0.98]"
      style={{
        height: SHEET_FOOTER_BTN_H,
        background: isPrimary ? s.sheetBtnBgActive : c.entitySurfaceIdle,
        border: b.sheetBtn,
        color: accentColor ?? (isPrimary ? c.title : c.actionSecondaryLabel),
        cursor: "pointer",
      }}
    >
      {icon}
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
        <SheetIconButton key={btn.key} {...btn} />
      ))}
    </footer>
  );
}

export const SHEET_FOOTER_ICON_SIZE = SHEET_FOOTER_ICON;
