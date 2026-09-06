import { addDays, format, parse, subDays } from "date-fns";
import { CalendarClock } from "lucide-react";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useSelectChipGestures } from "../select/useSelectChipGestures";
import { SessionDatePickerSheet } from "./SessionDatePickerSheet";

export type SessionDayBadge = {
  id: string;
  /** Main chip text — day + month (+ year when not current year). */
  label: string;
  isToday?: boolean;
  /** After today — shown with a future cue on the chip. */
  isFuture?: boolean;
  isAll?: boolean;
};

const EDGE_THRESHOLD = 4;

function dayMonthLabel(d: Date, thisYear: number): string {
  const base = format(d, "EEE d MMM");
  return d.getFullYear() !== thisYear ? `${base} ${d.getFullYear()}` : base;
}

export function badgeFromDate(d: Date, now = new Date()): SessionDayBadge {
  const thisYear = now.getFullYear();
  const id = format(d, "yyyy-MM-dd");
  const todayId = format(now, "yyyy-MM-dd");
  const isToday = id === todayId;
  return {
    id,
    label: isToday ? `Today · ${format(d, "d MMM")}` : dayMonthLabel(d, thisYear),
    isToday,
    isFuture: id > todayId,
  };
}

function parseBadgeDate(id: string, fallback = new Date()): Date {
  const parsed = parse(id, "yyyy-MM-dd", fallback);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/** Keep All pinned first; day chips newest → oldest (yyyy-MM-dd desc). */
export function sortSessionDayBadges(badges: SessionDayBadge[]): SessionDayBadge[] {
  const all = badges.filter((b) => b.isAll);
  const days = badges
    .filter((b) => !b.isAll)
    .sort((a, b) => b.id.localeCompare(a.id));
  return [...all, ...days];
}

/** Build filter badges from work-date ids (always includes Today + All). */
export function buildSessionDayFilterBadges(
  workDateIds: readonly string[],
  now = new Date(),
): SessionDayBadge[] {
  const todayId = format(now, "yyyy-MM-dd");
  const ids = new Set<string>([todayId, ...workDateIds]);
  return sortSessionDayBadges([
    { id: "all", label: "All dates", isAll: true },
    ...[...ids].map((id) => badgeFromDate(parseBadgeDate(id, now), now)),
  ]);
}

/** Mock work days — Today always included; one other-year chip demos year in the label. */
export function buildMockSessionDayBadges(now = new Date()): SessionDayBadge[] {
  const otherYear = new Date(now.getFullYear() - 1, 11, 18); // 18 Dec previous year

  return sortSessionDayBadges([
    { id: "all", label: "All dates", isAll: true },
    badgeFromDate(now, now),
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
}: {
  badge: SessionDayBadge;
  selected: boolean;
  /** When All filter is on, every day chip looks selected. */
  allMode: boolean;
  onSelect: () => void;
  onOpenCalendar?: () => void;
}) {
  const isAll = Boolean(badge.isAll);
  const isFuture = Boolean(badge.isFuture);
  const visuallySelected = isAll ? allMode : allMode || selected;

  const gestures = useSelectChipGestures({
    mode: "select",
    onTap: onSelect,
    onDoubleTap: isAll ? undefined : onOpenCalendar,
  });

  const ariaExtra = isAll
    ? allMode
      ? ", selected. Showing all days"
      : ", tap to show all dates"
    : [
        isFuture ? ", upcoming" : "",
        selected && !allMode
          ? ", selected. Double-tap to edit date"
          : ", tap to filter this day. Double-tap to edit date",
      ].join("");

  return (
    <button
      type="button"
      role="option"
      className={`select-chip session-day-filter__chip${
        isAll ? " session-day-filter__chip--all" : ""
      }`}
      data-selected={visuallySelected ? "" : undefined}
      data-today={badge.isToday ? "" : undefined}
      data-future={isFuture ? "" : undefined}
      aria-selected={visuallySelected}
      aria-label={`${badge.label}${ariaExtra}`}
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
        <span>{badge.label}</span>
      </span>
    </button>
  );
}

/**
 * Horizontal day filter badges.
 * All dates stays pinned; day chips scroll with edge fades.
 * Tap = choose All dates or one day · double-tap day = date picker sheet.
 */
export function SessionDayFilterBar({
  badges: badgesProp,
  selectedId: selectedIdProp,
  onSelectedIdChange,
  onConfirmDayChange,
}: {
  badges?: SessionDayBadge[];
  selectedId?: string;
  onSelectedIdChange?: (id: string) => void;
  /**
   * Controlled day remap: `fromDayId` double-tapped → `toDate` confirmed.
   * Today → other day should add/select without rewriting Today.
   */
  onConfirmDayChange?: (fromDayId: string, toDate: Date) => void;
}) {
  const controlled = selectedIdProp != null && onSelectedIdChange != null;
  const [internalBadges, setInternalBadges] = useState(buildMockSessionDayBadges);
  const [internalSelectedId, setInternalSelectedId] = useState<string>("all");
  const badges = badgesProp ?? internalBadges;
  const selectedId = controlled ? selectedIdProp! : internalSelectedId;
  const setSelectedId = controlled ? onSelectedIdChange! : setInternalSelectedId;

  const allBadge = badges.find((b) => b.isAll) ?? badges[0];
  const dayBadges = useMemo(
    () =>
      badges
        .filter((b) => !b.isAll)
        .sort((a, b) => b.id.localeCompare(a.id)),
    [badges],
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const allMode = selectedId === "all";
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollEdges = useHorizontalScrollFades(scrollRef, dayBadges.length);

  const editingBadge =
    editingBadgeId != null
      ? dayBadges.find((b) => b.id === editingBadgeId) ?? null
      : null;
  const pickerInitialDate = editingBadge
    ? parseBadgeDate(editingBadge.id)
    : new Date();

  const selectDay = (id: string) => {
    setSelectedId(id);
  };

  const openCalendar = (badge: SessionDayBadge) => {
    if (badge.isAll) return;
    setEditingBadgeId(badge.id);
    setSelectedId(badge.id);
    setPickerOpen(true);
  };

  const applyPickedDate = (date: Date) => {
    if (!editingBadgeId) {
      setSelectedId(format(date, "yyyy-MM-dd"));
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

  return (
    <div className="session-day-filter select-view">
      <div className="session-day-filter__row">
        {allBadge ? (
          <div className="session-day-filter__pinned">
            <SessionDayBadgeChip
              badge={allBadge}
              selected={selectedId === allBadge.id}
              allMode={allMode}
              onSelect={() => selectDay(allBadge.id)}
            />
          </div>
        ) : null}

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
            aria-label="Session dates"
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
              />
            ))}
          </div>
        </div>
      </div>

      <SessionDatePickerSheet
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open) setEditingBadgeId(null);
        }}
        initialDate={pickerInitialDate}
        onConfirm={applyPickedDate}
      />
    </div>
  );
}
