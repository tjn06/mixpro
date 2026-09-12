import { format, isYesterday, isToday, parse } from "date-fns";
import { useMemo, useState } from "react";
import { DeleteIcon } from "../shared/ActionIcons";
import { SessionDatePickerSheet } from "../sessions/SessionDatePickerSheet";

function dayMonthLabel(d: Date, thisYear: number): string {
  const base = format(d, "EEE d MMM");
  return d.getFullYear() !== thisYear ? `${base} ${d.getFullYear()}` : base;
}

/** Label: Today/Yesterday prefix + weekday date, or plain date. */
export function formatCatalogReportDateLabel(
  workDateId: string,
  now = new Date(),
): string {
  const parsed = parse(workDateId, "yyyy-MM-dd", now);
  if (Number.isNaN(parsed.getTime())) return workDateId;
  const datePart = dayMonthLabel(parsed, now.getFullYear());
  if (isToday(parsed)) return `Today, ${datePart}`;
  if (isYesterday(parsed)) return `Yesterday, ${datePart}`;
  return datePart;
}

/**
 * Hub Tools / Consumables Report only — single optional date (not session).
 * Tap opens the calendar; trailing trash clears → “Add date”.
 */
export function CatalogReportDateBar({
  workDateId,
  onWorkDateChange,
  ariaLabel = "Report date",
  pickerSubtitle = "Optional work day for this report.",
}: {
  /** `yyyy-MM-dd` or null when unset. */
  workDateId: string | null;
  onWorkDateChange: (next: string | null) => void;
  ariaLabel?: string;
  pickerSubtitle?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasDate = Boolean(workDateId);
  const label = useMemo(
    () =>
      workDateId ? formatCatalogReportDateLabel(workDateId) : "Add date",
    [workDateId],
  );
  const initialDate = useMemo(() => {
    if (!workDateId) return new Date();
    const parsed = parse(workDateId, "yyyy-MM-dd", new Date());
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [workDateId]);

  return (
    <>
      <div
        className="catalog-report-date-bar select-view"
        aria-label={ariaLabel}
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
              aria-label={hasDate ? `Change date, ${label}` : "Add date"}
              onClick={() => setPickerOpen(true)}
            >
              <span className="catalog-report-date-bar__label">{label}</span>
            </button>
            {hasDate ? (
              <button
                type="button"
                className="catalog-report-date-bar__delete"
                aria-label="Clear date"
                title="Clear date"
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
        title={hasDate ? "Change date" : "Add date"}
        subtitle={pickerSubtitle}
        onConfirm={(date) => {
          onWorkDateChange(format(date, "yyyy-MM-dd"));
        }}
      />
    </>
  );
}
