import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { CloseIcon, CalendarIcon } from "../shared/ActionIcons";
import { AppFrameCoverSheet } from "../sheets/AppFrameCoverSheet";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "../sheets/SheetCloseButton";
import {
  SHEET_COVER_FORM_HEADER_STYLE,
  SHEET_SUBTITLE_CLASS,
  SHEET_TITLE_CLASS,
} from "../sheets/sheetChrome";

export function SessionDatePickerSheet({
  open,
  onOpenChange,
  initialDate,
  onConfirm,
  title,
  subtitle,
  confirmLabel,
  confirmIcon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: Date;
  onConfirm: (date: Date) => void;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  /** Footer confirm affordance — defaults to calendar (not save). */
  confirmIcon?: ReactNode;
}) {
  const { t } = useTranslation("common");
  const resolvedTitle = title ?? t("sessions.datePickerTitle");
  const resolvedSubtitle = subtitle ?? t("sessions.datePickerSubtitle");
  const resolvedConfirm = confirmLabel ?? t("common.apply");
  const [selected, setSelected] = useState<Date | undefined>(initialDate);

  useEffect(() => {
    if (!open) return;
    setSelected(initialDate);
  }, [open, initialDate]);

  if (!open) return null;

  const canConfirm = selected != null;
  const applyIcon = confirmIcon ?? (
    <CalendarIcon size={SHEET_FOOTER_ICON_SIZE} />
  );

  return (
    <AppFrameCoverSheet
      open={open}
      zIndex={42}
      ariaLabelledBy="session-date-picker-title"
      className="session-date-picker-sheet"
    >
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_FORM_HEADER_STYLE}
      >
        <h2 id="session-date-picker-title" className={SHEET_TITLE_CLASS}>
          {resolvedTitle}
        </h2>
        <p className={SHEET_SUBTITLE_CLASS}>{resolvedSubtitle}</p>
      </header>

      <div className="session-date-picker-sheet__body app-gutter-x flex-1 min-h-0 overflow-y-auto overscroll-none">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={setSelected}
          defaultMonth={selected ?? initialDate}
          className="session-date-picker"
          animate
        />
      </div>

      <SheetFooter
        buttons={[
          {
            key: "close",
            label: t("common.close"),
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
          },
          {
            key: "apply",
            label: resolvedConfirm,
            icon: applyIcon,
            onClick: () => {
              if (!selected) return;
              onConfirm(selected);
              onOpenChange(false);
            },
            disabled: !canConfirm,
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}
