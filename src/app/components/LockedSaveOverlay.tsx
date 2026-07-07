import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { LongPressButton } from "./LongPressButton";
import { SavedIcon, SaveIcon } from "./ActionIcons";

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Element position in the anchor's local layout space.
 * Corrects for the mobile-shell `transform: scale()` on the app canvas —
 * raw getBoundingClientRect deltas are in screen px and cause a jump if used
 * as absolute top/left inside the scaled container.
 */
function localRect(el: HTMLElement, anchor: HTMLElement): Rect {
  const scale = anchor.offsetWidth > 0
    ? anchor.getBoundingClientRect().width / anchor.offsetWidth
    : 1;
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const elR = el.getBoundingClientRect();
  const ancR = anchor.getBoundingClientRect();
  return {
    top: (elR.top - ancR.top) / s,
    left: (elR.left - ancR.left) / s,
    width: elR.width / s,
    height: elR.height / s,
  };
}

/** Full edit-row width, action-block height only (matches swipe / unlock row below). */
function coverTargetRect(actions: Rect, anchorWidth: number): Rect {
  return {
    top: actions.top,
    left: 0,
    width: anchorWidth,
    height: actions.height,
  };
}

const PRIMARY_BORDER = "1.5px solid rgba(255,255,255,0.12)";
/** Save / lock icons scale up in locked expanded overlays. */
export const LOCKED_ACTION_ICON_SIZE = 24;

type OverlayState = {
  show: boolean;
  expanded: boolean;
  rect: Rect;
  collapsed: Rect;
};

export interface LockedSaveOverlayProps {
  isLocked: boolean;
  /** `position: relative` row wrapping bucket + rec. batch panel. */
  anchorRef: RefObject<HTMLElement | null>;
  bucketRef: RefObject<HTMLElement | null>;
  actionsBlockRef: RefObject<HTMLElement | null>;
  saveButtonRef: RefObject<HTMLButtonElement | null>;
  onSave: () => void;
  saveFlash?: boolean;
  expandMs: number;
  expandEase: string;
  zIndex: number;
  surfaceBg: string;
}

export function LockedSaveOverlay({
  isLocked,
  anchorRef,
  bucketRef,
  actionsBlockRef,
  saveButtonRef,
  onSave,
  saveFlash = false,
  expandMs,
  expandEase,
  zIndex,
  surfaceBg,
}: LockedSaveOverlayProps) {
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }

    const anchor = anchorRef.current;
    const bucket = bucketRef.current;
    const actions = actionsBlockRef.current;
    const save = saveButtonRef.current;
    if (!anchor || !bucket || !actions || !save) return;

    const collapsed = localRect(save, anchor);
    const expanded = coverTargetRect(localRect(actions, anchor), anchor.offsetWidth);

    if (isLocked) {
      setOverlay({ show: true, expanded: false, rect: collapsed, collapsed });
      let innerId = 0;
      const outerId = requestAnimationFrame(() => {
        innerId = requestAnimationFrame(() => {
          setOverlay({ show: true, expanded: true, rect: expanded, collapsed });
        });
      });
      return () => {
        cancelAnimationFrame(outerId);
        if (innerId) cancelAnimationFrame(innerId);
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
    };
  }, [isLocked, anchorRef, bucketRef, actionsBlockRef, saveButtonRef, expandMs]);

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

  return (
    <div style={shellStyle}>
      <LongPressButton
        label={saveFlash ? "Saved" : "Save mix"}
        confirmAction="SAVE MIX"
        onLongPress={onSave}
        variant="primary"
        icon={saveFlash ? <SavedIcon size={LOCKED_ACTION_ICON_SIZE} /> : <SaveIcon size={LOCKED_ACTION_ICON_SIZE} />}
        className="w-full h-full"
        style={{ background: "transparent", border: "none", minHeight: 0 }}
      />
    </div>
  );
}
