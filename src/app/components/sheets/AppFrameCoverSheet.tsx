import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { APP_FRAME_COVER_SHEET_CLASS } from "./sheetChrome";
import { useAppFrameCoverTop } from "./useAppFrameCoverTop";

export interface AppFrameCoverSheetProps {
  open: boolean;
  zIndex: number;
  ariaLabelledBy: string;
  children: ReactNode;
  className?: string;
}

/**
 * Full-bleed sheet from below the main header bar — covers subline and recipe
 * zone. Always portaled into `.app-frame` so nested callers (pickers, etc.)
 * still cover the whole screen with opaque chrome.
 */
export function AppFrameCoverSheet({
  open,
  zIndex,
  ariaLabelledBy,
  children,
  className = "",
}: AppFrameCoverSheetProps) {
  const coverTop = useAppFrameCoverTop(open);
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPortal(null);
      return;
    }
    setPortal(document.querySelector<HTMLElement>(".app-frame"));
  }, [open]);

  if (!open || coverTop == null || !portal) return null;

  return createPortal(
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col pointer-events-auto app-frame-cover-anchor"
      style={{ top: coverTop, zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
    >
      <div
        className={`${APP_FRAME_COVER_SHEET_CLASS} app-frame-cover-sheet--enter flex flex-col min-h-0 flex-1 overflow-hidden ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    portal,
  );
}
