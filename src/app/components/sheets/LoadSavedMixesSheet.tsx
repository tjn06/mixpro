import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { APP_HEADER_HEIGHT } from "../shared/AppHeader";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import type { BucketSelection } from "../../domain/bucket/types";
import { CollapseActionsIcon, DeleteIcon, ExpandActionsIcon, GoToIcon, RenameIcon, CloseIcon } from "../shared/ActionIcons";
import { useSavedMixesStore } from "../../saved-mixes/store";
import { savedMixDisplayName } from "../../saved-mixes/display";
import { getHumanSavedTime, getSavedMixTimeSearchText } from "../../saved-mixes/humanSavedTime";
import { useTickingNow } from "../../hooks/useTickingNow";
import { SaveMixNameSheet } from "./SaveMixNameSheet";
import {
  SHEET_FIELD_INPUT_CLASS,
  SHEET_SUBTITLE,
  SHEET_TITLE,
  sheetFieldInputStyle,
} from "./sheetChrome";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { theme } from "../../../theme";

const { colors: c, borders: b, surfaces: s } = theme;

/** Title block — slightly higher than before. */
const HEADER_HEIGHT_FRAC = "32%";
const SEARCH_H = 40;

/** Clearance from scroll-area bottom to thumb stop line (above close footer). */
const THUMB_BOTTOM_INSET = 20;
/** Extra empty space below list so items can scroll into thumb reach. */
const THUMB_PAD_MIN_FRAC = 0.48;

const FADE_H = 36;

/** Two-line compact card — action grid on the right; widens left over content when open. */
const CARD_PAD_X = 14;
const CARD_PAD_Y = 12;
const CARD_GAP = 8;
const ACTION_ICON = 16;
const SWIPE_PANEL_CLOSED_W = 52;
const SWIPE_PANEL_OPEN_W = 104;

/** Solid strip fills — opaque so actions stay visible on the frosted card. */
const STRIP_PANEL_BG = c.entitySurfaceIdle;
const STRIP_BTN_NEUTRAL = c.inputSurface;
const STRIP_BTN_MORE_OPEN = "#1c1c34";
const STRIP_BTN_RENAME = "#222240";
const STRIP_BTN_DELETE = "#3a1824";
const STRIP_BTN_OPEN = "#18182c";
const STRIP_DIVIDER = "1px solid rgba(255,255,255,0.14)";

const CARD_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  columnGap: 8,
  rowGap: 4,
  alignItems: "center",
  padding: `${CARD_PAD_Y}px ${CARD_PAD_X + SWIPE_PANEL_CLOSED_W + 4}px ${CARD_PAD_Y}px ${CARD_PAD_X}px`,
  minWidth: 0,
};

const stripCellBase: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  minWidth: 0,
  borderRadius: 0,
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** Compact list typography. */
const LIST_SIZE = 12;

const LIST_TEXT: CSSProperties = {
  fontSize: LIST_SIZE,
  fontWeight: 500,
  letterSpacing: "0.04em",
  lineHeight: 1.35,
};
const LIST_TITLE: CSSProperties = {
  ...LIST_TEXT,
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 600,
  color: c.title,
};
const LIST_MUTED: CSSProperties = {
  ...LIST_TEXT,
  color: c.muted,
};
const LIST_VALUE: CSSProperties = {
  ...LIST_TEXT,
  fontWeight: 600,
  color: c.value,
};
const LIST_TIMESTAMP: CSSProperties = {
  fontSize: "var(--text-ui-xs)",
  fontWeight: 500,
  letterSpacing: "0.03em",
  lineHeight: 1.25,
  color: c.mutedDimmer,
  fontVariantNumeric: "tabular-nums",
};

const SHEET_MARGIN_X = "var(--app-sheet-margin-x)";
const SHEET_MARGIN_TOP = 6;
const SHEET_RADIUS = 28;
const SHEET_PAD_X = 20;

function bucketLabel(selection: BucketSelection): string {
  return selection === "none" ? "No bucket" : `${selection} L bucket`;
}

function formatTotalKg(grams: number): string {
  return `${(grams / 1000).toFixed(3)} kg`;
}

function mixDetailLine(mix: SavedMixSnapshot): string {
  return [mix.recipeName, bucketLabel(mix.bucketSelection)].join(" • ");
}

function ScrollFade({
  edge,
}: {
  edge: "top" | "bottom";
}) {
  const isTop = edge === "top";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-10"
      style={{
        height: FADE_H,
        ...(isTop ? { top: 0 } : { bottom: 0 }),
        background: isTop
          ? `linear-gradient(to bottom, ${s.loadSheetPanel} 0%, transparent 100%)`
          : `linear-gradient(to top, ${s.loadSheetPanel} 0%, transparent 100%)`,
      }}
    />
  );
}

function SavedMixSwipeStrip({
  open,
  onToggle,
  onOpen,
  onRename,
  onDelete,
}: {
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const cellR1C1: CSSProperties = {
    ...stripCellBase,
    borderRight: STRIP_DIVIDER,
    borderBottom: STRIP_DIVIDER,
    color: open ? c.title : c.muted,
    background: open ? STRIP_BTN_MORE_OPEN : STRIP_BTN_NEUTRAL,
  };
  const cellR1C2: CSSProperties = {
    ...stripCellBase,
    borderRight: "none",
    borderBottom: STRIP_DIVIDER,
    background: STRIP_BTN_DELETE,
    color: c.bucketLimit,
  };
  const cellR2C1: CSSProperties = {
    ...stripCellBase,
    borderRight: open ? STRIP_DIVIDER : "none",
    borderBottom: "none",
    background: STRIP_BTN_OPEN,
    color: c.titleMuted,
  };
  const cellR2C2: CSSProperties = {
    ...stripCellBase,
    background: STRIP_BTN_RENAME,
    color: c.title,
  };

  return (
    <div
      role="group"
      aria-label="Mix actions"
      className={`saved-mix-swipe-panel absolute inset-y-0 right-0 min-h-0 ${
        open ? "saved-mix-swipe-panel--open" : "saved-mix-swipe-panel--closed"
      }`}
      style={{
        width: open ? SWIPE_PANEL_OPEN_W : SWIPE_PANEL_CLOSED_W,
        borderLeft: STRIP_DIVIDER,
        background: STRIP_PANEL_BG,
        zIndex: 2,
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close actions" : "More actions"}
        className="saved-mix-swipe-cell saved-mix-swipe-cell--r1c1 transition-colors duration-150"
        style={cellR1C1}
        onClick={onToggle}
      >
        {open ? <CollapseActionsIcon size={ACTION_ICON} /> : <ExpandActionsIcon size={ACTION_ICON} />}
      </button>

      {open ? (
        <button
          type="button"
          aria-label="Delete"
          className="saved-mix-swipe-cell saved-mix-swipe-cell--r1c2 h-full w-full shrink-0 rounded-none transition-colors duration-150"
          style={cellR1C2}
          onClick={onDelete}
        >
          <DeleteIcon size={ACTION_ICON} />
        </button>
      ) : null}

      <button
        type="button"
        aria-label="Open"
        className="saved-mix-swipe-cell saved-mix-swipe-cell--r2c1 h-full w-full shrink-0 rounded-none transition-colors duration-150"
        style={cellR2C1}
        onClick={onOpen}
      >
        <GoToIcon size={ACTION_ICON} />
      </button>

      {open ? (
        <button
          type="button"
          aria-label="Edit"
          className="saved-mix-swipe-cell saved-mix-swipe-cell--r2c2 transition-colors duration-150"
          style={cellR2C2}
          onClick={onRename}
        >
          <RenameIcon size={ACTION_ICON} />
        </button>
      ) : null}
    </div>
  );
}

function SavedMixRow({
  mix,
  now,
  moreMenuOpen,
  onMoreMenuOpenChange,
  onOpen,
  onDelete,
  onRename,
}: {
  mix: SavedMixSnapshot;
  now: Date;
  moreMenuOpen: boolean;
  onMoreMenuOpenChange: (open: boolean) => void;
  onOpen: (mix: SavedMixSnapshot) => void;
  onDelete: (mix: SavedMixSnapshot) => void;
  onRename: (mix: SavedMixSnapshot) => void;
}) {
  const savedDate = new Date(mix.savedAt);
  const savedTime = getHumanSavedTime(savedDate, now);
  const displayName = savedMixDisplayName(mix);

  return (
    <article
      className="rounded-2xl min-w-0 overflow-hidden relative"
      style={{
        background: s.loadSheetRow,
        border: b.panel,
      }}
    >
      <div className="min-w-0" style={CARD_GRID}>
        <p className="truncate min-w-0" style={{ ...LIST_TITLE, gridColumn: 1 }}>
          {displayName}
        </p>
        <p className="shrink-0 tabular-nums" style={{ ...LIST_VALUE, gridColumn: 2 }}>
          {formatTotalKg(mix.values.total)}
        </p>

        <p
          className="break-words min-w-0"
          style={{ ...LIST_MUTED, gridColumn: "1 / -1" }}
        >
          {mixDetailLine(mix)}
        </p>

        <p
          className="min-w-0 truncate tabular-nums"
          style={{
            ...LIST_MUTED,
            color: c.mutedDimmer,
            gridColumn: "1 / -1",
          }}
        >
          {savedTime.comment ? (
            <>
              <span>{savedTime.comment}</span>
              <span aria-hidden> · </span>
            </>
          ) : null}
          <span style={LIST_TIMESTAMP}>{savedTime.timestamp}</span>
        </p>
      </div>

      <SavedMixSwipeStrip
        open={moreMenuOpen}
        onToggle={() => onMoreMenuOpenChange(!moreMenuOpen)}
        onOpen={() => onOpen(mix)}
        onRename={() => {
          onRename(mix);
          onMoreMenuOpenChange(false);
        }}
        onDelete={() => {
          onDelete(mix);
          onMoreMenuOpenChange(false);
        }}
      />
    </article>
  );
}

export interface LoadSavedMixesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mix: SavedMixSnapshot) => void;
}

export function LoadSavedMixesSheet({
  open,
  onOpenChange,
  onSelect,
}: LoadSavedMixesSheetProps) {
  const mixes = useSavedMixesStore((s) => s.mixes);
  const deleteMix = useSavedMixesStore((s) => s.deleteMix);
  const updateMixMetaName = useSavedMixesStore((s) => s.updateMixMetaName);
  const [renameMix, setRenameMix] = useState<SavedMixSnapshot | null>(null);
  const [moreMenuMixId, setMoreMenuMixId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [topSpacer, setTopSpacer] = useState(0);
  const [thumbPad, setThumbPad] = useState(0);
  const scrollBoundsRef = useRef({ min: 0, max: 0 });
  const now = useTickingNow(open);

  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLLIElement>(null);
  const lastItemRef = useRef<HTMLLIElement>(null);

  const measureScrollBounds = useCallback(() => {
    const scroll = scrollRef.current;
    const first = firstItemRef.current;
    const last = lastItemRef.current;
    if (!scroll || !first || !last) return;

    const ch = scroll.clientHeight;
    if (ch <= 0) return;

    const firstH = first.offsetHeight;
    const stopY = ch - THUMB_BOTTOM_INSET;
    const travel = Math.max(0, Math.ceil(stopY - firstH));

    setTopSpacer(travel);
    setThumbPad(Math.max(Math.round(ch * THUMB_PAD_MIN_FRAC), Math.ceil(ch * 0.35)));

    requestAnimationFrame(() => {
      const el = scrollRef.current;
      const f = firstItemRef.current;
      const l = lastItemRef.current;
      if (!el || !f || !l) return;

      const targetBottom = el.getBoundingClientRect().bottom - THUMB_BOTTOM_INSET;
      const saved = el.scrollTop;
      const naturalMax = Math.max(0, el.scrollHeight - el.clientHeight);

      // scrollTop=0 → first row at thumb line; scrollTop=max → first at list top.
      const maxForFirst = travel;
      const maxForLast = (() => {
        let lo = 0;
        let hi = naturalMax;
        let best = 0;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          el.scrollTop = mid;
          const bottom = l.getBoundingClientRect().bottom;
          if (bottom <= targetBottom + 0.5) {
            best = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        return best;
      })();

      const max = Math.min(naturalMax, Math.max(maxForFirst, maxForLast));

      el.scrollTop = saved;
      scrollBoundsRef.current = { min: 0, max };

      if (saved < 0) el.scrollTop = 0;
      else if (saved > max) el.scrollTop = max;
    });
  }, []);

  const clampScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { min, max } = scrollBoundsRef.current;
    if (el.scrollTop < min) el.scrollTop = min;
    else if (el.scrollTop > max) el.scrollTop = max;
  }, []);

  useEffect(() => {
    if (!open) setRenameMix(null);
  }, [open]);

  useEffect(() => {
    if (!open) setMoreMenuMixId(null);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    measureScrollBounds();
    const el = scrollRef.current;
    const inner = innerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(measureScrollBounds);
    ro.observe(el);
    if (inner) ro.observe(inner);
    return () => ro.disconnect();
  }, [open, mixes.length, query, measureScrollBounds]);

  useLayoutEffect(() => {
    if (!open || mixes.length === 0) return;
    measureScrollBounds();
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      // Open with first card at top of the list (not at thumb line).
      el.scrollTop = scrollBoundsRef.current.max;
    });
  }, [open, mixes.length, query, topSpacer, thumbPad, measureScrollBounds]);

  if (!open) return null;

  const handleOpen = (mix: SavedMixSnapshot) => {
    onSelect(mix);
    onOpenChange(false);
  };

  const handleDelete = (mix: SavedMixSnapshot) => {
    deleteMix(mix.id);
  };

  const handleRename = (mix: SavedMixSnapshot) => {
    setRenameMix(mix);
  };

  const subtitle =
    mixes.length === 0
      ? "No saved mixes yet"
      : mixes.length === 1
        ? "1 saved mix"
        : `${mixes.length} saved mixes`;

  const q = query.trim().toLowerCase();
  const filteredMixes =
    q.length === 0
      ? mixes
      : mixes.filter((m) => {
          const name = savedMixDisplayName(m).toLowerCase();
          const recipe = (m.recipeName || "").toLowerCase();
          const meta = (m.metaName || "").toLowerCase();
          const bucket = bucketLabel(m.bucketSelection).toLowerCase();
          const detail = mixDetailLine(m).toLowerCase();
          const savedTime = getSavedMixTimeSearchText(new Date(m.savedAt), now);
          return (
            name.includes(q) ||
            recipe.includes(q) ||
            meta.includes(q) ||
            bucket.includes(q) ||
            detail.includes(q) ||
            savedTime.includes(q)
          );
        });

  return (
    <>
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col pointer-events-auto"
        style={{
          top: APP_HEADER_HEIGHT,
          zIndex: 30,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="load-saved-mixes-title"
      >
        <button
          type="button"
          aria-label="Close saved mixes"
          className="load-sheet-dim absolute inset-0 border-0 p-0 cursor-default"
          onClick={() => onOpenChange(false)}
          style={{ backgroundColor: s.outsideDimLight }}
        />

        <div
          className="load-sheet-panel relative flex flex-col min-h-0 flex-1 overflow-hidden"
          style={{
            marginLeft: SHEET_MARGIN_X,
            marginRight: SHEET_MARGIN_X,
            marginTop: SHEET_MARGIN_TOP,
            marginBottom: "var(--app-sheet-margin-bottom)",
            borderRadius: SHEET_RADIUS,
            border: b.panel,
            boxShadow: s.shadowSheet,
            background: s.loadSheetPanel,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <header
            className="shrink-0 flex flex-col items-center justify-end text-center"
            style={{
              height: HEADER_HEIGHT_FRAC,
              minHeight: 108,
              paddingLeft: SHEET_PAD_X,
              paddingRight: SHEET_PAD_X,
              paddingBottom: 10,
            }}
          >
            <h2 id="load-saved-mixes-title" style={SHEET_TITLE}>
              Saved mixes
            </h2>
            <p style={{ ...SHEET_SUBTITLE, maxWidth: 280, textAlign: "center" }}>
              {subtitle}
            </p>
            <div className="w-full" style={{ marginTop: 12 }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search saved mixes"
                aria-label="Search saved mixes"
                className={SHEET_FIELD_INPUT_CLASS}
                style={sheetFieldInputStyle({ height: SEARCH_H })}
              />
            </div>
          </header>

          <div className="flex-1 min-h-0 relative">
            <ScrollFade edge="top" />
            <ScrollFade edge="bottom" />

            <div
              ref={scrollRef}
              className="saved-mixes-list h-full overflow-y-auto overscroll-none"
              style={{
                paddingLeft: SHEET_PAD_X,
                paddingRight: SHEET_PAD_X,
                WebkitOverflowScrolling: "touch",
              }}
              onScroll={clampScroll}
            >
              <div ref={innerRef}>
                {topSpacer > 0 ? (
                  <div aria-hidden style={{ height: topSpacer, flexShrink: 0 }} />
                ) : null}
                <div
                  style={{
                    paddingTop: 4,
                    paddingBottom: thumbPad,
                  }}
                >
                {filteredMixes.length === 0 ? (
                  <div
                    className="rounded-2xl flex flex-col items-center justify-center text-center px-6 py-12"
                    style={{
                      background: s.loadSheetRow,
                      border: b.panel,
                    }}
                  >
                    <p style={{ ...LIST_MUTED, letterSpacing: "0.04em", lineHeight: 1.45 }}>
                      {mixes.length === 0 ? "Save a mix from the mixer to see it here." : "No matches."}
                    </p>
                  </div>
                ) : (
                  <ul
                    className="flex flex-col list-none m-0 p-0"
                    style={{ gap: CARD_GAP }}
                  >
                    {filteredMixes.map((mix, index) => {
                      const isFirst = index === 0;
                      const isLast = index === filteredMixes.length - 1;
                      return (
                        <li
                          key={mix.id}
                          ref={(el) => {
                            if (isFirst) firstItemRef.current = el;
                            if (isLast) lastItemRef.current = el;
                          }}
                        >
                          <SavedMixRow
                            mix={mix}
                            now={now}
                            moreMenuOpen={moreMenuMixId === mix.id}
                            onMoreMenuOpenChange={(next) =>
                              setMoreMenuMixId(next ? mix.id : null)
                            }
                            onOpen={handleOpen}
                            onDelete={handleDelete}
                            onRename={handleRename}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
                </div>
              </div>
            </div>
          </div>

          <SheetFooter
            buttons={[
              {
                key: "close",
                label: "Close",
                icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
                onClick: () => onOpenChange(false),
              },
            ]}
          />
        </div>
      </div>

      {renameMix && (
        <SaveMixNameSheet
          mode="rename"
          open={Boolean(renameMix)}
          onOpenChange={(next) => {
            if (!next) setRenameMix(null);
          }}
          mix={renameMix}
          onConfirm={(metaName) => updateMixMetaName(renameMix.id, metaName)}
        />
      )}
    </>
  );
}
