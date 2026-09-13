import { addDays, format, parse, subDays } from "date-fns";
import { CalendarCheck, CalendarClock, Plus } from "lucide-react";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import { useSelectChipGestures } from "../select/useSelectChipGestures";
import { ConfirmDeleteSheet } from "../sheets/ConfirmDeleteSheet";
import { SessionDatePickerSheet } from "./SessionDatePickerSheet";

export type SessionDayBadge = {
  id: string;
  /** Main chip text — day + month (+ year when not current year). */
  label: string;
  isToday?: boolean;
  /**
   * Today before any content lands on that day — dashed “Today” placeholder.
   */
  isProvisional?: boolean;
  /** After today — shown with a future cue on the chip. */
  isFuture?: boolean;
  isAll?: boolean;
};

const EDGE_THRESHOLD = 4;
const PIN_ICON_SIZE = 15;

function dayMonthLabel(d: Date, thisYear: number): string {
  const base = format(d, "EEE d MMM");
  return d.getFullYear() !== thisYear ? `${base} ${d.getFullYear()}` : base;
}

export function badgeFromDate(
  d: Date,
  now = new Date(),
  opts?: { provisional?: boolean },
): SessionDayBadge {
  const thisYear = now.getFullYear();
  const id = format(d, "yyyy-MM-dd");
  const todayId = format(now, "yyyy-MM-dd");
  const isToday = id === todayId;
  const isProvisional = Boolean(opts?.provisional && isToday);
  return {
    id,
    label: isProvisional ? "Today" : dayMonthLabel(d, thisYear),
    isToday,
    isProvisional,
    isFuture: id > todayId,
  };
}

function parseBadgeDate(id: string, fallback = new Date()): Date {
  const parsed = parse(id, "yyyy-MM-dd", fallback);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function asIdSet(
  ids?: ReadonlySet<string> | readonly string[],
): Set<string> | null {
  if (ids == null) return null;
  return ids instanceof Set ? ids : new Set(ids);
}

/** Keep All pinned first; day chips newest → oldest (yyyy-MM-dd desc). */
export function sortSessionDayBadges(badges: SessionDayBadge[]): SessionDayBadge[] {
  const all = badges.filter((b) => b.isAll);
  const days = badges
    .filter((b) => !b.isAll)
    .sort((a, b) => b.id.localeCompare(a.id));
  return [...all, ...days];
}

/**
 * Build filter badges from work-date ids (always includes Today + All).
 * Pass `populatedDayIds` (days with mixes/tools/cons) so Today stays provisional
 * until that day has real content.
 */
export function buildSessionDayFilterBadges(
  workDateIds: readonly string[],
  now = new Date(),
  populatedDayIds?: ReadonlySet<string> | readonly string[],
): SessionDayBadge[] {
  const todayId = format(now, "yyyy-MM-dd");
  const populated = asIdSet(populatedDayIds);
  const ids = new Set<string>([todayId, ...workDateIds]);
  return sortSessionDayBadges([
    { id: "all", label: "All dates", isAll: true },
    ...[...ids].map((id) => {
      const provisional = id === todayId && !(populated?.has(id) ?? false);
      return badgeFromDate(parseBadgeDate(id, now), now, { provisional });
    }),
  ]);
}

/** Mock work days — Today always included; one other-year chip demos year in the label. */
export function buildMockSessionDayBadges(now = new Date()): SessionDayBadge[] {
  const otherYear = new Date(now.getFullYear() - 1, 11, 18); // 18 Dec previous year

  return sortSessionDayBadges([
    { id: "all", label: "All dates", isAll: true },
    badgeFromDate(now, now, { provisional: true }),
    badgeFromDate(subDays(now, 1), now),
    badgeFromDate(subDays(now, 2), now),
    badgeFromDate(addDays(now, 1), now),
    badgeFromDate(addDays(now, 2), now),
    badgeFromDate(otherYear, now),
  ]);
}

function useHorizontalScrollFades(
  scrollRef: RefObject<HTMLElement | null>,
  watchKey?: unknown,
) {
  const [edges, setEdges] = useState({ fromStart: false, fromEnd: false });

  const sync = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canScroll = el.scrollWidth > el.clientWidth + EDGE_THRESHOLD;
    setEdges({
      fromStart: canScroll && el.scrollLeft > EDGE_THRESHOLD,
      fromEnd:
        canScroll &&
        el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_THRESHOLD,
    });
  }, [scrollRef]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      sync();
      raf2 = requestAnimationFrame(sync);
    });

    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const ro = new ResizeObserver(sync);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      ro.disconnect();
    };
  }, [scrollRef, sync, watchKey]);

  return edges;
}

function SessionDayBadgeChip({
  badge,
  selected,
  allMode,
  onSelect,
  onOpenCalendar,
  onLongPress,
}: {
  badge: SessionDayBadge;
  selected: boolean;
  /** When All filter is on, every day chip looks selected. */
  allMode: boolean;
  onSelect: () => void;
  onOpenCalendar?: () => void;
  onLongPress?: () => void;
}) {
  const { t } = useTranslation("common");
  const isFuture = Boolean(badge.isFuture);
  const isProvisional = Boolean(badge.isProvisional);
  const visuallySelected = allMode || selected;
  const displayLabel = isProvisional ? t("common.today") : badge.label;

  const gestures = useSelectChipGestures({
    mode: "select",
    onTap: onSelect,
    onDoubleTap: onOpenCalendar,
    onLongPress,
  });

  const ariaExtra = [
    isProvisional ? `, ${t("sessions.dayProvisional")}` : "",
    isFuture ? `, ${t("sessions.dayUpcoming")}` : "",
    selected && !allMode
      ? `, ${t("sessions.daySelectedHint")}`
      : `, ${t("sessions.dayTapHint")}`,
  ].join("");

  return (
    <button
      type="button"
      role="option"
      className="select-chip session-day-filter__chip"
      data-selected={visuallySelected ? "" : undefined}
      data-today={badge.isToday ? "" : undefined}
      data-provisional={isProvisional ? "" : undefined}
      data-future={isFuture ? "" : undefined}
      aria-selected={visuallySelected}
      aria-label={`${displayLabel}${ariaExtra}`}
      {...gestures}
    >
      <span className="select-chip__label session-day-filter__chip-label">
        {isFuture ? (
          <CalendarClock
            className="session-day-filter__future-icon"
            size={12}
            strokeWidth={2.25}
            aria-hidden
          />
        ) : null}
        <span>{displayLabel}</span>
      </span>
    </button>
  );
}

/**
 * Horizontal day filter badges.
 * Pinned: All (icon) + add day · scrollable day chips ·
 * double-tap = remap calendar · long-press = delete day confirm.
 */
export function SessionDayFilterBar({
  badges: badgesProp,
  selectedId: selectedIdProp,
  onSelectedIdChange,
  onConfirmDayChange,
  onDeleteDay,
  dayHasContent,
  onAddDay,
}: {
  badges?: SessionDayBadge[];
  selectedId?: string;
  onSelectedIdChange?: (id: string) => void;
  /**
   * Controlled day remap: `fromDayId` double-tapped → `toDate` confirmed.
   * Today → other day should add/select without rewriting Today.
   */
  onConfirmDayChange?: (fromDayId: string, toDate: Date) => void;
  /** Long-press → Delete: clear that day's content (and drop non-Today chips). */
  onDeleteDay?: (dayId: string) => void;
  /** When false, long-press delete is ignored (empty provisional Today). */
  dayHasContent?: (dayId: string) => boolean;
  /** Pinned + control — add a custom day from the calendar. */
  onAddDay?: (date: Date) => void;
}) {
  const { t } = useTranslation("common");
  const controlled = selectedIdProp != null && onSelectedIdChange != null;
  const [internalBadges, setInternalBadges] = useState(buildMockSessionDayBadges);
  const [internalSelectedId, setInternalSelectedId] = useState<string>("all");
  const badges = badgesProp ?? internalBadges;
  const selectedId = controlled ? selectedIdProp! : internalSelectedId;
  const setSelectedId = controlled ? onSelectedIdChange! : setInternalSelectedId;

  const dayBadges = useMemo(
    () =>
      badges
        .filter((b) => !b.isAll)
        .sort((a, b) => b.id.localeCompare(a.id)),
    [badges],
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"add" | "edit">("edit");
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [deleteBadgeId, setDeleteBadgeId] = useState<string | null>(null);
  const allMode = selectedId === "all";
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollEdges = useHorizontalScrollFades(scrollRef, dayBadges.length);

  const editingBadge =
    editingBadgeId != null
      ? dayBadges.find((b) => b.id === editingBadgeId) ?? null
      : null;
  const deleteBadge =
    deleteBadgeId != null
      ? dayBadges.find((b) => b.id === deleteBadgeId) ?? null
      : null;
  const pickerInitialDate = editingBadge
    ? parseBadgeDate(editingBadge.id)
    : new Date();

  const deleteLabel = deleteBadge
    ? deleteBadge.isProvisional
      ? t("common.today")
      : deleteBadge.label
    : "";

  const selectDay = (id: string) => {
    setSelectedId(id);
  };

  const openCalendar = (badge: SessionDayBadge) => {
    setPickerMode("edit");
    setEditingBadgeId(badge.id);
    setSelectedId(badge.id);
    setPickerOpen(true);
  };

  const openAddCalendar = () => {
    setPickerMode("add");
    setEditingBadgeId(null);
    setPickerOpen(true);
  };

  const openDeleteConfirm = (badge: SessionDayBadge) => {
    const emptyToday =
      badge.isToday && !(dayHasContent?.(badge.id) ?? false);
    if (emptyToday) return;
    setSelectedId(badge.id);
    setDeleteBadgeId(badge.id);
  };

  const applyPickedDate = (date: Date) => {
    if (pickerMode === "add" || !editingBadgeId) {
      const nextId = format(date, "yyyy-MM-dd");
      if (onAddDay) {
        onAddDay(date);
      } else if (!badgesProp) {
        const next = badgeFromDate(date);
        setInternalBadges((prev) => {
          if (prev.some((b) => b.id === next.id)) return prev;
          return sortSessionDayBadges([...prev, next]);
        });
        setSelectedId(nextId);
      } else {
        setSelectedId(nextId);
      }
      return;
    }

    if (onConfirmDayChange) {
      onConfirmDayChange(editingBadgeId, date);
      return;
    }

    if (badgesProp) {
      setSelectedId(format(date, "yyyy-MM-dd"));
      return;
    }

    const next = badgeFromDate(date);
    const editingWasToday =
      dayBadges.find((b) => b.id === editingBadgeId)?.isToday === true;

    setInternalBadges((prev) => {
      const collision = prev.find((b) => !b.isAll && b.id === next.id);
      if (collision) {
        if (editingBadgeId === next.id || editingWasToday) {
          return sortSessionDayBadges(prev);
        }
        return sortSessionDayBadges(
          prev.filter((b) => b.isAll || b.id !== editingBadgeId),
        );
      }

      if (editingWasToday) {
        return sortSessionDayBadges([...prev, next]);
      }

      return sortSessionDayBadges(
        prev.map((b) => (b.id === editingBadgeId ? next : b)),
      );
    });
    setSelectedId(next.id);
    setEditingBadgeId(next.id);
  };

  const confirmDeleteDay = () => {
    if (!deleteBadgeId) return;
    if (onDeleteDay) {
      onDeleteDay(deleteBadgeId);
      return;
    }
    if (badgesProp) return;
    const wasToday =
      dayBadges.find((b) => b.id === deleteBadgeId)?.isToday === true;
    if (wasToday) return;
    setInternalBadges((prev) =>
      sortSessionDayBadges(prev.filter((b) => b.id !== deleteBadgeId)),
    );
    if (selectedId === deleteBadgeId) setSelectedId("all");
  };

  return (
    <div className="session-day-filter select-view">
      <div className="session-day-filter__row">
        <div className="session-day-filter__pinned" role="group" aria-label={t("sessions.dateFilterAria")}>
          <button
            type="button"
            className="select-chip session-day-filter__chip session-day-filter__chip--icon"
            data-selected={allMode ? "" : undefined}
            aria-pressed={allMode}
            aria-label={
              allMode
                ? t("sessions.allDatesSelected")
                : t("sessions.showAllDates")
            }
            title={t("sessions.allDates")}
            onClick={() => selectDay("all")}
          >
            <CalendarCheck size={PIN_ICON_SIZE} strokeWidth={2.25} aria-hidden />
          </button>
          <button
            type="button"
            className="select-chip session-day-filter__chip session-day-filter__chip--icon session-day-filter__chip--add"
            aria-label={t("common.addDate")}
            title={t("common.addDate")}
            onClick={openAddCalendar}
          >
            <Plus size={PIN_ICON_SIZE} strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        <div className="session-day-filter__scroll-shell">
          <div
            className="session-day-filter__fade session-day-filter__fade--start"
            data-visible={scrollEdges.fromStart ? "" : undefined}
            aria-hidden
          />
          <div
            className="session-day-filter__fade session-day-filter__fade--end"
            data-visible={scrollEdges.fromEnd ? "" : undefined}
            aria-hidden
          />
          <div
            ref={scrollRef}
            className="session-day-filter__scroll"
            role="listbox"
            aria-label={t("sessions.sessionDatesAria")}
            aria-orientation="horizontal"
          >
            {dayBadges.map((badge) => (
              <SessionDayBadgeChip
                key={badge.id}
                badge={badge}
                selected={selectedId === badge.id}
                allMode={allMode}
                onSelect={() => selectDay(badge.id)}
                onOpenCalendar={() => openCalendar(badge)}
                onLongPress={() => openDeleteConfirm(badge)}
              />
            ))}
          </div>
        </div>
      </div>

      <SessionDatePickerSheet
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open) {
            setEditingBadgeId(null);
            setPickerMode("edit");
          }
        }}
        initialDate={pickerInitialDate}
        onConfirm={applyPickedDate}
      />

      <ConfirmDeleteSheet
        open={deleteBadge != null}
        onOpenChange={(open) => {
          if (!open) setDeleteBadgeId(null);
        }}
        itemLabel={deleteLabel}
        title={t("sessions.dayDeleteTitle")}
        body={t("sessions.dayDeleteBody", { date: deleteLabel })}
        onConfirm={confirmDeleteDay}
      />
    </div>
  );
}
