import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
} from "react";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import type { BucketSelection } from "../../domain/bucket/types";
import { CollapseActionsIcon, DeleteIcon, ExpandActionsIcon, GoToIcon, RenameIcon, CloseIcon } from "../shared/ActionIcons";
import { useSavedMixesStore } from "../../saved-mixes/store";
import { savedMixDisplayName } from "../../saved-mixes/display";
import { getHumanSavedTime, getSavedMixTimeSearchText } from "../../saved-mixes/humanSavedTime";
import { useTickingNow } from "../../hooks/useTickingNow";
import { batchNameInputFromSavedMix } from "../../batch-names";
import { SaveMixNameSheet } from "./SaveMixNameSheet";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import {
  SHEET_FIELD_INPUT_CLASS,
  SHEET_LIST_ROW_CLASS,
  SHEET_SUBTITLE,
  SHEET_TITLE,
  SHEET_COVER_HEADER_STYLE,
  SHEET_COVER_FORM_SPACING,
  sheetFieldInputStyle,
} from "./sheetChrome";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { cv } from "../../ui/tokens";

const strip = cv.loadSheetStrip;
const list = cv.loadSheetList;

const SEARCH_H = 40;

const FADE_H = 36;

/** Two-line compact card — action grid on the right; widens left over content when open. */
const CARD_PAD_X = 14;
const CARD_PAD_Y = 12;
const CARD_GAP = 8;
const ACTION_ICON = 16;
const SWIPE_PANEL_CLOSED_W = 52;
const SWIPE_PANEL_OPEN_W = 104;

/** Opaque tap-action strip — covers list text when expanded. */
const STRIP_PANEL_BG = strip.panelBackground;
const STRIP_DIVIDER = strip.divider;

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
  color: list.title,
};
const LIST_MUTED: CSSProperties = {
  ...LIST_TEXT,
  color: list.muted,
};
const LIST_VALUE: CSSProperties = {
  ...LIST_TEXT,
  fontWeight: 600,
  color: list.value,
};
const LIST_TIMESTAMP: CSSProperties = {
  fontSize: "var(--text-ui-xs)",
  fontWeight: 500,
  letterSpacing: "0.03em",
  lineHeight: 1.25,
  color: list.timestamp,
  fontVariantNumeric: "tabular-nums",
};

function sortMixesBySavedAt(mixes: readonly SavedMixSnapshot[]): SavedMixSnapshot[] {
  return [...mixes].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

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
          ? "linear-gradient(to bottom, var(--ui-header-bg) 0%, transparent 100%)"
          : "linear-gradient(to top, var(--ui-header-bg) 0%, transparent 100%)",
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
    color: open ? strip.renameColor : strip.mutedColor,
    background: open ? strip.moreOpen : strip.neutral,
  };
  const cellR1C2: CSSProperties = {
    ...stripCellBase,
    borderRight: "none",
    borderBottom: STRIP_DIVIDER,
    background: strip.delete,
    color: strip.deleteColor,
  };
  const cellR2C1: CSSProperties = {
    ...stripCellBase,
    borderRight: open ? STRIP_DIVIDER : "none",
    borderBottom: "none",
    background: strip.open,
    color: strip.openColor,
  };
  const cellR2C2: CSSProperties = {
    ...stripCellBase,
    background: strip.rename,
    color: strip.renameColor,
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
      className={`${SHEET_LIST_ROW_CLASS} rounded-2xl min-w-0 overflow-hidden relative`}
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
            color: list.timestamp,
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
  const now = useTickingNow(open);
  const listRef = useRef<HTMLDivElement>(null);
  const [listScroll, setListScroll] = useState({ fromTop: false, fromBottom: false });

  const sortedMixes = useMemo(() => sortMixesBySavedAt(mixes), [mixes]);

  const filteredMixes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return sortedMixes;
    return sortedMixes.filter((m) => {
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
  }, [sortedMixes, query, now]);

  const syncListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setListScroll({
      fromTop: el.scrollTop > 4,
      fromBottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setListScroll({ fromTop: false, fromBottom: false });
      return;
    }
    syncListScroll();
    const el = listRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncListScroll, { passive: true });
    const ro = new ResizeObserver(syncListScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", syncListScroll);
      ro.disconnect();
    };
  }, [open, syncListScroll, filteredMixes.length]);

  useEffect(() => {
    if (!open) setRenameMix(null);
  }, [open]);

  useEffect(() => {
    if (!open) setMoreMenuMixId(null);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

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

  return (
    <>
      <AppFrameCoverSheet
        open={open}
        zIndex={30}
        ariaLabelledBy="load-saved-mixes-title"
      >
          <header
            className="shrink-0 flex flex-col items-center text-center"
            style={SHEET_COVER_HEADER_STYLE}
          >
            <h2 id="load-saved-mixes-title" style={SHEET_TITLE}>
              Saved mixes
            </h2>
            <p style={{ ...SHEET_SUBTITLE, maxWidth: 280, textAlign: "center" }}>
              {subtitle}
            </p>
            <div className="w-full" style={{ marginTop: SHEET_COVER_FORM_SPACING.headerToMeta }}>
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

          <div className="flex-1 min-h-0 relative flex flex-col">
            {listScroll.fromTop ? <ScrollFade edge="top" /> : null}
            {listScroll.fromBottom ? <ScrollFade edge="bottom" /> : null}

            <div
              ref={listRef}
              className="saved-mixes-list recipe-picker-scroll app-gutter-x flex-1 min-h-0 overflow-y-auto overscroll-none"
            >
              <div style={{ paddingTop: 12, paddingBottom: 8 }}>
                {filteredMixes.length === 0 ? (
                  <div
                    className={`${SHEET_LIST_ROW_CLASS} rounded-2xl flex flex-col items-center justify-center text-center px-6 py-12`}
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
                    {filteredMixes.map((mix) => (
                      <li key={mix.id}>
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
                    ))}
                  </ul>
                )}
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
      </AppFrameCoverSheet>

      {renameMix && (
        <SaveMixNameSheet
          mode="rename"
          open={Boolean(renameMix)}
          onOpenChange={(next) => {
            if (!next) setRenameMix(null);
          }}
          mix={renameMix}
          savedMixes={mixes}
          batchNameInput={batchNameInputFromSavedMix(renameMix)}
          onConfirm={(metaName) => updateMixMetaName(renameMix.id, metaName)}
        />
      )}
    </>
  );
}
