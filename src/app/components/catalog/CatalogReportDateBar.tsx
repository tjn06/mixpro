import { format, isYesterday, isToday, parse } from "date-fns";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CalendarIcon, DeleteIcon } from "../shared/ActionIcons";
import { SessionDatePickerSheet } from "../sessions/SessionDatePickerSheet";

function dayMonthLabel(d: Date, thisYear: number): string {
  const base = format(d, "EEE d MMM");
  return d.getFullYear() !== thisYear ? `${base} ${d.getFullYear()}` : base;
}

/** Label: Today/Yesterday prefix + weekday date, or plain date. */
export function formatCatalogReportDateLabel(
  workDateId: string,
  todayLabel: string,
  yesterdayLabel: string,
  now = new Date(),
): string {
  const parsed = parse(workDateId, "yyyy-MM-dd", now);
  if (Number.isNaN(parsed.getTime())) return workDateId;
  const datePart = dayMonthLabel(parsed, now.getFullYear());
  if (isToday(parsed)) return `${todayLabel}, ${datePart}`;
  if (isYesterday(parsed)) return `${yesterdayLabel}, ${datePart}`;
  return datePart;
}

/**
 * Optional single-date control (Tools/Consumables report + Sessions hub filter).
 * Tap opens the calendar; trailing trash clears → empty label.
 */
export function CatalogReportDateBar({
  workDateId,
  onWorkDateChange,
  ariaLabel,
  pickerSubtitle,
  emptyLabel,
  changeTitle,
  formatSelectedLabel,
  leadingIcon,
  confirmIcon,
  confirmLabel,
  className,
}: {
  /** `yyyy-MM-dd` or null when unset. */
  workDateId: string | null;
  onWorkDateChange: (next: string | null) => void;
  ariaLabel?: string;
  pickerSubtitle?: string;
  /** Shown when no date is set. */
  emptyLabel?: string;
  /** Sheet title when a date is already set. */
  changeTitle?: string;
  /** Wrap the formatted date when a day is selected (e.g. “Filter: Today, …”). */
  formatSelectedLabel?: (formattedDate: string) => string;
  /** Leading chip icon — defaults to calendar. */
  leadingIcon?: ReactNode;
  /** Footer confirm icon in the date sheet. */
  confirmIcon?: ReactNode;
  /** Footer confirm label in the date sheet. */
  confirmLabel?: string;
  /** Extra class on the outer bar (e.g. sessions hub flush inset). */
  className?: string;
}) {
  const { t } = useTranslation("common");
  const resolvedAria = ariaLabel ?? t("common.reportDate");
  const resolvedSubtitle =
    pickerSubtitle ?? t("sessions.datePickerSubtitle");
  const resolvedEmpty = emptyLabel ?? t("common.addDate");
  const resolvedChange = changeTitle ?? t("common.changeDate");
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasDate = Boolean(workDateId);
  const label = useMemo(() => {
    if (!workDateId) return resolvedEmpty;
    const formatted = formatCatalogReportDateLabel(
      workDateId,
      t("common.today"),
      t("common.yesterday"),
    );
    return formatSelectedLabel ? formatSelectedLabel(formatted) : formatted;
  }, [workDateId, resolvedEmpty, formatSelectedLabel, t]);
  const initialDate = useMemo(() => {
    if (!workDateId) return new Date();
    const parsed = parse(workDateId, "yyyy-MM-dd", new Date());
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [workDateId]);
  const chipIcon = leadingIcon ?? <CalendarIcon size={14} />;

  return (
    <>
      <div
        className={[
          "catalog-report-date-bar",
          "select-view",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={resolvedAria}
      >
        <div className="catalog-report-date-bar__row">
          <div
            className="catalog-report-date-bar__chip"
            data-selected={hasDate ? "" : undefined}
            data-empty={hasDate ? undefined : ""}
          >
            <button
              type="button"
              className="catalog-report-date-bar__main"
              aria-label={
                hasDate ? `${resolvedChange}, ${label}` : resolvedEmpty
              }
              onClick={() => setPickerOpen(true)}
            >
              <span className="catalog-report-date-bar__icon" aria-hidden>
                {chipIcon}
              </span>
              <span className="catalog-report-date-bar__label">{label}</span>
            </button>
            {hasDate ? (
              <button
                type="button"
                className="catalog-report-date-bar__delete"
                aria-label={t("common.clearDate")}
                title={t("common.clearDate")}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onWorkDateChange(null);
                }}
              >
                <DeleteIcon size={14} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <SessionDatePickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialDate={initialDate}
        title={hasDate ? resolvedChange : resolvedEmpty}
        subtitle={resolvedSubtitle}
        confirmIcon={confirmIcon}
        confirmLabel={confirmLabel}
        onConfirm={(date) => {
          onWorkDateChange(format(date, "yyyy-MM-dd"));
        }}
      />
    </>
  );
}
