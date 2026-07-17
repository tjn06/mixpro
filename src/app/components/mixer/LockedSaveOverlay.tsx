import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { LongPressButton } from "../shared/LongPressButton";
import { SavedIcon, SaveIcon } from "../shared/ActionIcons";
import {
  crossfadeLayerStyles,
  LOCKED_ACTION_ICON_SIZE,
  PRIMARY_BORDER,
} from "../shared/lockedActionCrossfade";
import { localRect, saveCoverTargetRect, type Rect } from "../shared/lockedOverlayMeasure";

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

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      if (!isLocked) return;
      const next = measure();
      if (next) apply(next, true);
    }) : null;

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
    saveFlash || useCommitIcon ? (
      <SavedIcon size={LOCKED_ACTION_ICON_SIZE} />
    ) : (
      <SaveIcon size={LOCKED_ACTION_ICON_SIZE} />
    );
  const compactIcon =
    saveFlash || useCommitIcon ? <SavedIcon /> : <SaveIcon />;
  const expanded = overlay.expanded;

  return (
    <div style={shellStyle}>
      <div style={crossfadeLayerStyles(expanded, expandEase, true)}>
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
          className="w-full h-full"
        />
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
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
