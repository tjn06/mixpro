import { useEffect, useState, type CSSProperties } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { APP_HEADER_HEIGHT } from "./AppHeader";
import type { SavedMixSnapshot } from "../types/savedMix";
import type { BucketSelection } from "../bucketTypes";
import { LongPressButton } from "./LongPressButton";
import { DeleteIcon, LoadIcon, RenameIcon } from "./ActionIcons";
import { useSavedMixesStore } from "../stores/savedMixesStore";
import { savedMixDisplayName } from "../savedMixDisplay";
import { SaveMixNameSheet } from "./SaveMixNameSheet";

const ROW_BG = "rgba(13, 13, 28, 0.52)";
const DIVIDER = "1px solid rgba(255, 255, 255, 0.08)";
const PANEL_BORDER = "1.5px solid rgba(255,255,255,0.14)";
const TITLE_COLOR = "#c0c0e0";
const MUTED = "#8888a8";
const VALUE_COLOR = "#c4c4dc";
const DIM = "#686880";

/** Compact row actions — full-width row under each item. */
const ROW_ACTION_H = 32;
const ROW_ACTION_GAP = 6;

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
  color: TITLE_COLOR,
};
const LIST_MUTED: CSSProperties = {
  ...LIST_TEXT,
  color: MUTED,
};
const LIST_VALUE: CSSProperties = {
  ...LIST_TEXT,
  fontWeight: 600,
  color: VALUE_COLOR,
};

/** Light dim outside the panel — no blur. */
const OUTSIDE_DIM = "rgba(5, 5, 16, 0.28)";

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

      <p className="mt-1.5 truncate tabular-nums" style={{ ...LIST_MUTED, color: DIM }}>
        {format(savedDate, "d MMM yyyy · HH:mm")}
      </p>

      <div className="flex mt-2 min-w-0" style={{ gap: ROW_ACTION_GAP }}>
        <LongPressButton
          label="Rename"
          confirmAction="RENAME"
          onLongPress={() => onRename(mix)}
          icon={<RenameIcon size={14} />}
          progressVariant="fill"
          className="flex-1 min-w-0"
          style={{ height: ROW_ACTION_H, minHeight: 0 }}
          compact
        />
        <LongPressButton
          label="Open"
          confirmAction="LOAD MIX"
          onLongPress={() => onOpen(mix)}
          icon={<LoadIcon size={14} />}
          progressVariant="fill"
          className="flex-1 min-w-0"
          style={{ height: ROW_ACTION_H, minHeight: 0 }}
          compact
        />
        <LongPressButton
          label="Delete"
          confirmAction="DELETE MIX"
          onLongPress={() => onDelete(mix)}
          icon={<DeleteIcon size={14} />}
          progressVariant="fill"
          className="flex-1 min-w-0"
          style={{ height: ROW_ACTION_H, minHeight: 0 }}
          compact
        />
      </div>
    </div>
  );
}

export interface LoadSavedMixesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mix: SavedMixSnapshot) => void;
}

/** In-canvas picker — sits below the header, blurs mixer content behind. */
export function LoadSavedMixesSheet({
  open,
  onOpenChange,
  onSelect,
}: LoadSavedMixesSheetProps) {
  const mixes = useSavedMixesStore((s) => s.mixes);
  const deleteMix = useSavedMixesStore((s) => s.deleteMix);
  const updateMixMetaName = useSavedMixesStore((s) => s.updateMixMetaName);
  const [renameMix, setRenameMix] = useState<SavedMixSnapshot | null>(null);

  useEffect(() => {
    if (!open) setRenameMix(null);
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
        style={{
          backgroundColor: OUTSIDE_DIM,
        }}
      />

      <div
        className="load-sheet-panel relative flex flex-col min-h-0 flex-1 mx-3 mt-2 mb-4 rounded-2xl overflow-hidden"
        style={{
          border: PANEL_BORDER,
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center rounded-xl shrink-0 transition-colors duration-150"
            style={{
              width: 40,
              height: 40,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: MUTED,
            }}
          >
            <CloseIcon />
          </button>
          <div className="flex-1 min-w-0">
            <h2
              id="load-saved-mixes-title"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: LIST_SIZE + 2,
                fontWeight: 600,
                letterSpacing: "0.05em",
                color: TITLE_COLOR,
                lineHeight: 1.2,
              }}
            >
              Saved mixes
            </h2>
            <p style={{ fontSize: LIST_SIZE, color: MUTED, marginTop: 2 }}>
              {mixes.length === 0
                ? "No saved mixes yet"
                : `${mixes.length} saved · hold Open, Rename, or Delete`}
            </p>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">
          {mixes.length === 0 ? (
            <div
              className="rounded-xl flex flex-col items-center justify-center text-center px-6 py-16"
              style={{
                background: ROW_BG,
                border: PANEL_BORDER,
              }}
            >
              <p style={{ ...LIST_MUTED, letterSpacing: "0.06em" }}>
                Save a mix from the mixer to see it here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col list-none m-0 p-0">
              {mixes.map((mix, index) => (
                <li
                  key={mix.id}
                  style={index < mixes.length - 1 ? { borderBottom: DIVIDER } : undefined}
                >
                  <SavedMixRow
                    mix={mix}
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
