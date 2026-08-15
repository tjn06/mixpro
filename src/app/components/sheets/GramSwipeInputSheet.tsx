import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatMixAmount as fmt } from "../../domain/mix/entities";
import { useSingleValueSwipeAdjust } from "../../hooks/useSingleValueSwipeAdjust";
import { entityAccentColor } from "../../presentation/entityAccent";
import {
  CARD_CHROME_TRANSITION,
  entitySurfaceLit,
} from "../../presentation/entityCardStyles";
import {
  MIXER_DRAG_FOCUS_Z,
  MIXER_DRAG_OVERLAY_Z,
  MIXER_ENTITY_BORDER_ACTIVE,
  MIXER_ENTITY_BORDER_W,
  MIXER_OVERLAY_HINT,
  MIXER_SWIPE_COLUMN_BORDER,
  MIXER_SWIPE_STEP_IDLE,
  MIXER_SWIPE_ZONES,
  mixerEntityActiveRing,
  mixerEntityCardShadow,
  mixerSwipeZoneActive,
  mixerSwipeZoneStripe,
} from "../../presentation/mixerSwipeConfig";
import { useSettingsStore } from "../../settings/store";
import { CloseIcon, SavedIcon } from "../shared/ActionIcons";
import { LongPressButton } from "../shared/LongPressButton";
import {
  MixerTotalTile,
  MIXER_BOTTOM_TOTAL_WIDTH,
} from "../mixer/MixerTotalTile";
import { MixerSwipeChevronStack } from "../mixer/MixerSwipeParts";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import { SHEET_COVER_HEADER_STYLE, SHEET_SUBTITLE, SHEET_TITLE } from "./sheetChrome";

const SHEET_PAD_X = 20;

export interface GramSwipeInputSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Field name shown in the header (e.g. Resin A). */
  fieldLabel: string;
  /** Current field value in grams. */
  valueGrams: number;
  /** Commit grams into the base field. */
  onApply: (grams: number) => void;
}

/**
 * Simplified Extra-batch-style cover: TOTAL tile + swipe zones only.
 * Portaled into `.app-frame` like MixerInputSheet so it covers the screen the same way.
 */
export function GramSwipeInputSheet({
  open,
  onOpenChange,
  fieldLabel,
  valueGrams,
  onApply,
}: GramSwipeInputSheetProps) {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const [draftGrams, setDraftGrams] = useState(Math.max(0, valueGrams));
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPortal(null);
      return;
    }
    setPortal(document.querySelector<HTMLElement>(".app-frame"));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDraftGrams(Math.max(0, Number.isFinite(valueGrams) ? valueGrams : 0));
  }, [open, valueGrams]);

  const {
    swipeAreaRef,
    activeZone,
    dragDirection,
    dragFocus,
    onSwipeDown,
    onSwipeMove,
    onSwipeEnd,
  } = useSingleValueSwipeAdjust({
    valueGrams: draftGrams,
    onValueChange: setDraftGrams,
    disabled: !open,
  });

  const handleApply = useCallback(() => {
    onApply(draftGrams);
    onOpenChange(false);
  }, [draftGrams, onApply, onOpenChange]);

  const totalColor = entityAccentColor("TOTAL", colorScheme);
  const titleId = "gram-swipe-input-sheet-title";

  if (!open || !portal) return null;

  const sheet = (
    <AppFrameCoverSheet open={open} zIndex={40} ariaLabelledBy={titleId}>
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
              style={{ background: totalColor, opacity: 0.1 }}
            />
          </div>
        ) : null}

        <header
          className="shrink-0 flex flex-col items-center text-center"
          style={SHEET_COVER_HEADER_STYLE}
        >
          <h2 id={titleId} style={SHEET_TITLE}>
            Set {fieldLabel}
          </h2>
          <p style={{ ...SHEET_SUBTITLE, maxWidth: 300, textAlign: "center" }}>
            Drag the zones to dial the weight. Confirm writes grams into the field.
          </p>
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

          <div
            className="relative flex flex-col min-w-0"
            style={{ gap: "var(--section-gap)" }}
          >
            <div
              className="shrink-0"
              style={{
                zIndex: dragFocus ? MIXER_DRAG_FOCUS_Z : 1,
                position: "relative",
              }}
            >
              <div
                ref={swipeAreaRef}
                className="relative flex rounded-xl overflow-hidden touch-none cursor-ns-resize"
                style={{
                  height: "var(--swipe-h)",
                  minHeight: 120,
                  border: `${MIXER_ENTITY_BORDER_W} solid ${totalColor}${MIXER_ENTITY_BORDER_ACTIVE}`,
                  boxShadow: `${mixerEntityActiveRing(totalColor)}, ${mixerEntityCardShadow(totalColor, colorScheme)}`,
                  background: entitySurfaceLit(totalColor, colorScheme),
                  transition: CARD_CHROME_TRANSITION,
                }}
                onPointerDown={onSwipeDown}
                onPointerMove={onSwipeMove}
                onPointerUp={onSwipeEnd}
                onPointerCancel={onSwipeEnd}
                onLostPointerCapture={onSwipeEnd}
              >
                {MIXER_SWIPE_ZONES.map((zone, zi) => {
                  const isColAct = activeZone === zi;
                  const upActive = isColAct && dragDirection === "up";
                  const downActive = isColAct && dragDirection === "down";

                  return (
                    <div
                      key={zi}
                      className="relative flex flex-col items-center justify-between transition-all duration-150 pointer-events-none"
                      style={{
                        flex: zone.weight,
                        zIndex: 1,
                        background: isColAct
                          ? mixerSwipeZoneActive(totalColor)
                          : mixerSwipeZoneStripe(zi % 2 === 0),
                        borderRight:
                          zi < MIXER_SWIPE_ZONES.length - 1
                            ? MIXER_SWIPE_COLUMN_BORDER
                            : "none",
                        padding: "10px 4px",
                      }}
                    >
                      <MixerSwipeChevronStack
                        direction="up"
                        active={upActive}
                        color={totalColor}
                      />
                      <span
                        style={{
                          fontSize: isColAct
                            ? "var(--text-swipe-col-active)"
                            : "var(--text-swipe-col)",
                          fontWeight: 500,
                          color: isColAct ? totalColor : MIXER_SWIPE_STEP_IDLE,
                          lineHeight: 1,
                          transition: "all 0.15s",
                        }}
                        className="pointer-events-none"
                      >
                        {zone.label}
                      </span>
                      <MixerSwipeChevronStack
                        direction="down"
                        active={downActive}
                        color={totalColor}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

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
                  zIndex: dragFocus ? MIXER_DRAG_FOCUS_Z : undefined,
                  pointerEvents: dragFocus ? "none" : "auto",
                }}
              >
                <MixerTotalTile
                  color={totalColor}
                  colorScheme={colorScheme}
                  valueKg={fmt(draftGrams, true)}
                  isActive
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
                    disabled={dragFocus}
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
                    disabled={dragFocus}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppFrameCoverSheet>
  );

  return createPortal(sheet, portal);
}
