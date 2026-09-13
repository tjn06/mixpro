import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { KeepAwakeIcon } from "../shared/ActionIcons";
import {
  CONTENT_FADE_IN_MS,
  CONTENT_FADE_OUT_MS,
  LOCKED_ACTION_ICON_SIZE,
  PRIMARY_BORDER,
} from "../shared/lockedActionCrossfade";
import { localRect, saveCoverTargetRect, type Rect } from "../shared/lockedOverlayMeasure";
import { useScreenWakeLock, formatWakeLockRemaining } from "../../hooks/useScreenWakeLock";
import { cv, componentTokens } from "../../ui/tokens";

export { LOCKED_ACTION_ICON_SIZE } from "../shared/lockedActionCrossfade";

/**
 * When true, the locked overlay morphs from the save button (grow/shrink).
 * Keep Awake is not sourced from save, so fade-in at the expanded rect is the default.
 * Measurement from `saveButtonRef` stays wired either way so morph can be re-enabled.
 */
const MORPH_FROM_SAVE = false;

type OverlayState = {
  show: boolean;
  expanded: boolean;
  visible: boolean;
  rect: Rect;
  collapsed: Rect;
};

export interface LockedSaveOverlayProps {
  isLocked: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  bucketReadoutRef: RefObject<HTMLElement | null>;
  recReadoutRef: RefObject<HTMLElement | null>;
  actionsBlockRef: RefObject<HTMLElement | null>;
  ingredientCardsRef: RefObject<HTMLElement | null>;
  saveButtonRef: RefObject<HTMLButtonElement | null>;
  expandMs: number;
  expandEase: string;
  zIndex: number;
  surfaceBg: string;
}

function readSectionGap(anchor: HTMLElement): number {
  const raw = getComputedStyle(anchor).getPropertyValue("--section-gap").trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 12;
}

const lp = componentTokens.longPress;

function KeepAwakeToggle({
  active,
  supported,
  failed,
  remainingMs,
  armed,
  onToggle,
}: {
  active: boolean;
  supported: boolean;
  failed: boolean;
  remainingMs: number;
  armed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation("common");
  const remaining = formatWakeLockRemaining(remainingMs);
  const title = active ? t("mixer.wake.screenAwake") : t("mixer.wake.keepAwake");
  const description = !supported
    ? t("mixer.wake.notSupported")
    : failed && armed
      ? t("mixer.wake.failed")
      : active
        ? t("mixer.wake.left", { remaining })
        : armed
          ? t("mixer.wake.starting")
          : t("mixer.wake.hint");

  const lit = active;
  const borderAlpha = lit ? lp.borderAlpha.litSheet : lp.borderAlpha.primaryIdle;
  const labelColor = supported ? cv.longPress.labelIdle : cv.longPress.labelDisabled;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={
        active
          ? t("mixer.wake.ariaOn", { remaining })
          : t("mixer.wake.ariaOff")
      }
      disabled={!supported}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl touch-none transition-colors duration-150"
      style={{
        cursor: supported ? "pointer" : "default",
        background: lit ? cv.action.longPressActive : cv.action.longPressIdle,
        border: `${lp.borderWidthSheet}px solid rgba(var(--ui-long-press-border-rgb), ${borderAlpha})`,
        opacity: supported ? 1 : cv.longPress.disabledOpacity,
        color: labelColor,
      }}
      onClick={() => {
        if (!supported) return;
        onToggle();
      }}
    >
      <span
        className="relative z-[1] flex items-center text-left"
        style={{ gap: 12, maxWidth: "92%", padding: "0 12px" }}
      >
        <span
          className="flex shrink-0 items-center justify-center"
          style={{ color: labelColor }}
          aria-hidden
        >
          <KeepAwakeIcon size={LOCKED_ACTION_ICON_SIZE} />
        </span>
        <span className="flex min-w-0 flex-col" style={{ gap: 5 }}>
          <span
            className="uppercase"
            style={{
              fontSize: "var(--text-ui-sm)",
              letterSpacing: "0.14em",
              fontWeight: 600,
              color: labelColor,
              lineHeight: 1.15,
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.04em",
              fontWeight: 500,
              color: labelColor,
              opacity: 0.72,
              lineHeight: 1.2,
            }}
          >
            {description}
          </span>
        </span>
      </span>
    </button>
  );
}

export function LockedSaveOverlay({
  isLocked,
  anchorRef,
  bucketReadoutRef,
  recReadoutRef,
  actionsBlockRef,
  ingredientCardsRef,
  saveButtonRef,
  expandMs,
  expandEase,
  zIndex,
  surfaceBg,
}: LockedSaveOverlayProps) {
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keepAwakeArmed, setKeepAwakeArmed] = useState(false);

  const { supported, active, remainingMs, failed } = useScreenWakeLock({
    armed: isLocked && keepAwakeArmed,
    onExpire: () => setKeepAwakeArmed(false),
  });

  useLayoutEffect(() => {
    if (!isLocked) setKeepAwakeArmed(false);
  }, [isLocked]);

  useLayoutEffect(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }

    const measure = () => {
      const anchor = anchorRef.current;
      const bucketReadout = bucketReadoutRef.current;
      const recReadout = recReadoutRef.current;
      const actions = actionsBlockRef.current;
      const save = saveButtonRef.current;
      const cards = ingredientCardsRef.current;
      if (!anchor || !bucketReadout || !recReadout || !actions || !save) return null;

      // Collapsed = save button rect (morph origin when MORPH_FROM_SAVE is enabled).
      const collapsed = localRect(save, anchor);
      const expanded = saveCoverTargetRect(
        localRect(bucketReadout, anchor),
        localRect(recReadout, anchor),
        localRect(actions, anchor),
        cards ? localRect(cards, anchor) : null,
        anchor.offsetWidth,
        readSectionGap(anchor),
      );
      return { collapsed, expanded };
    };

    const applyMorph = (next: { collapsed: Rect; expanded: Rect }, expanded: boolean) => {
      setOverlay((prev) => ({
        show: true,
        expanded,
        visible: true,
        rect: expanded ? next.expanded : next.collapsed,
        collapsed: next.collapsed,
      }));
    };

    const applyFade = (next: { collapsed: Rect; expanded: Rect }, visible: boolean) => {
      setOverlay({
        show: true,
        expanded: true,
        visible,
        rect: next.expanded,
        collapsed: next.collapsed,
      });
    };

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!isLocked) return;
            const next = measure();
            if (!next) return;
            if (MORPH_FROM_SAVE) applyMorph(next, true);
            else applyFade(next, true);
          })
        : null;

    const observe = (el: HTMLElement | null) => {
      if (el && ro) ro.observe(el);
    };
    observe(anchorRef.current);
    observe(bucketReadoutRef.current);
    observe(recReadoutRef.current);
    observe(actionsBlockRef.current);
    observe(ingredientCardsRef.current);

    const next = measure();
    if (!next) return () => ro?.disconnect();

    if (isLocked) {
      if (MORPH_FROM_SAVE) {
        setOverlay({
          show: true,
          expanded: false,
          visible: true,
          rect: next.collapsed,
          collapsed: next.collapsed,
        });
        let innerId = 0;
        const outerId = requestAnimationFrame(() => {
          innerId = requestAnimationFrame(() => {
            applyMorph(next, true);
          });
        });
        return () => {
          cancelAnimationFrame(outerId);
          if (innerId) cancelAnimationFrame(innerId);
          ro?.disconnect();
        };
      }

      applyFade(next, false);
      let innerId = 0;
      const outerId = requestAnimationFrame(() => {
        innerId = requestAnimationFrame(() => {
          applyFade(next, true);
        });
      });
      return () => {
        cancelAnimationFrame(outerId);
        if (innerId) cancelAnimationFrame(innerId);
        ro?.disconnect();
      };
    }

    if (MORPH_FROM_SAVE) {
      setOverlay((prev) => {
        if (!prev?.show) return null;
        return { ...prev, expanded: false, visible: true, rect: prev.collapsed };
      });
      collapseTimer.current = setTimeout(() => setOverlay(null), expandMs);
    } else {
      setOverlay((prev) => {
        if (!prev?.show) return null;
        return { ...prev, visible: false };
      });
      collapseTimer.current = setTimeout(() => setOverlay(null), CONTENT_FADE_OUT_MS);
    }

    return () => {
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
        collapseTimer.current = null;
      }
      ro?.disconnect();
    };
  }, [
    isLocked,
    anchorRef,
    bucketReadoutRef,
    recReadoutRef,
    actionsBlockRef,
    ingredientCardsRef,
    saveButtonRef,
    expandMs,
  ]);

  if (!overlay?.show) return null;

  const morphTransition = `top ${expandMs}ms ${expandEase}, left ${expandMs}ms ${expandEase}, width ${expandMs}ms ${expandEase}, height ${expandMs}ms ${expandEase}, border-color ${expandMs}ms ${expandEase}`;
  const fadeTransition = overlay.visible
    ? `opacity ${CONTENT_FADE_IN_MS}ms ${expandEase}`
    : `opacity ${CONTENT_FADE_OUT_MS}ms ease-out`;

  const shellStyle: CSSProperties = {
    position: "absolute",
    zIndex,
    top: overlay.rect.top,
    left: overlay.rect.left,
    width: overlay.rect.width,
    height: overlay.rect.height,
    transition: MORPH_FROM_SAVE ? morphTransition : fadeTransition,
    opacity: MORPH_FROM_SAVE ? 1 : overlay.visible ? 1 : 0,
    pointerEvents: overlay.visible ? "auto" : "none",
    borderRadius: 12,
    overflow: "hidden",
    boxSizing: "border-box",
    background: surfaceBg,
    border: MORPH_FROM_SAVE
      ? overlay.expanded
        ? PRIMARY_BORDER
        : "1.5px solid transparent"
      : PRIMARY_BORDER,
  };

  return (
    <div style={shellStyle}>
      <KeepAwakeToggle
        active={active}
        supported={supported}
        failed={failed}
        remainingMs={remainingMs}
        armed={keepAwakeArmed}
        onToggle={() => setKeepAwakeArmed((v) => !v)}
      />
    </div>
  );
}
