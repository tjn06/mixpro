import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { SavedBatchTotalsSnapshot } from "../../saved-batch-totals/types";
import {
  isBatchTotalsCompatibleWithSession,
  type BatchTotalsSessionContext,
} from "../../saved-batch-totals/compatibility";
import {
  DEMO_INCOMPATIBLE_BATCH_TOTALS,
  isDemoBatchTotalsEntry,
} from "../../saved-batch-totals/demoEntries";
import { primaryBatch, useSavedBatchTotalsStore } from "../../saved-batch-totals/store";
import {
  savedBatchTotalsCardDetail,
  savedBatchTotalsDisplayName,
  savedBatchTotalsPrimaryKg,
} from "../../saved-batch-totals/display";
import type { BatchNameInput } from "../../batch-names";
import { getHumanSavedTime } from "../../saved-mixes/humanSavedTime";
import { useTickingNow } from "../../hooks/useTickingNow";
import {
  CloseIcon,
  CollapseActionsIcon,
  DeleteIcon,
  ExpandActionsIcon,
  GoToIcon,
  RenameIcon,
} from "../shared/ActionIcons";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import { SaveBatchTotalsNameSheet } from "./SaveBatchTotalsNameSheet";
import {
  SHEET_LIST_ROW_CLASS,
  SHEET_SUBTITLE,
  SHEET_TITLE,
  SHEET_COVER_HEADER_STYLE,
  SHEET_COVER_FORM_SPACING,
} from "./sheetChrome";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { ScrollEdgeFadeOverlays, useScrollEdgeFades } from "./scrollEdgeFades";
import { cv } from "../../ui/tokens";

const strip = cv.loadSheetStrip;
const list = cv.loadSheetList;

const CARD_PAD_X = 14;
const CARD_PAD_Y = 12;
const CARD_GAP = 8;
const ACTION_ICON = 16;
const SWIPE_PANEL_CLOSED_W = 52;
const SWIPE_PANEL_OPEN_W = 104;

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

const SECTION_LABEL: CSSProperties = {
  ...LIST_MUTED,
  fontSize: "var(--text-ui-xs)",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  margin: 0,
  padding: "0 2px",
};

function sortBySavedAt(
  entries: readonly SavedBatchTotalsSnapshot[],
): SavedBatchTotalsSnapshot[] {
  return [...entries].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

function batchNameInputFromEntry(entry: SavedBatchTotalsSnapshot): BatchNameInput {
  const primary = primaryBatch(entry);
  return {
    id: entry.id,
    recipeName: entry.recipeName,
    targetWeightKg: (primary?.values.total ?? 0) / 1000,
    createdAt: entry.savedAt,
  };
}

function BatchTotalsSwipeStrip({
  open,
  canOpen,
  canDelete,
  canRename,
  onToggle,
  onOpen,
  onRename,
  onDelete,
}: {
  open: boolean;
  canOpen: boolean;
  canDelete: boolean;
  canRename: boolean;
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
    opacity: canDelete ? 1 : 0.35,
    cursor: canDelete ? "pointer" : "not-allowed",
  };
  const cellR2C1: CSSProperties = {
    ...stripCellBase,
    borderRight: open ? STRIP_DIVIDER : "none",
    borderBottom: "none",
    background: strip.open,
    color: strip.openColor,
    opacity: canOpen ? 1 : 0.35,
    cursor: canOpen ? "pointer" : "not-allowed",
  };
  const cellR2C2: CSSProperties = {
    ...stripCellBase,
    background: strip.rename,
    color: strip.renameColor,
    opacity: canRename ? 1 : 0.35,
    cursor: canRename ? "pointer" : "not-allowed",
  };

  return (
    <div
      role="group"
      aria-label="Batch totals actions"
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
          disabled={!canDelete}
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
        disabled={!canOpen}
        className="saved-mix-swipe-cell saved-mix-swipe-cell--r2c1 h-full w-full shrink-0 rounded-none transition-colors duration-150"
        style={cellR2C1}
        onClick={onOpen}
      >
        <GoToIcon size={ACTION_ICON} />
      </button>

      {open ? (
        <button
          type="button"
          aria-label="Rename"
          disabled={!canRename}
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

function BatchTotalsRow({
  entry,
  now,
  compatible,
  moreMenuOpen,
  onMoreMenuOpenChange,
  onOpen,
  onDelete,
  onRename,
}: {
  entry: SavedBatchTotalsSnapshot;
  now: Date;
  compatible: boolean;
  moreMenuOpen: boolean;
  onMoreMenuOpenChange: (open: boolean) => void;
  onOpen: (entry: SavedBatchTotalsSnapshot) => void;
  onDelete: (entry: SavedBatchTotalsSnapshot) => void;
  onRename: (entry: SavedBatchTotalsSnapshot) => void;
}) {
  const savedDate = new Date(entry.savedAt);
  const savedTime = getHumanSavedTime(savedDate, now);
  const displayName = savedBatchTotalsDisplayName(entry);
  const isDemo = isDemoBatchTotalsEntry(entry.id);

  return (
    <article
      className={`${SHEET_LIST_ROW_CLASS} rounded-2xl min-w-0 overflow-hidden relative${
        compatible ? "" : " opacity-55"
      }`}
      aria-disabled={compatible ? undefined : true}
    >
      <div className="min-w-0" style={CARD_GRID}>
        <p className="truncate min-w-0" style={{ ...LIST_TITLE, gridColumn: 1 }}>
          {displayName}
        </p>
        <p className="shrink-0 tabular-nums" style={{ ...LIST_VALUE, gridColumn: 2 }}>
          {savedBatchTotalsPrimaryKg(entry)}
        </p>

        <p
          className="break-words min-w-0"
          style={{ ...LIST_MUTED, gridColumn: "1 / -1" }}
        >
          {savedBatchTotalsCardDetail(entry, { incompatible: !compatible })}
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
          {!compatible ? (
            <>
              <span aria-hidden> · </span>
              <span>Read only</span>
            </>
          ) : null}
        </p>
      </div>

      <BatchTotalsSwipeStrip
        open={moreMenuOpen}
        canOpen={compatible}
        canDelete={!isDemo}
        canRename={!isDemo}
        onToggle={() => onMoreMenuOpenChange(!moreMenuOpen)}
        onOpen={() => {
          if (!compatible) return;
          onOpen(entry);
        }}
        onRename={() => {
          if (isDemo) return;
          onRename(entry);
          onMoreMenuOpenChange(false);
        }}
        onDelete={() => {
          if (isDemo) return;
          onDelete(entry);
          onMoreMenuOpenChange(false);
        }}
      />
    </article>
  );
}

function EntrySection({
  title,
  entries,
  compatible,
  now,
  moreMenuMixId,
  onMoreMenuOpenChange,
  onOpen,
  onDelete,
  onRename,
}: {
  title: string;
  entries: SavedBatchTotalsSnapshot[];
  compatible: boolean;
  now: Date;
  moreMenuMixId: string | null;
  onMoreMenuOpenChange: (id: string | null) => void;
  onOpen: (entry: SavedBatchTotalsSnapshot) => void;
  onDelete: (entry: SavedBatchTotalsSnapshot) => void;
  onRename: (entry: SavedBatchTotalsSnapshot) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="flex flex-col" style={{ gap: CARD_GAP }}>
      <h3 style={SECTION_LABEL}>{title}</h3>
      <ul className="flex flex-col list-none m-0 p-0" style={{ gap: CARD_GAP }}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <BatchTotalsRow
              entry={entry}
              now={now}
              compatible={compatible}
              moreMenuOpen={moreMenuMixId === entry.id}
              onMoreMenuOpenChange={(next) =>
                onMoreMenuOpenChange(next ? entry.id : null)
              }
              onOpen={onOpen}
              onDelete={onDelete}
              onRename={onRename}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LoadSavedBatchTotalsSheet({
  open,
  onOpenChange,
  onSelect,
  session,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (entry: SavedBatchTotalsSnapshot) => void;
  session: BatchTotalsSessionContext;
}) {
  const entries = useSavedBatchTotalsStore((s) => s.entries);
  const deleteEntry = useSavedBatchTotalsStore((s) => s.deleteEntry);
  const updateEntryMetaName = useSavedBatchTotalsStore((s) => s.updateEntryMetaName);
  const [renameEntry, setRenameEntry] = useState<SavedBatchTotalsSnapshot | null>(null);
  const [moreMenuMixId, setMoreMenuMixId] = useState<string | null>(null);
  const now = useTickingNow(open);
  const listRef = useRef<HTMLDivElement>(null);

  const { compatible, incompatible } = useMemo(() => {
    const merged = new Map<string, SavedBatchTotalsSnapshot>();
    for (const entry of DEMO_INCOMPATIBLE_BATCH_TOTALS) {
      merged.set(entry.id, entry);
    }
    for (const entry of entries) {
      merged.set(entry.id, entry);
    }

    const all = sortBySavedAt([...merged.values()]);
    const nextCompatible: SavedBatchTotalsSnapshot[] = [];
    const nextIncompatible: SavedBatchTotalsSnapshot[] = [];
    for (const entry of all) {
      if (isBatchTotalsCompatibleWithSession(entry, session)) {
        nextCompatible.push(entry);
      } else {
        nextIncompatible.push(entry);
      }
    }
    return { compatible: nextCompatible, incompatible: nextIncompatible };
  }, [entries, session]);

  const totalCount = compatible.length + incompatible.length;

  const listScroll = useScrollEdgeFades(
    listRef,
    open,
    `${compatible.length}:${incompatible.length}`,
  );

  useEffect(() => {
    if (!open) setRenameEntry(null);
  }, [open]);

  useEffect(() => {
    if (!open) setMoreMenuMixId(null);
  }, [open]);

  if (!open) return null;

  const handleOpen = (entry: SavedBatchTotalsSnapshot) => {
    if (!isBatchTotalsCompatibleWithSession(entry, session)) return;
    onSelect(entry);
    onOpenChange(false);
  };

  const handleDelete = (entry: SavedBatchTotalsSnapshot) => {
    if (isDemoBatchTotalsEntry(entry.id)) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete “${savedBatchTotalsDisplayName(entry)}”?`)
    ) {
      return;
    }
    deleteEntry(entry.id);
  };

  const handleRename = (entry: SavedBatchTotalsSnapshot) => {
    if (isDemoBatchTotalsEntry(entry.id)) return;
    setRenameEntry(entry);
  };

  const subtitle =
    totalCount === 0
      ? "Nothing saved yet"
      : `${compatible.length} for this mix · ${incompatible.length} other`;

  return (
    <>
      <AppFrameCoverSheet
        open={open}
        zIndex={40}
        ariaLabelledBy="load-batch-totals-title"
      >
        <header
          className="shrink-0 flex flex-col items-center text-center"
          style={SHEET_COVER_HEADER_STYLE}
        >
          <h2 id="load-batch-totals-title" style={SHEET_TITLE}>
            Saved batch totals
          </h2>
          <p style={{ ...SHEET_SUBTITLE, maxWidth: 280, textAlign: "center" }}>
            {subtitle}
          </p>
        </header>

        <div className="scroll-edge-fade-viewport flex-1 min-h-0 relative flex flex-col">
          <ScrollEdgeFadeOverlays
            fromTop={listScroll.fromTop}
            fromBottom={false}
          />

          <div
            ref={listRef}
            className="saved-mixes-list recipe-picker-scroll app-gutter-x flex-1 min-h-0 overflow-y-auto overscroll-none"
          >
            <div
              className="flex flex-col"
              style={{
                paddingTop: 12,
                paddingBottom: 8,
                gap: SHEET_COVER_FORM_SPACING.subtitleToSubinfo,
              }}
            >
              {totalCount === 0 ? (
                <div
                  className={`${SHEET_LIST_ROW_CLASS} rounded-2xl flex flex-col items-center justify-center text-center px-6 py-12`}
                >
                  <p style={{ ...LIST_MUTED, letterSpacing: "0.04em", lineHeight: 1.45 }}>
                    Save batch totals from the share bar to see them here.
                  </p>
                </div>
              ) : (
                <>
                  <EntrySection
                    title="This mix"
                    entries={compatible}
                    compatible
                    now={now}
                    moreMenuMixId={moreMenuMixId}
                    onMoreMenuOpenChange={setMoreMenuMixId}
                    onOpen={handleOpen}
                    onDelete={handleDelete}
                    onRename={handleRename}
                  />
                  <EntrySection
                    title="Other mixes"
                    entries={incompatible}
                    compatible={false}
                    now={now}
                    moreMenuMixId={moreMenuMixId}
                    onMoreMenuOpenChange={setMoreMenuMixId}
                    onOpen={handleOpen}
                    onDelete={handleDelete}
                    onRename={handleRename}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <SheetFooter
          fadeFromBottom={listScroll.fromBottom}
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

      {renameEntry ? (
        <SaveBatchTotalsNameSheet
          mode="rename"
          open
          onOpenChange={(next) => {
            if (!next) setRenameEntry(null);
          }}
          entry={renameEntry}
          batchNameInput={batchNameInputFromEntry(renameEntry)}
          onConfirm={(metaName) => updateEntryMetaName(renameEntry.id, metaName)}
        />
      ) : null}
    </>
  );
}
