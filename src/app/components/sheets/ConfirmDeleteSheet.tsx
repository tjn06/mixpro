import { useId } from "react";
import { useTranslation } from "react-i18next";
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
  title,
  body,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string;
  title?: string;
  body?: string;
  onConfirm: () => void;
}) {
  const { t } = useTranslation("common");
  const titleId = useId();
  const resolvedTitle = title ?? t("sheets.delete.title");
  const name = itemLabel || t("sheets.delete.fallbackName");
  const resolvedBody = body ?? t("sheets.delete.body", { name });

  return (
    <AppFrameCoverSheet open={open} zIndex={90} ariaLabelledBy={titleId}>
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_FORM_HEADER_STYLE}
      >
        <h2 id={titleId} className={SHEET_TITLE_CLASS}>
          {resolvedTitle}
        </h2>
        <p
          className={SHEET_SUBTITLE_CLASS}
          style={{ maxWidth: 280, textAlign: "center" }}
        >
          {resolvedBody}
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
            label: t("common.close"),
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
            variant: "secondary",
          },
          {
            key: "delete",
            label: t("common.delete"),
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
