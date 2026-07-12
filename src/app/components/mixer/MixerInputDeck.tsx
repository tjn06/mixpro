import { useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { MIX_PARAMS as PARAMS, formatMixAmount as fmt } from "../../domain/mix/entities";
import {
  CARD_CHROME_TRANSITION,
  CARD_UNIT_INACTIVE,
  CARD_VALUE_INACTIVE,
  ENTITY_SURFACE_IDLE,
  entityCardChrome,
} from "../../presentation/entityCardStyles";
import {
  MIXER_DRAG_FOCUS_Z,
  MIXER_ENTITY_BORDER_ACTIVE,
  MIXER_ENTITY_BORDER_W,
  MIXER_SWIPE_STEP_IDLE,
  MIXER_SWIPE_SURFACE_BASE,
  MIXER_SWIPE_ZONES,
  mixerEntityActiveRing,
  mixerEntityCardShadow,
  mixerSwipeZoneActive,
  mixerSwipeZoneStripe,
} from "../../presentation/mixerSwipeConfig";
import { useMixerSwipeAdjust } from "../../hooks/useMixerSwipeAdjust";
import {
  mixerCardConnectorStyle,
  useMixerCardConnectors,
} from "../../hooks/useMixerCardConnectors";
import type { BlendingRecipe } from "../../domain/recipe/types";
import type { BucketSelection } from "../../domain/bucket/types";
import type { SandType } from "../../domain/mix/volume";
import {
  MixerCardLimitFlash,
  MixerCardReadout,
  MixerSwipeChevronStack,
} from "./MixerSwipeParts";
import { theme } from "../../../theme";

const { colors: c, borders: b } = theme;

function entitySurfaceLit(color: string): string {
  return `color-mix(in srgb, ${color} 8%, ${ENTITY_SURFACE_IDLE})`;
}

export interface MixerInputDeckProps {
  recipe: BlendingRecipe;
  values: number[];
  entityIndexes: number[];
  active: number;
  onActiveChange: (index: number) => void;
  onValuesChange: (next: number[]) => void;
  bucketSelection: BucketSelection;
  sandType: SandType;
  disabled?: boolean;
  footer?: ReactNode;
  className?: string;
}

/** Stripped mixer control deck — ingredient cards + vertical swipe zones (no bucket / TOTAL tile). */
export function MixerInputDeck({
  recipe,
  values,
  entityIndexes,
  active,
  onActiveChange,
  onValuesChange,
  bucketSelection,
  sandType,
  disabled = false,
  footer,
  className = "",
}: MixerInputDeckProps) {
  const {
    swipeAreaRef,
    activeZone,
    dragDirection,
    dragBlocked,
    dragFocus,
    onSwipeDown,
    onSwipeMove,
    onSwipeEnd,
  } = useMixerSwipeAdjust({
    recipe,
    values,
    onValuesChange,
    active,
    bucketSelection,
    sandType,
    disabled,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const getParamColor = useCallback((pi: number) => PARAMS[pi].color, []);
  const { connectorLines } = useMixerCardConnectors({
    containerRef,
    cardRefs,
    swipeAreaRef,
    entityIndexes,
    active,
    enabled: !disabled,
    getParamColor,
    remeasureKey: values,
  });

  const activeParam = PARAMS[active];
  const col = activeParam.color;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col min-w-0 ${className}`}
      style={{ gap: "var(--section-gap)" }}
    >
      {connectorLines.map((line, i) => (
        <div
          key={i}
          aria-hidden
          style={mixerCardConnectorStyle(line, dragFocus, !disabled)}
        />
      ))}

      <div className="flex min-w-0" style={{ gap: "var(--section-gap)" }}>
        {entityIndexes.map((pi) => {
          const p = PARAMS[pi];
          const isAct = active === pi;
          const cardLit = isAct && !disabled;
          const chrome = entityCardChrome(p.color, cardLit);
          const cardBump = dragBlocked && isAct && !disabled;

          return (
            <button
              key={p.id}
              ref={(el) => {
                cardRefs.current[pi] = el;
              }}
              type="button"
              disabled={disabled}
              onClick={() => onActiveChange(pi)}
              className="flex-1 flex flex-col items-center rounded-xl relative overflow-hidden"
              style={{
                paddingTop: "var(--entity-card-pt)",
                paddingBottom: "var(--entity-card-pb)",
                background: cardLit ? entitySurfaceLit(p.color) : ENTITY_SURFACE_IDLE,
                border: chrome.border,
                boxShadow: chrome.boxShadow,
                transition: CARD_CHROME_TRANSITION,
                transform: cardBump ? "scale(1.035)" : undefined,
                opacity: disabled ? 0.55 : 1,
                cursor: disabled ? "default" : "pointer",
                ...(dragFocus && isAct && !disabled
                  ? { position: "relative" as const, zIndex: MIXER_DRAG_FOCUS_Z }
                  : {}),
              }}
            >
              {dragBlocked && isAct && !disabled && <MixerCardLimitFlash />}
              <div
                style={{
                  width: 22,
                  height: 3,
                  borderRadius: 2,
                  background: p.color,
                  opacity: cardLit ? 1 : 0.4,
                  marginBottom: "var(--entity-card-bar-mb)",
                  boxShadow: cardLit ? `0 0 6px ${p.color}` : "none",
                }}
              />
              <MixerCardReadout
                name={p.id}
                value={fmt(values[pi], p.isKg)}
                unit={p.isKg ? "kg" : "g"}
                centered
                nameColor={p.color}
                valueColor={cardLit ? c.white : CARD_VALUE_INACTIVE}
                unitColor={CARD_UNIT_INACTIVE}
              />
            </button>
          );
        })}
      </div>

      <div
        className="shrink-0"
        style={{
          zIndex: dragFocus && !disabled ? MIXER_DRAG_FOCUS_Z : 2,
          position: "relative",
          opacity: disabled ? 0.45 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
      >
        <div
          ref={swipeAreaRef}
          className="relative flex rounded-xl overflow-hidden touch-none cursor-ns-resize"
          style={{
            height: "var(--swipe-h)",
            minHeight: 120,
            border: `${MIXER_ENTITY_BORDER_W} solid ${col}${MIXER_ENTITY_BORDER_ACTIVE}`,
            boxShadow:
              dragFocus && !disabled
                ? `${mixerEntityActiveRing(col)}, ${mixerEntityCardShadow(col)}`
                : mixerEntityActiveRing(col),
            background: MIXER_SWIPE_SURFACE_BASE,
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
                    ? mixerSwipeZoneActive(col)
                    : mixerSwipeZoneStripe(zi % 2 === 0),
                  borderRight:
                    zi < MIXER_SWIPE_ZONES.length - 1
                      ? b.swipeColumn
                      : "none",
                  padding: "10px 4px",
                }}
              >
                <MixerSwipeChevronStack direction="up" active={upActive} color={col} />
                <span
                  style={{
                    fontSize: isColAct
                      ? "var(--text-swipe-col-active)"
                      : "var(--text-swipe-col)",
                    fontWeight: 500,
                    color: isColAct ? col : MIXER_SWIPE_STEP_IDLE,
                    lineHeight: 1,
                    transition: "all 0.15s",
                  }}
                  className="pointer-events-none"
                >
                  {zone.label}
                </span>
                <MixerSwipeChevronStack direction="down" active={downActive} color={col} />
              </div>
            );
          })}
        </div>
      </div>

      {footer}
    </div>
  );
}
