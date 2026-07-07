import React, { type RefObject } from "react";
import { LongPressButton } from "./LongPressButton";
import { LoadIcon, SavedIcon, SaveIcon } from "./ActionIcons";
import {
  FEATURE_PANEL_PAD,
  FEATURE_CONTENT_GAP,
  FEATURE_VALUE_COLOR,
  FEATURE_VALUE_COLOR_MUTED,
  FEATURE_VALUE_FONT,
  FEATURE_VALUE_TEXT_CLASS,
} from "../featureReadout";
import { FeatureReadoutStack } from "./FeatureReadoutStack";

const REC_BATCH_LABEL = "Rec. batch";
const PANEL_BG = "transparent";

/** Match bottom action grid in BatchMixer. */
export const ACTION_ROW_H = 38;
export const ACTION_ROW_GAP = 8;
export const ACTION_BLOCK_H = ACTION_ROW_H * 2 + ACTION_ROW_GAP;

function formatRecommendedBatch(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(3)} kg`;
  return `${Math.round(grams)} g`;
}

export function LockIcon({ locked, size = 16 }: { locked: boolean; size?: number }) {
  if (locked) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 9.5-1" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
  saveButtonRef?: RefObject<HTMLButtonElement | null>;
  actionsBlockRef?: RefObject<HTMLDivElement | null>;
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
  saveButtonRef,
  actionsBlockRef,
}: RecBatchPanelProps) {
  return (
    <div
      className="flex flex-1 flex-col min-w-0 rounded-xl"
      style={{
        padding: FEATURE_PANEL_PAD,
        background: PANEL_BG,
        opacity: muted ? 0.88 : 1,
        transition: "opacity 0.2s ease",
        gap: FEATURE_CONTENT_GAP,
        pointerEvents: "auto",
        ...(isLocked && panelZIndex != null
          ? { position: "relative" as const, zIndex: panelZIndex }
          : {}),
      }}
    >
      <FeatureReadoutStack label={REC_BATCH_LABEL} muted={muted}>
        <span
          className={FEATURE_VALUE_TEXT_CLASS}
          style={{
            ...FEATURE_VALUE_FONT,
            color: muted ? FEATURE_VALUE_COLOR_MUTED : FEATURE_VALUE_COLOR,
          }}
        >
          {formatRecommendedBatch(recommendedTotalGrams)}
        </span>
      </FeatureReadoutStack>

      <div
        ref={actionsBlockRef}
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
            ref={saveButtonRef}
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
