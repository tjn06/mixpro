import React from "react";
import { LongPressButton } from "./LongPressButton";
import { LoadIcon, SavedIcon, SaveIcon } from "./ActionIcons";

const REC_BATCH_LABEL = "Rec. batch";
const PANEL_PAD = "7px 6px 6px";
const PANEL_BG = "transparent";
const TITLE_SIZE = 12;
const VALUE_SIZE = 16;
const TITLE_COLOR = "#8888a8";
const TITLE_COLOR_MUTED = "#686878";
const VALUE_COLOR = "#c4c4dc";
const VALUE_COLOR_MUTED = "#9898b4";

/** Match bottom action grid in BatchMixer. */
const ACTION_ROW_H = 38;
const ACTION_ROW_GAP = 8;
const ACTION_BLOCK_H = ACTION_ROW_H * 2 + ACTION_ROW_GAP;

function formatRecommendedBatch(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(3)} kg`;
  return `${Math.round(grams)} g`;
}

export function LockIcon({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 9.5-1" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export interface RecBatchPanelProps {
  recommendedTotalGrams: number;
  onReset: () => void;
  onSave: () => void;
  onLoad: () => void;
  saveFlash?: boolean;
  canLoad?: boolean;
  isLocked?: boolean;
  panelZIndex?: number;
  disabled?: boolean;
  muted?: boolean;
}

export function RecBatchPanel({
  recommendedTotalGrams,
  onReset,
  onSave,
  onLoad,
  saveFlash = false,
  canLoad = false,
  isLocked = false,
  panelZIndex,
  disabled = false,
  muted = false,
}: RecBatchPanelProps) {
  return (
    <div
      className="flex flex-1 flex-col min-w-0 rounded-xl"
      style={{
        padding: PANEL_PAD,
        background: PANEL_BG,
        opacity: muted ? 0.88 : 1,
        transition: "opacity 0.2s ease",
        gap: ACTION_ROW_GAP,
        justifyContent: "space-between",
        pointerEvents: "auto",
        ...(isLocked && panelZIndex != null
          ? { position: "relative" as const, zIndex: panelZIndex }
          : {}),
      }}
    >
      <div className="flex flex-col items-center shrink-0" style={{ gap: 4 }}>
        <span
          className="uppercase truncate max-w-full text-center"
          style={{
            fontSize: TITLE_SIZE,
            letterSpacing: "0.12em",
            fontWeight: 700,
            color: muted ? TITLE_COLOR_MUTED : TITLE_COLOR,
            lineHeight: 1.1,
          }}
        >
          {REC_BATCH_LABEL}
        </span>
        <span
          className="whitespace-nowrap tabular-nums text-center truncate max-w-full"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: VALUE_SIZE,
            fontWeight: 600,
            letterSpacing: "0.06em",
            lineHeight: 1,
            color: muted ? VALUE_COLOR_MUTED : VALUE_COLOR,
          }}
        >
          {formatRecommendedBatch(recommendedTotalGrams)}
        </span>
      </div>

      <div
        className="flex flex-col shrink-0"
        style={{ gap: ACTION_ROW_GAP, height: ACTION_BLOCK_H }}
      >
        <LongPressButton
          label="RESTORE BATCH"
          confirmAction="RESTORE BATCH"
          onLongPress={onReset}
          disabled={disabled}
          labelSize={9}
          className="w-full"
          style={{ height: ACTION_ROW_H }}
        />
        <div className="flex min-w-0" style={{ gap: ACTION_ROW_GAP, height: ACTION_ROW_H }}>
          <LongPressButton
            label={saveFlash ? "Saved" : "Save mix"}
            confirmAction="SAVE MIX"
            onLongPress={onSave}
            variant="primary"
            icon={saveFlash ? <SavedIcon /> : <SaveIcon />}
            className="flex-1 h-full"
          />
          <LongPressButton
            label="Load mix"
            confirmAction="LOAD MIX"
            onLongPress={onLoad}
            disabled={!canLoad || disabled}
            icon={<LoadIcon />}
            className="flex-1 h-full"
          />
        </div>
      </div>
    </div>
  );
}
