import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BlendingRecipe } from "../../domain/recipe/types";
import type { BucketSelection } from "../../domain/bucket/types";
import type { SandType } from "../../domain/mix/volume";
import { MIX_PARAMS as PARAMS, formatMixAmount as fmt } from "../../domain/mix/entities";
import { SavedIcon, CloseIcon } from "../shared/ActionIcons";
import { LongPressButton } from "../shared/LongPressButton";
import { MixerInputDeck } from "../mixer/MixerInputDeck";
import {
  MixerTotalTile,
  MIXER_BOTTOM_TOTAL_WIDTH,
} from "../mixer/MixerTotalTile";
import { SHEET_SUBTITLE, SHEET_TITLE, SHEET_COVER_HEADER_STYLE } from "./sheetChrome";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import { entityAccentColor } from "../../presentation/entityAccent";
import {
  MIXER_DRAG_FOCUS_Z,
  MIXER_DRAG_OVERLAY_Z,
  MIXER_OVERLAY_HINT,
} from "../../presentation/mixerSwipeConfig";
import { useSettingsStore } from "../../settings/store";

/** Match LoadSavedMixesSheet / SaveMixNameSheet chrome. */
const SHEET_PAD_X = 20;

export interface MixerInputSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  recipe: BlendingRecipe;
  values: number[];
  entityIndexes: number[];
  bucketSelection: BucketSelection;
  sandType: SandType;
  onApply: (values: number[]) => void;
}

/** Full-height sheet — mixer-style deck with TOTAL + actions (no sheet footer). */
export function MixerInputSheet({
  open,
  onOpenChange,
  title = "Extra batch",
  subtitle = "One custom batch — added on top of your batches",
  recipe,
  values,
  entityIndexes,
  bucketSelection,
  sandType,
  onApply,
}: MixerInputSheetProps) {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const [draftValues, setDraftValues] = useState(values);
  const [active, setActive] = useState(0);
  const [dragFocus, setDragFocus] = useState(false);
  const totalTileRef = useRef<HTMLButtonElement>(null);

  /** Top row is ingredients only — TOTAL sits in the bottom bar like the mix screen. */
  const cardIndexes = useMemo(
    () => entityIndexes.filter((i) => i !== 0),
    [entityIndexes],
  );

  useEffect(() => {
    if (!open) return;
    setDraftValues([...values]);
    setActive(0);
    setDragFocus(false);
  }, [open, values]);

  const handleApply = () => {
    onApply(draftValues);
    onOpenChange(false);
  };

  const handleDragFocusChange = useCallback((next: boolean) => {
    setDragFocus(next);
  }, []);

  const totalParam = PARAMS[0];
  const totalColor = entityAccentColor(totalParam.id, colorScheme);
  const totalActive = active === 0;
  const activeParam = PARAMS[active] ?? totalParam;
  const overlayAccent = entityAccentColor(activeParam.id, colorScheme);

  return (
    <AppFrameCoverSheet
      open={open}
      zIndex={35}
      ariaLabelledBy="mixer-input-sheet-title"
    >
      <div className="relative flex flex-col min-h-0 flex-1 overflow-hidden">
        {dragFocus ? (
          <div
            className="absolute inset-0"
            style={{
              zIndex: MIXER_DRAG_OVERLAY_Z,
              pointerEvents: "auto",
              transition: "opacity 0.15s ease",
            }}
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{ background: MIXER_OVERLAY_HINT }}
            />
            <div
              className="absolute inset-0"
              style={{ background: overlayAccent, opacity: 0.1 }}
            />
          </div>
        ) : null}

        <header
          className="shrink-0 flex flex-col items-center text-center"
          style={SHEET_COVER_HEADER_STYLE}
        >
          <h2 id="mixer-input-sheet-title" style={SHEET_TITLE}>
            {title}
          </h2>
          {subtitle ? (
            <p style={{ ...SHEET_SUBTITLE, maxWidth: 280, textAlign: "center" }}>
              {subtitle}
            </p>
          ) : null}
        </header>

        <div
          className="flex-1 min-h-0 flex flex-col"
          style={{
            paddingLeft: SHEET_PAD_X,
            paddingRight: SHEET_PAD_X,
            paddingBottom: 12,
          }}
        >
          <div className="flex-1 min-h-0" aria-hidden />

          <MixerInputDeck
            recipe={recipe}
            values={draftValues}
            entityIndexes={cardIndexes}
            active={active}
            onActiveChange={setActive}
            onValuesChange={setDraftValues}
            bucketSelection={bucketSelection}
            sandType={sandType}
            totalTileRef={totalTileRef}
            onDragFocusChange={handleDragFocusChange}
            footer={({ dragFocus: deckDragFocus }) => (
              <div
                className="flex items-stretch min-w-0"
                style={{
                  height: "var(--bottom-action-h)",
                  gap: "var(--action-row-gap)",
                }}
              >
                <div
                  className="min-w-0 h-full"
                  style={{
                    flex: `0 0 ${MIXER_BOTTOM_TOTAL_WIDTH}`,
                    position: "relative",
                    zIndex:
                      deckDragFocus && totalActive
                        ? MIXER_DRAG_FOCUS_Z
                        : deckDragFocus
                          ? 2
                          : undefined,
                    pointerEvents: deckDragFocus ? "none" : "auto",
                  }}
                >
                  <MixerTotalTile
                    ref={totalTileRef}
                    color={totalColor}
                    colorScheme={colorScheme}
                    valueKg={fmt(draftValues[0] ?? 0, totalParam.isKg)}
                    isActive={totalActive}
                    onClick={() => setActive(0)}
                  />
                </div>

                <div
                  className="flex flex-1 flex-col min-w-0 justify-center"
                  style={{ gap: "var(--action-row-gap)" }}
                >
                  <div style={{ height: "var(--bottom-sub-row-h)" }}>
                    <LongPressButton
                      label="Close"
                      confirmAction="CLOSE"
                      onLongPress={() => onOpenChange(false)}
                      icon={<CloseIcon />}
                      progressVariant="water"
                      disabled={deckDragFocus}
                      className="w-full h-full"
                    />
                  </div>
                  <div style={{ height: "var(--bottom-sub-row-h)" }}>
                    <LongPressButton
                      label="Apply"
                      confirmAction="APPLY"
                      onLongPress={handleApply}
                      icon={<SavedIcon />}
                      progressVariant="water"
                      disabled={deckDragFocus}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </AppFrameCoverSheet>
  );
}
