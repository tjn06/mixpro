import React, { useId, useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback, forwardRef } from "react";
import { createPortal } from "react-dom";
import {
  BUCKET_SIZES,
  bucketFits,
  DEFAULT_BUCKET_SELECTION,
  DEFAULT_BUCKET_SIZE,
  displayFillPercent,
  fillRatioForDisplay,
  isBucketAtMaxFill,
  RECOMMENDED_MAX_FILL_PERCENT,
  type BucketSelection,
  type BucketSize,
} from "../../domain/bucket/types";
import { LongPressProgress, useLongPress, LongPressButton } from "../shared/LongPressButton";
import {
  DEFAULT_SAND_BULK_DENSITY,
  estimateMixVolume,
  type SandType,
} from "../../domain/mix/volume";
import {
  FEATURE_PANEL_BG,
  FEATURE_PANEL_BORDER,
  FEATURE_VALUE_COLOR,
  FEATURE_VALUE_COLOR_MUTED,
  FEATURE_VALUE_FONT,
  FEATURE_VALUE_TEXT_CLASS,
  BUCKET_VALUE_STYLE,
} from "../../presentation/featureReadout";
import { FeatureReadoutStack } from "./FeatureReadoutStack";
import { themeColorVar } from "../../../theme/cssVars";
import { componentTokens } from "../../ui/tokens";

const dd = componentTokens.dropdown;

export {
  DEFAULT_BUCKET_SELECTION,
  DEFAULT_BUCKET_SIZE,
  type BucketSelection,
  type BucketSize,
} from "../../domain/bucket/types";
export const DEFAULT_BUCKET_CAPACITY_LITERS = DEFAULT_BUCKET_SIZE;

/** Menu wide enough for size label + ⇣ FORCE FIT on locked rows. */
const DROPDOWN_MENU_MIN_W = 200;

const BUCKET_SIZE_LABEL = "Bucket size";
const NO_BUCKET_OPACITY = 0.38;

function BucketFeaturePanel({
  clipId,
  fillY,
  fillRx,
  fillRatio,
  bucketFull,
  bucketSelection,
  onBucketChange,
  onForceBucketChange,
  fillLiters,
  noBucket,
  disabled,
  muted,
  ariaLabel,
  panelRef,
  readoutRef,
}: {
  clipId: string;
  fillY: number;
  fillRx: number;
  fillRatio: number;
  bucketFull: boolean;
  bucketSelection: BucketSelection;
  onBucketChange?: (selection: BucketSelection) => void;
  onForceBucketChange?: (size: BucketSize) => void;
  fillLiters: number;
  noBucket: boolean;
  disabled: boolean;
  muted: boolean;
  ariaLabel: string;
  panelRef?: React.Ref<HTMLDivElement>;
  readoutRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={panelRef}
      className="w-full min-w-0 self-start select-none rounded-xl flex flex-col items-center overflow-hidden"
      aria-label={ariaLabel}
      style={{
        padding: "var(--feature-panel-pt) 0 var(--feature-panel-pb)",
        background: FEATURE_PANEL_BG,
        border: FEATURE_PANEL_BORDER,
        opacity: muted ? 0.88 : 1,
        transition: "opacity 0.2s ease, border-color 0.2s ease",
        boxSizing: "border-box",
      }}
    >
      <div
        ref={readoutRef}
        className="shrink-0 w-full"
        style={disabled ? { position: "relative", zIndex: 8 } : undefined}
      >
        <FeatureReadoutStack label={BUCKET_SIZE_LABEL} muted={muted}>
          <BucketSizeValue
            bucketSelection={bucketSelection}
            onBucketChange={onBucketChange}
            onForceBucketChange={onForceBucketChange}
            fillLiters={fillLiters}
            disabled={disabled}
            muted={muted}
          />
        </FeatureReadoutStack>
      </div>
      <div
        className="pointer-events-none transition-opacity duration-200 shrink-0 w-full flex items-center justify-center bucket-svg-slot"
        style={{
          opacity: noBucket ? NO_BUCKET_OPACITY : 1,
          marginTop: "var(--feature-content-gap)",
        }}
      >
        <BucketSvg
          clipId={clipId}
          fillY={fillY}
          fillRx={fillRx}
          fillRatio={fillRatio}
          bucketFull={bucketFull}
          muted={muted}
        />
      </div>
    </div>
  );
}

function BucketSizeValue({
  bucketSelection,
  onBucketChange,
  onForceBucketChange,
  fillLiters,
  disabled,
  muted,
}: {
  bucketSelection: BucketSelection;
  onBucketChange?: (selection: BucketSelection) => void;
  onForceBucketChange?: (size: BucketSize) => void;
  fillLiters: number;
  disabled: boolean;
  muted: boolean;
}) {
  if (onBucketChange) {
    return (
      <BucketSelectDropdown
        value={bucketSelection}
        onChange={onBucketChange}
        onForceChange={onForceBucketChange}
        estimatedLiters={fillLiters}
        disabled={disabled}
        muted={muted}
      />
    );
  }
  return (
    <span
      className={FEATURE_VALUE_TEXT_CLASS}
      style={{
        ...FEATURE_VALUE_FONT,
        color: muted ? FEATURE_VALUE_COLOR_MUTED : FEATURE_VALUE_COLOR,
      }}
    >
      {bucketSelectionLabel(bucketSelection)}
    </span>
  );
}

/** Geometry from Smart Pack frustum model (1000×1000 SVG space). */
const BUCKET = {
  centerX: 500,
  topY: 180,
  bottomY: 780,
  widthTop: 620,
  widthBottom: 540,
  wallLeftTopX: 190,
  wallRightTopX: 810,
  wallLeftBottomX: 230,
  wallRightBottomX: 770,
  topEllipseRy: 35,
  bottomEllipseRy: 24,
  dTopCm: 31,
  dBotCm: 27,
  heightCm: 33,
} as const;

/** Crop tight to bucket body — minimal headroom so rim aligns with label row. */
const VIEW = { x: 82, y: 172, w: 828, h: 628 };

/** Desired stroke thickness on screen (CSS px) → viewBox user units. */
function strokeWidthPx(px: number, renderWidth: number): number {
  return px * (VIEW.w / Math.max(renderWidth, 1));
}

const STROKE_PX = {
  body: 1.75,
} as const;

const BODY_PATH = [
  `M ${BUCKET.wallLeftTopX} ${BUCKET.topY}`,
  `L ${BUCKET.wallRightTopX} ${BUCKET.topY}`,
  `L ${BUCKET.wallRightBottomX} ${BUCKET.bottomY}`,
  `L ${BUCKET.wallLeftBottomX} ${BUCKET.bottomY}`,
  "Z",
].join(" ");

function volumeAtHeight(h: number): number {
  const { dTopCm: dTop, dBotCm: dBot, heightCm: H } = BUCKET;
  const d = dBot + ((dTop - dBot) * h) / H;
  return (Math.PI * h) / 12 * (dBot * dBot + dBot * d + d * d);
}

function fillGeometryFromPercent(fillPercent: number): {
  fillY: number;
  fillRx: number;
} {
  const { topY, bottomY, widthTop, widthBottom, heightCm: H } = BUCKET;
  const hPx = bottomY - topY;
  const clamped = Math.min(100, Math.max(0, fillPercent));

  if (clamped <= 0) {
    return { fillY: bottomY, fillRx: widthBottom / 2 };
  }

  const total = volumeAtHeight(H);
  const target = total * (clamped / 100);

  let lo = 0;
  let hi: number = H;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (volumeAtHeight(mid) < target) lo = mid;
    else hi = mid;
  }

  const h = (lo + hi) / 2;
  const heightFraction = h / H;
  const fillY = bottomY - heightFraction * hPx;
  const fillWidth = widthBottom + (widthTop - widthBottom) * heightFraction;

  return { fillY, fillRx: fillWidth / 2 };
}

function flatFillPath(fillY: number, fillRx: number): string {
  const { centerX, wallLeftBottomX, wallRightBottomX, bottomY } = BUCKET;
  const left = centerX - fillRx;
  const right = centerX + fillRx;
  return [
    `M ${wallLeftBottomX} ${bottomY}`,
    `L ${wallRightBottomX} ${bottomY}`,
    `L ${right} ${fillY}`,
    `L ${left} ${fillY}`,
    "Z",
  ].join(" ");
}

function bucketSelectionLabel(selection: BucketSelection, context: "trigger" | "menu" = "trigger"): string {
  if (selection === "none") return context === "menu" ? "-" : "∞ L";
  return `${selection} L`;
}

function BucketSvg({
  clipId,
  fillY,
  fillRx,
  fillRatio,
  bucketFull,
  muted,
}: {
  clipId: string;
  fillY: number;
  fillRx: number;
  fillRatio: number;
  bucketFull: boolean;
  muted: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [renderW, setRenderW] = useState(95);

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const sync = () => {
      const w = el.clientWidth;
      if (w > 0) setRenderW(w);
    };
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fillColor = bucketFull
    ? muted
      ? themeColorVar("bucketFillFullMuted")
      : themeColorVar("bucketFillFull")
    : muted
      ? themeColorVar("fillMuted")
      : themeColorVar("fill");
  const showFill = fillRatio > 0.008;

  return (
    <svg
      ref={svgRef}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      fill="none"
      aria-hidden
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={BODY_PATH} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {showFill && (
          <path
            d={flatFillPath(fillY, fillRx)}
            fill={fillColor}
            opacity={muted ? 0.38 : bucketFull ? 0.62 : 0.55}
          />
        )}
      </g>

      <path
        d={BODY_PATH}
        fill={themeColorVar("fillEmpty")}
        stroke={themeColorVar("fillOutline")}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth={strokeWidthPx(STROKE_PX.body, renderW)}
      />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{
        flexShrink: 0,
        transition: "transform 150ms ease",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function BucketSelectOptionRow({
  label,
  active,
  locked,
  size,
  onSelect,
  onForceFit,
}: {
  label: string;
  active: boolean;
  locked: boolean;
  size: BucketSize;
  onSelect: () => void;
  onForceFit: () => void;
}) {
  const { progress, holding, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
    useLongPress(onForceFit, !locked, { confirmAction: `FORCE FIT TO ${size} L` });

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      aria-label={
        locked
          ? `Hold to force fit mix to ${size} liter bucket at ${RECOMMENDED_MAX_FILL_PERCENT} percent`
          : undefined
      }
      onClick={() => {
        if (!locked) onSelect();
      }}
      onPointerDown={locked ? onPointerDown : undefined}
      onPointerMove={locked ? onPointerMove : undefined}
      onPointerUp={locked ? onPointerUp : undefined}
      onPointerCancel={locked ? onPointerCancel : undefined}
      className={`relative block w-full text-left touch-manipulation transition-colors duration-100 ${
        locked ? "touch-none" : ""
      }`}
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: "var(--text-ui-md)",
        fontWeight: active ? 600 : 500,
        letterSpacing: "0.04em",
        color: dd.menuText,
        background: locked
          ? holding
            ? dd.inputSurface
            : active
              ? dd.menuActiveBackground
              : "transparent"
          : active
            ? dd.menuActiveBackground
            : "transparent",
        padding: "10px 14px",
        cursor: locked ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        whiteSpace: "nowrap",
      }}
    >
      {locked && <LongPressProgress progress={progress} inset={10} />}
      <span style={{ color: locked ? dd.menuLockedLabel : dd.menuText }}>
        {label}
      </span>
      {locked && (
        <span
          style={{
            fontSize: "var(--text-ui-sm)",
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: holding ? componentTokens.text.primary : dd.menuText,
            flexShrink: 0,
            transition: "color 0.15s ease",
          }}
        >
          ⇣ FORCE FIT
        </span>
      )}
    </button>
  );
}

function BucketSelectDropdown({
  value,
  onChange,
  onForceChange,
  estimatedLiters,
  disabled = false,
  muted = false,
}: {
  value: BucketSelection;
  onChange: (selection: BucketSelection) => void;
  onForceChange?: (size: BucketSize) => void;
  estimatedLiters: number;
  disabled?: boolean;
  muted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const measureMenu = useCallback(() => {
    const trigger = triggerRef.current;
    const canvas = trigger?.closest<HTMLElement>("[data-beam-canvas]");
    if (!trigger || !canvas) return null;
    const tR = trigger.getBoundingClientRect();
    const cR = canvas.getBoundingClientRect();
    return {
      top: tR.bottom - cR.top + 6,
      left: tR.left + tR.width / 2 - cR.left,
      minWidth: Math.max(tR.width, DROPDOWN_MENU_MIN_W),
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuLayout(null);
      setPortal(null);
      return;
    }
    const trigger = triggerRef.current;
    const canvas = trigger?.closest<HTMLElement>("[data-beam-canvas]") ?? null;
    setPortal(canvas);
    const update = () => setMenuLayout(measureMenu());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, measureMenu]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const options: BucketSelection[] = [...BUCKET_SIZES, "none"];

  const menu = open && !disabled && menuLayout && portal ? (
    createPortal(
      <ul
        ref={menuRef}
        role="listbox"
        aria-label="Bucket size"
        className="rounded-xl overflow-hidden shadow-lg"
        style={{
          position: "absolute",
          top: menuLayout.top,
          left: menuLayout.left,
          transform: "translateX(-50%)",
          zIndex: 40,
          width: "max-content",
          minWidth: menuLayout.minWidth,
          maxWidth: 280,
          background: dd.menuBackground,
          border: dd.menuBorder,
          boxShadow: dd.menuShadow,
        }}
      >
        {options.map((option) => {
          const isSize = option !== "none";
          const size = isSize ? (option as BucketSize) : null;
          const tooSmall = size != null && !bucketFits(size, estimatedLiters);
          const locked = tooSmall && onForceChange != null;
          const active = value === option;
          return (
            <li key={String(option)} role="none">
              <BucketSelectOptionRow
                label={bucketSelectionLabel(option, "menu")}
                active={active}
                locked={locked}
                size={size ?? 5}
                onSelect={() => {
                  onChange(option);
                  setOpen(false);
                }}
                onForceFit={() => {
                  if (size == null) return;
                  onForceChange?.(size);
                  setOpen(false);
                }}
              />
            </li>
          );
        })}
      </ul>,
      portal,
    )
  ) : null;

  return (
    <div className="relative w-full min-w-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="w-full inline-flex items-center justify-center gap-0.5 min-w-0 touch-manipulation transition-colors duration-150"
        style={{
          ...BUCKET_VALUE_STYLE,
          color: muted ? FEATURE_VALUE_COLOR_MUTED : FEATURE_VALUE_COLOR,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.45 : 1,
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        <span className="truncate tabular-nums">{bucketSelectionLabel(value)}</span>
        <ChevronDown open={open} />
      </button>
      {menu}
    </div>
  );
}

/** Compact bucket SVG for recipe picker side panel. */
export function BucketMiniature({
  bucketSelection,
  fillLiters,
  muted = false,
  className = "",
}: {
  bucketSelection: BucketSelection;
  fillLiters: number;
  muted?: boolean;
  className?: string;
}) {
  const clipId = useId();
  const capacity: BucketSize =
    bucketSelection === "none" ? DEFAULT_BUCKET_SIZE : bucketSelection;
  const liters = bucketSelection === "none" ? 0 : fillLiters;
  const fillPercent = displayFillPercent(liters, capacity);
  const fillRatio = fillRatioForDisplay(liters, capacity);
  const { fillY, fillRx } = fillGeometryFromPercent(fillPercent);
  const bucketFull =
    bucketSelection !== "none" && isBucketAtMaxFill(liters, bucketSelection);

  return (
    <div className={className.trim()} aria-hidden>
      <BucketSvg
        clipId={clipId}
        fillY={fillY}
        fillRx={fillRx}
        fillRatio={fillRatio}
        bucketFull={bucketFull}
        muted={muted}
      />
    </div>
  );
}

export interface MixBucketProps {
  epoxyGrams: number;
  sandGrams: number;
  bucketSelection?: BucketSelection;
  onBucketChange?: (selection: BucketSelection) => void;
  onForceBucketChange?: (size: BucketSize) => void;
  sandType?: SandType;
  sandBulkDensity?: number;
  muted?: boolean;
  disabled?: boolean;
  readoutRef?: React.Ref<HTMLDivElement>;
}

export const MixBucket = forwardRef<HTMLDivElement, MixBucketProps>(function MixBucket(
  {
    epoxyGrams,
    sandGrams,
    bucketSelection = DEFAULT_BUCKET_SELECTION,
    onBucketChange,
    onForceBucketChange,
    sandType = "medium",
    sandBulkDensity = DEFAULT_SAND_BULK_DENSITY,
    muted = false,
    disabled = false,
    readoutRef,
  },
  ref,
) {
  const clipId = useId();
  const hasBucket = bucketSelection !== "none";
  const capacityLiters = hasBucket ? bucketSelection : null;

  const volume = useMemo(
    () =>
      estimateMixVolume({
        epoxyGrams,
        sandGrams,
        sandType,
        sandBulkDensity,
      }),
    [epoxyGrams, sandGrams, sandType, sandBulkDensity],
  );

  const fillLiters = volume.estimatedLiters;
  const displayPercent =
    capacityLiters != null ? displayFillPercent(fillLiters, capacityLiters) : undefined;
  const bucketFull =
    capacityLiters != null && isBucketAtMaxFill(fillLiters, capacityLiters);
  const fillRatio =
    capacityLiters != null ? fillRatioForDisplay(fillLiters, capacityLiters) : 0;
  const svgFillPercent = Math.round(fillRatio * 100);
  const { fillY, fillRx } = fillGeometryFromPercent(svgFillPercent);

  const ariaLabel =
    capacityLiters != null
      ? bucketFull
        ? `Bucket full at ${RECOMMENDED_MAX_FILL_PERCENT}% of ${capacityLiters} liter bucket`
        : `Estimated ${displayPercent}% fill of ${capacityLiters} liter bucket`
      : "No bucket selected";

  const noBucket = !hasBucket;

  return (
    <BucketFeaturePanel
      panelRef={ref}
      clipId={clipId}
      fillY={fillY}
      fillRx={fillRx}
      fillRatio={hasBucket ? fillRatio : 0}
      bucketFull={bucketFull}
      bucketSelection={bucketSelection}
      onBucketChange={onBucketChange}
      onForceBucketChange={onForceBucketChange}
      fillLiters={fillLiters}
      noBucket={noBucket}
      disabled={disabled}
      muted={muted}
      ariaLabel={ariaLabel}
      readoutRef={readoutRef}
    />
  );
});
