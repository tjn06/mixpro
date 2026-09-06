import { addDays, format, subDays } from "date-fns";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  SELECT_CHIP_DOUBLE_TAP_MS,
  useSelectChipGestures,
} from "../select/useSelectChipGestures";

export type SessionDayBadge = {
  id: string;
  /** Main chip text — day + month (+ year when not current year). */
  label: string;
  isToday?: boolean;
  isAll?: boolean;
};

const EDGE_THRESHOLD = 4;

function dayMonthLabel(d: Date, thisYear: number): string {
  const base = format(d, "EEE d MMM");
  return d.getFullYear() !== thisYear ? `${base} ${d.getFullYear()}` : base;
}

/** Mock work days — Today always included; one other-year chip demos year in the label. */
export function buildMockSessionDayBadges(now = new Date()): SessionDayBadge[] {
  const thisYear = now.getFullYear();

  const entry = (d: Date, opts?: { isToday?: boolean }): SessionDayBadge => ({
    id: format(d, "yyyy-MM-dd"),
    label: opts?.isToday
      ? `Today · ${format(d, "d MMM")}`
      : dayMonthLabel(d, thisYear),
    isToday: opts?.isToday,
  });

  const otherYear = new Date(thisYear - 1, 11, 18); // 18 Dec previous year

  return [
    { id: "all", label: "All dates", isAll: true },
    entry(now, { isToday: true }),
    entry(subDays(now, 1)),
    entry(subDays(now, 2)),
    entry(addDays(now, 1)),
    entry(addDays(now, 2)),
    entry(otherYear),
  ];
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
  onOpenCalendar: () => void;
}) {
  const isAll = Boolean(badge.isAll);
  const visuallySelected = isAll ? allMode : allMode || selected;
  const lastTapAtRef = useRef(0);

  const gestures = useSelectChipGestures({
    mode: "select",
    onTap: () => {
      if (isAll) {
        onSelect();
        return;
      }
      const now = performance.now();
      if (selected && !allMode && now - lastTapAtRef.current <= SELECT_CHIP_DOUBLE_TAP_MS) {
        lastTapAtRef.current = 0;
        onOpenCalendar();
        return;
      }
      lastTapAtRef.current = now;
      if (!selected || allMode) onSelect();
    },
  });

  const ariaExtra = isAll
    ? allMode
      ? ", selected. Showing all days"
      : ", tap to show all dates"
    : selected && !allMode
      ? ", selected. Double-tap to edit date"
      : ", tap to filter this day";

  return (
    <button
      type="button"
      role="option"
      className={`select-chip session-day-filter__chip${
        isAll ? " session-day-filter__chip--all" : ""
      }`}
      data-selected={visuallySelected ? "" : undefined}
      data-today={badge.isToday ? "" : undefined}
      aria-selected={visuallySelected}
      aria-label={`${badge.label}${ariaExtra}`}
      {...gestures}
    >
      <span className="select-chip__label">{badge.label}</span>
    </button>
  );
}

/**
 * Horizontal day filter badges (mock data).
 * All dates stays pinned; day chips scroll with edge fades.
 * Tap = choose All dates or one day · double-tap day = calendar hint (no lib yet).
 */
export function SessionDayFilterBar({
  badges: badgesProp,
}: {
  badges?: SessionDayBadge[];
}) {
  const badges = useMemo(
    () => badgesProp ?? buildMockSessionDayBadges(),
    [badgesProp],
  );
  const allBadge = badges.find((b) => b.isAll) ?? badges[0];
  const dayBadges = useMemo(() => badges.filter((b) => !b.isAll), [badges]);

  /** `all` or a concrete day id. */
  const [selectedId, setSelectedId] = useState<string>("all");
  const [calendarHint, setCalendarHint] = useState<string | null>(null);
  const allMode = selectedId === "all";
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollEdges = useHorizontalScrollFades(scrollRef, dayBadges.length);

  useEffect(() => {
    if (!calendarHint) return;
    const id = window.setTimeout(() => setCalendarHint(null), 1600);
    return () => window.clearTimeout(id);
  }, [calendarHint]);

  const openCalendarMock = (badge: SessionDayBadge) => {
    setCalendarHint(`Calendar · edit ${badge.label}`);
    setSelectedId(badge.id);
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
              onSelect={() => setSelectedId(allBadge.id)}
              onOpenCalendar={() => openCalendarMock(allBadge)}
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
                onSelect={() => setSelectedId(badge.id)}
                onOpenCalendar={() => openCalendarMock(badge)}
              />
            ))}
          </div>
        </div>
      </div>
      <p
        className={`session-day-filter__hint app-gutter-x${
          calendarHint ? " session-day-filter__hint--visible" : ""
        }`}
        aria-live="polite"
      >
        {calendarHint ?? ""}
      </p>
    </div>
  );
}
