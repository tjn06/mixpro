import { useId } from "react";
import { CloseIcon, DeleteIcon } from "../shared/ActionIcons";
import {
  SHEET_COVER_FORM_HEADER_STYLE,
  SHEET_COVER_FORM_SPACING,
  SHEET_SUBTITLE_CLASS,
  SHEET_TITLE_CLASS,
} from "./sheetChrome";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";

const SHEET_PAD_X = 20;
const FORM = SHEET_COVER_FORM_SPACING;

/** In-app delete confirm — same cover chrome as other sheets (not native alert). */
export function ConfirmDeleteSheet({
  open,
  onOpenChange,
  itemLabel,
  title = "Delete custom item",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string;
  title?: string;
  onConfirm: () => void;
}) {
  const titleId = useId();

  return (
    <AppFrameCoverSheet open={open} zIndex={90} ariaLabelledBy={titleId}>
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_FORM_HEADER_STYLE}
      >
        <h2 id={titleId} className={SHEET_TITLE_CLASS}>
          {title}
        </h2>
        <p
          className={SHEET_SUBTITLE_CLASS}
          style={{ maxWidth: 280, textAlign: "center" }}
        >
          Are you sure you want to delete “{itemLabel || "this item"}”? This
          cannot be undone.
        </p>
      </header>

      <div
        className="flex-1 min-h-0"
        style={{
          paddingLeft: SHEET_PAD_X,
          paddingRight: SHEET_PAD_X,
          minHeight: FORM.thumbZoneMinGap,
        }}
        aria-hidden
      />

      <SheetFooter
        buttons={[
          {
            key: "close",
            label: "Close",
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
            variant: "secondary",
          },
          {
            key: "delete",
            label: "Delete",
            icon: <DeleteIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => {
              onConfirm();
              onOpenChange(false);
            },
            variant: "primary",
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}
