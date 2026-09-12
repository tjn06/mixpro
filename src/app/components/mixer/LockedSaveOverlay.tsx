import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { LongPressButton } from "../shared/LongPressButton";
import { SavedIcon, SaveIcon, KeepAwakeIcon } from "../shared/ActionIcons";
import {
  crossfadeLayerStyles,
  LOCKED_ACTION_ICON_SIZE,
  PRIMARY_BORDER,
} from "../shared/lockedActionCrossfade";
import { localRect, saveCoverTargetRect, type Rect } from "../shared/lockedOverlayMeasure";
import { useScreenWakeLock, formatWakeLockRemaining } from "../../hooks/useScreenWakeLock";
import { cv, componentTokens } from "../../ui/tokens";

export { LOCKED_ACTION_ICON_SIZE } from "../shared/lockedActionCrossfade";

type OverlayState = {
  show: boolean;
  expanded: boolean;
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
  onSave: () => void;
  saveFlash?: boolean;
  loadedSavedMix?: { id: string } | null;
  /** Session Mode — commit copy instead of library save. */
  saveLabelOverride?: string;
  saveConfirmAction?: string;
  saveDescriptionOverride?: string;
  useCommitIcon?: boolean;
  /** Session Mode — teal fill on commit button. */
  sessionTone?: boolean;
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
  const title = active ? "Screen awake" : "Keep awake";
  const description = !supported
    ? "Not supported"
    : failed && armed
      ? "Wake failed — tap retry"
      : active
        ? `${formatWakeLockRemaining(remainingMs)} left`
        : armed
          ? "Starting…"
          : "Keep mobile screen on";

  const lit = active;
  const borderAlpha = lit ? lp.borderAlpha.litSheet : lp.borderAlpha.primaryIdle;
  const labelColor = supported ? cv.longPress.labelIdle : cv.longPress.labelDisabled;

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={
        active
          ? `Keep screen on, ${formatWakeLockRemaining(remainingMs)} remaining. Tap to turn off`
          : "Keep mobile screen alive"
      }
      disabled={!supported}
      className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-xl touch-none transition-colors duration-150"
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
  onSave,
  saveFlash = false,
  loadedSavedMix = null,
  saveLabelOverride,
  saveConfirmAction,
  saveDescriptionOverride,
  useCommitIcon = false,
  sessionTone = false,
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

    const apply = (next: { collapsed: Rect; expanded: Rect }, expanded: boolean) => {
      setOverlay((prev) => ({
        show: true,
        expanded,
        rect: expanded ? next.expanded : next.collapsed,
        collapsed: next.collapsed,
      }));
    };

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!isLocked) return;
            const next = measure();
            if (next) apply(next, true);
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
      setOverlay({ show: true, expanded: false, rect: next.collapsed, collapsed: next.collapsed });
      let innerId = 0;
      const outerId = requestAnimationFrame(() => {
        innerId = requestAnimationFrame(() => {
          apply(next, true);
        });
      });
      return () => {
        cancelAnimationFrame(outerId);
        if (innerId) cancelAnimationFrame(innerId);
        ro?.disconnect();
      };
    }

    setOverlay((prev) => {
      if (!prev?.show) return null;
      return { ...prev, expanded: false, rect: prev.collapsed };
    });
    collapseTimer.current = setTimeout(() => setOverlay(null), expandMs);

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

  const transition = `top ${expandMs}ms ${expandEase}, left ${expandMs}ms ${expandEase}, width ${expandMs}ms ${expandEase}, height ${expandMs}ms ${expandEase}, border-color ${expandMs}ms ${expandEase}`;

  const expanded = overlay.expanded;

  const shellStyle: CSSProperties = {
    position: "absolute",
    zIndex,
    top: overlay.rect.top,
    left: overlay.rect.left,
    width: overlay.rect.width,
    height: overlay.rect.height,
    transition,
    pointerEvents: "auto",
    borderRadius: 12,
    overflow: "hidden",
    boxSizing: "border-box",
    background: expanded ? "transparent" : surfaceBg,
    border: expanded ? "1.5px solid transparent" : PRIMARY_BORDER,
  };

  const saveLabel = saveFlash
    ? saveLabelOverride
      ? "Added"
      : "Saved"
    : saveLabelOverride ?? (loadedSavedMix ? "Update mix" : "Save mix");
  const saveDescription = saveFlash
    ? saveLabelOverride
      ? "Mix is in this session"
      : "Stored in your mixes"
    : saveDescriptionOverride ??
      (loadedSavedMix
        ? "Hold to update this saved mix"
        : "Hold to name and store");
  const confirmAction = saveConfirmAction ?? "SAVE MIX";
  const saveIcon =
    sessionTone || saveLabelOverride
      ? undefined
      : saveFlash || useCommitIcon
        ? <SavedIcon size={LOCKED_ACTION_ICON_SIZE} />
        : <SaveIcon size={LOCKED_ACTION_ICON_SIZE} />;
  const compactIcon =
    sessionTone || saveLabelOverride
      ? undefined
      : saveFlash || useCommitIcon
        ? <SavedIcon />
        : <SaveIcon />;

  return (
    <div style={shellStyle}>
      <div style={crossfadeLayerStyles(expanded, expandEase, true)}>
        <div
          className="flex h-full w-full min-w-0"
          style={{ gap: "var(--action-row-gap)" }}
        >
          <KeepAwakeToggle
            active={active}
            supported={supported}
            failed={failed}
            remainingMs={remainingMs}
            armed={keepAwakeArmed}
            onToggle={() => setKeepAwakeArmed((v) => !v)}
          />
          <LongPressButton
            label={saveLabel}
            description={saveDescription}
            confirmAction={confirmAction}
            onLongPress={onSave}
            variant="primary"
            sessionTone={sessionTone}
            progressVariant="water"
            stacked
            labelSize="var(--text-ui-sm)"
            descriptionSize={10}
            icon={saveIcon}
            className="h-full min-w-0 flex-1"
          />
        </div>
      </div>
      <div style={crossfadeLayerStyles(expanded, expandEase, false)}>
        <LongPressButton
          label={saveLabel}
          confirmAction={confirmAction}
          onLongPress={onSave}
          variant="primary"
          sessionTone={sessionTone}
          progressVariant="water"
          icon={compactIcon}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
