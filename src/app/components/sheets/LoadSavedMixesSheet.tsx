import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { format, formatDistanceToNow } from "date-fns";
import { APP_HEADER_HEIGHT } from "../shared/AppHeader";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import type { BucketSelection } from "../../domain/bucket/types";
import { LongPressButton } from "../shared/LongPressButton";
import { DeleteIcon, GoToIcon, RenameIcon } from "../shared/ActionIcons";
import { useSavedMixesStore } from "../../saved-mixes/store";
import { savedMixDisplayName } from "../../saved-mixes/display";
import { SaveMixNameSheet } from "./SaveMixNameSheet";
import { theme } from "../../../theme";

const { colors: c, borders: b, surfaces: s } = theme;

/** Title block — slightly higher than before. */
const HEADER_HEIGHT_FRAC = "32%";
const TITLE_SIZE = 30;
const SUBTITLE_SIZE = 14;
const SEARCH_H = 40;

/** Clearance from scroll-area bottom to thumb stop line (above close footer). */
const THUMB_BOTTOM_INSET = 20;
/** Extra empty space below list so items can scroll into thumb reach. */
const THUMB_PAD_MIN_FRAC = 0.48;

const FADE_H = 36;

/** Compact row actions — full-width row under each item. */
const ROW_ACTION_H = 28;
const ROW_ACTION_GAP = 4;
const ROW_ACTION_W = 34;

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

const SHEET_MARGIN_X = 16;
const SHEET_MARGIN_TOP = 6;
const SHEET_MARGIN_BOTTOM = 16;
const SHEET_RADIUS = 28;
const SHEET_PAD_X = 20;
const CLOSE_SIZE = 44;
const FOOTER_H = 64;

function bucketLabel(selection: BucketSelection): string {
  return selection === "none" ? "No bucket" : `${selection} L bucket`;
}

function formatTotalKg(grams: number): string {
  return `${(grams / 1000).toFixed(3)} kg`;
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
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
          ? `linear-gradient(to bottom, ${s.sheetPanelFade} 0%, transparent 100%)`
          : `linear-gradient(to top, ${s.sheetPanelFade} 0%, transparent 100%)`,
      }}
    />
  );
}

function SavedMixRow({
  mix,
  onOpen,
  onDelete,
  onRename,
}: {
  mix: SavedMixSnapshot;
  onOpen: (mix: SavedMixSnapshot) => void;
  onDelete: (mix: SavedMixSnapshot) => void;
  onRename: (mix: SavedMixSnapshot) => void;
}) {
  const savedDate = new Date(mix.savedAt);
  const relative = formatDistanceToNow(savedDate, { addSuffix: true });
  const displayName = savedMixDisplayName(mix);
  const hasMetaName = Boolean(mix.metaName?.trim());

  return (
    <div className="w-full text-left" style={{ padding: "10px 2px" }}>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="truncate" style={LIST_TITLE}>
            {displayName}
          </p>
          <p className="truncate mt-0.5" style={LIST_MUTED}>
            {hasMetaName ? `${mix.recipeName} · ` : ""}
            {bucketLabel(mix.bucketSelection)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular-nums" style={LIST_VALUE}>
            {formatTotalKg(mix.values.total)}
          </p>
          <p className="mt-0.5 tabular-nums" style={LIST_MUTED}>
            {relative}
          </p>
        </div>
      </div>

      <div
        className="grid min-w-0"
        style={{
          marginTop: 6,
          height: ROW_ACTION_H,
          gridTemplateColumns: "minmax(0, 1fr) auto",
          alignItems: "center",
          columnGap: 10,
        }}
      >
        <div className="min-w-0 flex items-center" style={{ height: "100%" }}>
          <span
            className="truncate tabular-nums min-w-0"
            style={{ ...LIST_MUTED, color: c.mutedDimmer, lineHeight: 1 }}
          >
            {format(savedDate, "d MMM yyyy · HH:mm")}
          </span>
        </div>
        <div className="flex shrink-0 items-center justify-end" style={{ height: "100%", gap: ROW_ACTION_GAP }}>
        <LongPressButton
          label="Delete"
          confirmAction="DELETE MIX"
          onLongPress={() => onDelete(mix)}
          icon={<DeleteIcon size={14} />}
          progressVariant="fill"
          className="shrink-0"
          style={{
            height: ROW_ACTION_H,
            width: ROW_ACTION_W,
            minHeight: 0,
            border: "none",
            padding: 0,
          }}
          compact
        />
        <LongPressButton
          label="Edit"
          confirmAction="RENAME"
          onLongPress={() => onRename(mix)}
          icon={<RenameIcon size={14} />}
          progressVariant="fill"
          className="shrink-0"
          style={{
            height: ROW_ACTION_H,
            width: ROW_ACTION_W,
            minHeight: 0,
            border: "none",
            padding: 0,
          }}
          compact
        />
        <LongPressButton
          label="Go to"
          confirmAction="LOAD MIX"
          onLongPress={() => onOpen(mix)}
          icon={<GoToIcon size={14} />}
          progressVariant="fill"
          className="shrink-0"
          style={{
            height: ROW_ACTION_H,
            width: ROW_ACTION_W,
            minHeight: 0,
            border: "none",
            padding: 0,
          }}
          compact
        />
        </div>
      </div>
    </div>
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
  const [query, setQuery] = useState("");
  const [topSpacer, setTopSpacer] = useState(0);
  const [thumbPad, setThumbPad] = useState(0);
  const scrollBoundsRef = useRef({ min: 0, max: 0 });

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
      : `${mixes.length} saved · hold Open, Rename, or Delete`;

  const q = query.trim().toLowerCase();
  const filteredMixes =
    q.length === 0
      ? mixes
      : mixes.filter((m) => {
          const name = savedMixDisplayName(m).toLowerCase();
          const recipe = (m.recipeName || "").toLowerCase();
          const meta = (m.metaName || "").toLowerCase();
          const bucket = bucketLabel(m.bucketSelection).toLowerCase();
          return (
            name.includes(q) ||
            recipe.includes(q) ||
            meta.includes(q) ||
            bucket.includes(q)
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
            marginBottom: SHEET_MARGIN_BOTTOM,
            borderRadius: SHEET_RADIUS,
            border: b.panel,
            boxShadow: s.shadowSheet,
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
            <h2
              id="load-saved-mixes-title"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: TITLE_SIZE,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: c.title,
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Saved mixes
            </h2>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: SUBTITLE_SIZE,
                fontWeight: 500,
                letterSpacing: "0.01em",
                color: c.muted,
                marginTop: 6,
                lineHeight: 1.4,
                maxWidth: 280,
              }}
            >
              {subtitle}
            </p>
            <div className="w-full" style={{ marginTop: 12 }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search saved mixes"
                aria-label="Search saved mixes"
                className="w-full outline-none"
                style={{
                  height: SEARCH_H,
                  boxSizing: "border-box",
                  borderRadius: 14,
                  padding: "0 14px",
                  background: s.searchBg,
                  border: b.search,
                  color: c.title,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                }}
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
                  <ul className="flex flex-col list-none m-0 p-0">
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
                          style={index < filteredMixes.length - 1 ? { borderBottom: b.divider } : undefined}
                        >
                          <SavedMixRow
                            mix={mix}
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

          <footer
            className="shrink-0 flex items-center justify-center"
            style={{ height: FOOTER_H }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="flex items-center justify-center rounded-full shrink-0 transition-colors duration-150"
              style={{
                width: CLOSE_SIZE,
                height: CLOSE_SIZE,
                background: s.sheetCancelBg,
                border: b.sheetBtn,
                color: c.muted,
              }}
            >
              <CloseIcon />
            </button>
          </footer>
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
