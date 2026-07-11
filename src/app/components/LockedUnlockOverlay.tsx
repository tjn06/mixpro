import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { LongPressButton } from "./LongPressButton";
import { LockIcon } from "./RecBatchPanel";
import {
  crossfadeLayerStyles,
  LOCKED_ACTION_ICON_SIZE,
  PRIMARY_BORDER,
  TRANSPARENT_BTN,
} from "./lockedActionCrossfade";
import { localRect, unlockExpandedRect, type Rect } from "./lockedOverlayMeasure";

type OverlayState = {
  show: boolean;
  expanded: boolean;
  rect: Rect;
  collapsed: Rect;
};

export interface LockedUnlockOverlayProps {
  isLocked: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  lockButtonRef: RefObject<HTMLButtonElement | null>;
  onUnlock: () => void;
  expandMs: number;
  expandEase: string;
  zIndex: number;
  surfaceBg: string;
  expandedTop: number;
  expandedHeight: number;
  onOverlayActiveChange?: (active: boolean) => void;
}

export function LockedUnlockOverlay({
  isLocked,
  anchorRef,
  lockButtonRef,
  onUnlock,
  expandMs,
  expandEase,
  zIndex,
  surfaceBg,
  expandedTop,
  expandedHeight,
  onOverlayActiveChange,
}: LockedUnlockOverlayProps) {
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onOverlayActiveChange?.(overlay?.show ?? false);
  }, [overlay?.show, onOverlayActiveChange]);

  useLayoutEffect(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }

    const measure = () => {
      const anchor = anchorRef.current;
      const lock = lockButtonRef.current;
      if (!anchor || !lock) return null;

      const collapsed = localRect(lock, anchor);
      const expanded = unlockExpandedRect(
        anchor.offsetWidth,
        expandedTop,
        expandedHeight,
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

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      if (!isLocked) return;
      const next = measure();
      if (next) apply(next, true);
    }) : null;

    const observe = (el: HTMLElement | null) => {
      if (el && ro) ro.observe(el);
    };
    observe(anchorRef.current);
    observe(lockButtonRef.current);

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
  }, [isLocked, anchorRef, lockButtonRef, expandMs, expandedTop, expandedHeight]);

  if (!overlay?.show) return null;

  const transition = `top ${expandMs}ms ${expandEase}, left ${expandMs}ms ${expandEase}, width ${expandMs}ms ${expandEase}, height ${expandMs}ms ${expandEase}, border-color ${expandMs}ms ${expandEase}`;

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
    background: surfaceBg,
    border: overlay.expanded ? PRIMARY_BORDER : "1.5px solid transparent",
  };

  const expanded = overlay.expanded;

  return (
    <div style={shellStyle}>
      <div style={crossfadeLayerStyles(expanded, expandEase, true)}>
        <LongPressButton
          label="Unlock"
          description="Hold to edit mix again"
          confirmAction="UNLOCK"
          onLongPress={onUnlock}
          variant="primary"
          stacked
          labelSize={11}
          descriptionSize={10}
          icon={<LockIcon locked size={LOCKED_ACTION_ICON_SIZE} />}
          className="w-full h-full"
          style={TRANSPARENT_BTN}
        />
      </div>
      <div style={{ ...crossfadeLayerStyles(expanded, expandEase, false), pointerEvents: "none" }}>
        <LongPressButton
          label="Lock screen"
          confirmAction="LOCK SCREEN"
          onLongPress={() => {}}
          variant="primary"
          icon={<LockIcon locked={false} />}
          className="w-full h-full"
          style={TRANSPARENT_BTN}
        />
      </div>
    </div>
  );
}
