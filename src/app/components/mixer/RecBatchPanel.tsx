import React, { type RefObject } from "react";
import { LongPressButton } from "../shared/LongPressButton";
import { LoadIcon, SavedIcon, SaveIcon } from "../shared/ActionIcons";
import {
  FEATURE_PANEL_BG,
  FEATURE_PANEL_BORDER,
  FEATURE_TITLE_STYLE,
  FEATURE_TITLE_COLOR,
  FEATURE_TITLE_COLOR_MUTED,
  FEATURE_VALUE_COLOR,
  FEATURE_VALUE_COLOR_MUTED,
  FEATURE_VALUE_FONT,
} from "../../presentation/featureReadout";

const REC_BATCH_LABEL = "Rec. batch";

/** Match bottom action grid in BatchMixer. */
export const ACTION_BLOCK_H = "var(--bottom-action-h)";

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

import type { SavedMixSnapshot } from "../../saved-mixes/types";

export interface RecBatchPanelProps {
  recommendedTotalGrams: number;
  onReset: () => void;
  onSave: () => void;
  onLoad: () => void;
  saveFlash?: boolean;
  loadedSavedMix?: SavedMixSnapshot | null;
  canLoad?: boolean;
  isLocked?: boolean;
  panelZIndex?: number;
  disabled?: boolean;
  muted?: boolean;
  saveButtonRef?: RefObject<HTMLButtonElement | null>;
  actionsBlockRef?: RefObject<HTMLDivElement | null>;
  resetButtonRef?: RefObject<HTMLButtonElement | null>;
  /** Rec. batch readout + Reset card (excludes Save/Load). */
  recPanelRef?: RefObject<HTMLDivElement | null>;
  /** Rec. batch label + value row (excluded from locked Save overlay). */
  recReadoutRef?: RefObject<HTMLDivElement | null>;
}

export function RecBatchPanel({
  recommendedTotalGrams,
  onReset,
  onSave,
  onLoad,
  saveFlash = false,
  loadedSavedMix = null,
  canLoad = false,
  isLocked = false,
  panelZIndex,
  disabled = false,
  muted = false,
  saveButtonRef,
  actionsBlockRef,
  resetButtonRef,
  recPanelRef,
  recReadoutRef,
}: RecBatchPanelProps) {
  const saveLabel = saveFlash ? "Saved" : loadedSavedMix ? "Update mix" : "Save mix";
  const saveIcon = saveFlash ? <SavedIcon /> : <SaveIcon />;

  return (
    <div
      className="flex flex-1 flex-col min-w-0 w-full min-h-0 h-full"
      style={{
        gap: "var(--action-row-gap)",
        pointerEvents: "auto",
        opacity: muted ? 0.88 : 1,
        transition: "opacity 0.2s ease",
        ...(isLocked && panelZIndex != null
          ? { position: "relative" as const, zIndex: panelZIndex }
          : {}),
      }}
    >
      <div
        ref={recPanelRef}
        className="flex w-full flex-col min-w-0 rounded-xl overflow-hidden shrink-0"
        style={{
          background: FEATURE_PANEL_BG,
          border: FEATURE_PANEL_BORDER,
          transition: "border-color 0.2s ease",
        }}
      >
        <div
          ref={recReadoutRef}
          className="flex flex-col items-center text-center w-full min-w-0"
          style={{
            paddingTop: "var(--feature-panel-pt)",
            paddingBottom: "var(--action-readout-pb)",
            gap: "var(--feature-label-gap)",
            ...(disabled ? { position: "relative" as const, zIndex: 8 } : {}),
          }}
        >
          <span
            className="uppercase truncate w-full"
            style={{
              ...FEATURE_TITLE_STYLE,
              color: muted ? FEATURE_TITLE_COLOR_MUTED : FEATURE_TITLE_COLOR,
            }}
          >
            {REC_BATCH_LABEL}
          </span>
          <span
            className="tabular-nums whitespace-nowrap"
            style={{
              ...FEATURE_VALUE_FONT,
              color: muted ? FEATURE_VALUE_COLOR_MUTED : FEATURE_VALUE_COLOR,
            }}
          >
            {formatRecommendedBatch(recommendedTotalGrams)}
          </span>
        </div>

        <LongPressButton
          ref={resetButtonRef}
          label="RESET"
          confirmAction="RESET"
          onLongPress={onReset}
          disabled={disabled}
          labelSize="var(--text-ui-xs)"
          className="w-full rounded-none"
          style={{
            height: "var(--action-row-h)",
            minHeight: 0,
            borderRadius: 0,
            border: "none",
            borderTop: FEATURE_PANEL_BORDER,
          }}
        />
      </div>

      <div
        ref={actionsBlockRef}
        className="flex w-full min-w-0 shrink-0"
        style={{ gap: "var(--action-row-gap)", height: "var(--action-row-h)" }}
      >
        <LongPressButton
          ref={saveButtonRef}
          label={saveLabel}
          confirmAction="SAVE MIX"
          onLongPress={onSave}
          variant="primary"
          icon={saveIcon}
          className="flex-1 h-full min-w-0"
        />
        <LongPressButton
          label="Load mix"
          confirmAction="LOAD MIX"
          onLongPress={onLoad}
          disabled={!canLoad || disabled}
          icon={<LoadIcon />}
          className="flex-1 h-full min-w-0"
        />
      </div>
    </div>
  );
}
