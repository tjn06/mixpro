import { CloseIcon } from "../shared/ActionIcons";
import {
  SHEET_SUBTITLE,
  SHEET_TITLE,
  SHEET_COVER_HEADER_STYLE,
  SHEET_COVER_FORM_SPACING,
} from "./sheetChrome";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { SettingsForm } from "../settings/SettingsForm";

const SHEET_PAD_X = 20;

export interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Legacy cover sheet — prefer Settings page via app navigation. */
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
        <SettingsForm />
      </div>

      <SheetFooter
        buttons={[
          {
            key: "close",
            label: "Close",
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick={() => onOpenChange(false)},
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}
