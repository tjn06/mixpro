import { useState, type RefObject } from "react";
import type { BucketSelection } from "../../domain/bucket/types";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import { LongPressButton } from "../shared/LongPressButton";
import { InfoIcon, LoadIcon, SavedIcon, SaveIcon, BaseConfigIcon } from "../shared/ActionIcons";
import { RecBatchInfoSheet } from "../sheets/RecBatchInfoSheet";
import { cv } from "../../ui/tokens";
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
const INFO_ICON_SIZE = 18;
const REC_BATCH_BADGE_SIZE = 11;

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

export interface RecBatchPanelProps {
  recommendedTotalGrams: number;
  recommendedForBucketGrams: number;
  currentMixTotalGrams: number;
  bucketSelection: BucketSelection;
  mixFillPercent: number | null;
  onReset: () => void;
  onSave: () => void;
  onLoad: () => void;
  saveFlash?: boolean;
  loadedSavedMix?: SavedMixSnapshot | null;
  canLoad?: boolean;
  /** Override Save mix label (e.g. session commit). */
  saveLabelOverride?: string;
  saveConfirmAction?: string;
  /** Optional hold hint under the primary action (stacked only when provided elsewhere). */
  saveDescription?: string;
  /** Use check icon instead of save (non-session flash / legacy). Session uses text label. */
  useCommitIcon?: boolean;
  /** Session Mode — teal fill on commit button. */
  sessionTone?: boolean;
  /** Hide Load mix (session nested calculator). */
  hideLoad?: boolean;
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
  recommendedForBucketGrams,
  currentMixTotalGrams,
  bucketSelection,
  mixFillPercent,
  onReset,
  onSave,
  onLoad,
  saveFlash = false,
  loadedSavedMix = null,
  canLoad = false,
  saveLabelOverride,
  saveConfirmAction,
  useCommitIcon = false,
  sessionTone = false,
  hideLoad = false,
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
  const [infoOpen, setInfoOpen] = useState(false);
  const saveLabel = saveFlash
    ? saveLabelOverride
      ? "Added"
      : "Saved"
    : saveLabelOverride ?? (loadedSavedMix ? "Update mix" : "Save mix");
  const saveConfirm = saveConfirmAction ?? "SAVE MIX";
  const saveIcon =
    sessionTone ? undefined : saveFlash || useCommitIcon ? <SavedIcon /> : <SaveIcon />;

  return (
    <>
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
            <div
              className="flex items-center justify-center w-full min-w-0"
              style={{ gap: 5 }}
            >
              <span
                className="uppercase truncate min-w-0"
                style={{
                  ...FEATURE_TITLE_STYLE,
                  color: muted ? FEATURE_TITLE_COLOR_MUTED : FEATURE_TITLE_COLOR,
                }}
              >
                {REC_BATCH_LABEL}
              </span>
              <span
                className="shrink-0 flex items-center"
                style={{
                  color: muted ? FEATURE_TITLE_COLOR_MUTED : FEATURE_TITLE_COLOR,
                  opacity: muted ? 0.75 : 0.92,
                }}
                aria-hidden
              >
                <BaseConfigIcon size={REC_BATCH_BADGE_SIZE} />
              </span>
            </div>
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

          <div
            className="flex w-full min-w-0 shrink-0"
            style={{
              height: "var(--action-row-h)",
              borderTop: FEATURE_PANEL_BORDER,
            }}
          >
            <button
              type="button"
              aria-label="About recommended batch"
              disabled={disabled}
              className="relative flex shrink-0 items-center justify-center touch-none transition-colors duration-150 active:opacity-85"
              style={{
                width: "var(--action-row-h)",
                height: "var(--action-row-h)",
                minHeight: 0,
                borderRadius: 0,
                border: "none",
                borderRight: FEATURE_PANEL_BORDER,
                background: cv.action.longPressIdle,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? cv.longPress.disabledOpacity : 1,
                color: cv.longPress.labelIdle,
              }}
              onClick={() => {
                if (disabled) return;
                setInfoOpen(true);
              }}
            >
              <InfoIcon size={INFO_ICON_SIZE} />
            </button>
            <LongPressButton
              ref={resetButtonRef}
              label="RESET"
              confirmAction="RESET"
              onLongPress={onReset}
              disabled={disabled}
              labelSize="var(--text-ui-xs)"
              className="flex-1 min-w-0 rounded-none"
              style={{
                height: "var(--action-row-h)",
                minHeight: 0,
                borderRadius: 0,
                border: "none",
              }}
            />
          </div>
        </div>

        <div
          ref={actionsBlockRef}
          className="flex w-full min-w-0 shrink-0"
          style={{ gap: "var(--action-row-gap)", height: "var(--action-row-h)" }}
        >
          <LongPressButton
            ref={saveButtonRef}
            label={saveLabel}
            confirmAction={saveConfirm}
            onLongPress={onSave}
            variant="primary"
            sessionTone={sessionTone}
            icon={saveIcon}
            className="flex-1 h-full min-w-0"
          />
          {hideLoad ? null : (
            <LongPressButton
              label="Load mix"
              confirmAction="LOAD MIX"
              onLongPress={onLoad}
              disabled={!canLoad || disabled}
              icon={<LoadIcon />}
              className="flex-1 h-full min-w-0"
            />
          )}
        </div>
      </div>

      <RecBatchInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        bucketSelection={bucketSelection}
        recommendedNominalGrams={recommendedTotalGrams}
        recommendedForBucketGrams={recommendedForBucketGrams}
        currentMixTotalGrams={currentMixTotalGrams}
        mixFillPercent={mixFillPercent}
      />
    </>
  );
}
