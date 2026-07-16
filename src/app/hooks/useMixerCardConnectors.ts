import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import { RECIPE_RATIO_BORDER_COLOR } from "../presentation/entityCardStyles";
import {
  MIXER_DRAG_FOCUS_Z,
  MIXER_CARD_CONNECTOR_Z,
} from "../presentation/mixerSwipeConfig";
import { componentTokens } from "../ui/tokens";
import type { CSSProperties } from "react";

const ch = componentTokens.chrome;

/** Overlap into card/swipe edges so stubs don't float in the gap. */
const CONNECTOR_OVERLAP_PX = 1;

export type CardConnector = {
  x: number;
  y1: number;
  y2: number;
  color: string;
  active: boolean;
};

export function mixerCardConnectorStyle(
  line: CardConnector,
  dragFocus: boolean,
  enabled: boolean,
): CSSProperties {
  return {
    position: "absolute",
    left: line.x - ch.connectorWidth / 2,
    top: line.y1,
    width: ch.connectorWidth,
    height: Math.max(0, line.y2 - line.y1),
    background: line.active
      ? `${line.color}${ch.entityBorderActiveSuffix}`
      : RECIPE_RATIO_BORDER_COLOR,
    zIndex:
      dragFocus && enabled && line.active
        ? MIXER_DRAG_FOCUS_Z
        : MIXER_CARD_CONNECTOR_Z,
    // Avoid mid-layout height animation that reads as broken stubs during sheet open.
    transition: "left 0.2s ease, background-color 0.2s ease, z-index 0s",
    pointerEvents: "none",
  };
}

export interface UseMixerCardConnectorsOptions {
  containerRef: RefObject<HTMLElement | null>;
  cardRefs: RefObject<(HTMLElement | null)[]>;
  swipeAreaRef: RefObject<HTMLElement | null>;
  /** Optional bottom TOTAL tile — draws a connector from swipe bottom → tile top. */
  totalTileRef?: RefObject<HTMLElement | null>;
  entityIndexes: number[];
  active: number;
  enabled: boolean;
  getParamColor: (index: number) => string;
  remeasureKey?: unknown;
}

export function useMixerCardConnectors({
  containerRef,
  cardRefs,
  swipeAreaRef,
  totalTileRef,
  entityIndexes,
  active,
  enabled,
  getParamColor,
  remeasureKey,
}: UseMixerCardConnectorsOptions) {
  const [connectorLines, setConnectorLines] = useState<CardConnector[]>([]);

  const measure = useCallback(() => {
    if (!enabled) {
      setConnectorLines([]);
      return;
    }
    const root = containerRef.current;
    const swipeEl = swipeAreaRef.current;
    if (!root || !swipeEl) {
      setConnectorLines([]);
      return;
    }

    const rootR = root.getBoundingClientRect();
    const swipeR = swipeEl.getBoundingClientRect();
    const lines: CardConnector[] = [];

    for (const pi of entityIndexes) {
      const cardEl = cardRefs.current?.[pi] ?? null;
      if (!cardEl) continue;
      const cardR = cardEl.getBoundingClientRect();
      const x = cardR.left + cardR.width / 2 - rootR.left;
      const y1 = cardR.bottom - rootR.top - CONNECTOR_OVERLAP_PX;
      const y2 = swipeR.top - rootR.top + CONNECTOR_OVERLAP_PX;
      if (y2 <= y1) continue;
      lines.push({
        x,
        y1,
        y2,
        color: getParamColor(pi),
        active: active === pi,
      });
    }

    const totalEl = totalTileRef?.current ?? null;
    if (totalEl) {
      const totalR = totalEl.getBoundingClientRect();
      const x = totalR.left + totalR.width / 2 - rootR.left;
      const y1 = swipeR.bottom - rootR.top - CONNECTOR_OVERLAP_PX;
      const y2 = totalR.top - rootR.top + CONNECTOR_OVERLAP_PX;
      if (y2 > y1) {
        lines.push({
          x,
          y1,
          y2,
          color: getParamColor(0),
          active: active === 0,
        });
      }
    }

    setConnectorLines(lines);
  }, [
    enabled,
    containerRef,
    swipeAreaRef,
    totalTileRef,
    cardRefs,
    entityIndexes,
    active,
    getParamColor,
  ]);

  useLayoutEffect(() => {
    measure();
    // Sheet enter animation / late flex layout — settle positions after paint.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      measure();
      raf2 = requestAnimationFrame(() => measure());
    });
    const timer = window.setTimeout(measure, 340);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, [measure, remeasureKey]);

  useEffect(() => {
    const root = containerRef.current;
    const swipeEl = swipeAreaRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    if (swipeEl) ro.observe(swipeEl);
    for (const pi of entityIndexes) {
      const cardEl = cardRefs.current?.[pi];
      if (cardEl) ro.observe(cardEl);
    }
    const totalEl = totalTileRef?.current;
    if (totalEl) ro.observe(totalEl);
    return () => ro.disconnect();
  }, [measure, containerRef, swipeAreaRef, totalTileRef, cardRefs, entityIndexes, remeasureKey]);

  return { connectorLines, measure };
}
