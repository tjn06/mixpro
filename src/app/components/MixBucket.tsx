import React, { useId, useMemo, useRef, useState, useEffect } from "react";
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
} from "../bucketTypes";
import {
  DEFAULT_SAND_BULK_DENSITY,
  estimateMixVolume,
  type SandType,
} from "../mixVolume";

export {
  DEFAULT_BUCKET_SELECTION,
  DEFAULT_BUCKET_SIZE,
  type BucketSelection,
  type BucketSize,
} from "../bucketTypes";
export const DEFAULT_BUCKET_CAPACITY_LITERS = DEFAULT_BUCKET_SIZE;

const FILL_COLOR = "#9090b8";
const FILL_COLOR_MUTED = "#686880";
const OUTLINE_COLOR = "rgba(255,255,255,0.32)";
const LABEL_COLOR = "#8888a8";
const VALUE_COLOR = "#c4c4dc";
const VALUE_COLOR_MUTED = "#9898b4";
const TITLE_COLOR = "#c0c0e0";
const TITLE_COLOR_MUTED = "#9898b4";
const FULL_BUCKET_COLOR = "#f59e0b";
const FULL_BUCKET_COLOR_MUTED = "#b88848";
const BUCKET_CARD_BG = "transparent";
const BUCKET_CARD_BORDER = "rgba(255,255,255,0.14)";
const DROPDOWN_MENU_BG = "#3a3a4c";
const DROPDOWN_MENU_BORDER = "rgba(255,255,255,0.1)";
const DROPDOWN_MENU_TEXT = "#b8b8d0";
const DROPDOWN_MENU_TEXT_MUTED = "#686878";
const DROPDOWN_MENU_ACTIVE_BG = "rgba(255,255,255,0.07)";

const FILL_LABEL = "Est. fill";
const BUCKET_SIZE_LABEL = "Bucket size";
/** When no bucket (∞ L), bucket + fill readout fade — bucket size control stays full strength. */
const NO_BUCKET_OPACITY = 0.38;
const NO_BUCKET_LABEL_OPACITY = 0.45;

const FIELD_LABEL_STYLE: React.CSSProperties = {
  fontSize: 8,
  letterSpacing: "0.2em",
  fontWeight: 600,
  color: LABEL_COLOR,
  lineHeight: 1,
};

function FillReadout({
  hasBucket,
  displayPercent,
  bucketFull,
  muted,
  faded,
}: {
  hasBucket: boolean;
  displayPercent: number | undefined;
  bucketFull: boolean;
  muted: boolean;
  faded: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-1 shrink-0 tabular-nums transition-opacity duration-200"
      style={{ opacity: faded ? NO_BUCKET_LABEL_OPACITY : 1 }}
    >
      <span className="uppercase whitespace-nowrap" style={FIELD_LABEL_STYLE}>
        {FILL_LABEL}
      </span>
      <span
        className="whitespace-nowrap"
        style={{
          fontSize: bucketFull ? 13 : 20,
          fontWeight: 600,
          color: bucketFull
            ? muted
              ? FULL_BUCKET_COLOR_MUTED
              : FULL_BUCKET_COLOR
            : muted
              ? VALUE_COLOR_MUTED
              : VALUE_COLOR,
          letterSpacing: bucketFull ? "0.14em" : undefined,
          lineHeight: 1.1,
        }}
      >
        {hasBucket && displayPercent != null ? (
          bucketFull ? (
            "FULL"
          ) : (
            <>
              {displayPercent}
              <span style={{ fontSize: 12, fontWeight: 500, color: LABEL_COLOR, marginLeft: 1 }}>%</span>
            </>
          )
        ) : (
          <>
            -
            <span style={{ fontSize: 12, fontWeight: 500, color: LABEL_COLOR, marginLeft: 2 }}>%</span>
          </>
        )}
      </span>
    </div>
  );
}

function BucketSizeControl({
  bucketSelection,
  onBucketChange,
  fillLiters,
  disabled,
  muted,
}: {
  bucketSelection: BucketSelection;
  onBucketChange?: (selection: BucketSelection) => void;
  fillLiters: number;
  disabled: boolean;
  muted: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="uppercase whitespace-nowrap" style={FIELD_LABEL_STYLE}>
        {BUCKET_SIZE_LABEL}
      </span>
      {onBucketChange ? (
        <BucketSelectDropdown
          value={bucketSelection}
          onChange={onBucketChange}
          estimatedLiters={fillLiters}
          disabled={disabled}
          muted={muted}
        />
      ) : (
        <span
          className="block whitespace-nowrap"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 17,
            fontWeight: 600,
            color: muted ? TITLE_COLOR_MUTED : TITLE_COLOR,
            letterSpacing: "0.06em",
            lineHeight: 1.1,
          }}
        >
          {bucketSelectionLabel(bucketSelection)}
        </span>
      )}
    </div>
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

/** Match original framing — bucket size on screen, strokes via strokeWidthPx(). */
const VIEW = { x: 82, y: 112, w: 828, h: 708 };
const SVG_W = 76;
const SVG_H = Math.round(SVG_W * (VIEW.h / VIEW.w));

/** Desired stroke thickness on screen (CSS px) → viewBox user units. */
function strokeWidthPx(px: number): number {
  return px * (VIEW.w / SVG_W);
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
  let hi = H;
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
  muted,
}: {
  clipId: string;
  fillY: number;
  fillRx: number;
  fillRatio: number;
  muted: boolean;
}) {
  const fillColor = muted ? FILL_COLOR_MUTED : FILL_COLOR;
  const showFill = fillRatio > 0.008;

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      fill="none"
      aria-hidden
      className="shrink-0"
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
            opacity={muted ? 0.38 : 0.55}
          />
        )}
      </g>

      <path
        d={BODY_PATH}
        fill="rgba(255,255,255,0.02)"
        stroke={OUTLINE_COLOR}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth={strokeWidthPx(STROKE_PX.body)}
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

function BucketSelectDropdown({
  value,
  onChange,
  estimatedLiters,
  disabled = false,
  muted = false,
}: {
  value: BucketSelection;
  onChange: (selection: BucketSelection) => void;
  estimatedLiters: number;
  disabled?: boolean;
  muted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const options: BucketSelection[] = [...BUCKET_SIZES, "none"];

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="inline-flex items-center gap-1 min-w-0 touch-manipulation transition-colors duration-150"
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 17,
          fontWeight: 600,
          color: muted ? TITLE_COLOR_MUTED : TITLE_COLOR,
          letterSpacing: "0.06em",
          lineHeight: 1,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.45 : 1,
          background: "transparent",
          border: "none",
          padding: "0 2px 0 0",
        }}
      >
        <span className="truncate">{bucketSelectionLabel(value)}</span>
        <ChevronDown open={open} />
      </button>

      {open && !disabled && (
        <ul
          role="listbox"
          aria-label="Bucket size"
          className="absolute left-0 top-full z-20 mt-1.5 min-w-full rounded-xl overflow-hidden shadow-lg"
          style={{
            background: DROPDOWN_MENU_BG,
            border: `1px solid ${DROPDOWN_MENU_BORDER}`,
            boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
          }}
        >
          {options.map((option) => {
            const isSize = option !== "none";
            const tooSmall = isSize && !bucketFits(option as BucketSize, estimatedLiters);
            const active = value === option;
            return (
              <li key={String(option)} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={tooSmall}
                  title={tooSmall ? `Mix exceeds ${option} L safe fill (86%)` : undefined}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className="w-full text-left touch-manipulation transition-colors duration-100"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 15,
                    fontWeight: active ? 600 : 500,
                    letterSpacing: "0.04em",
                    color: tooSmall ? DROPDOWN_MENU_TEXT_MUTED : DROPDOWN_MENU_TEXT,
                    background: active ? DROPDOWN_MENU_ACTIVE_BG : "transparent",
                    padding: "10px 14px",
                    cursor: tooSmall ? "default" : "pointer",
                    opacity: tooSmall ? 0.45 : 1,
                  }}
                >
                  {bucketSelectionLabel(option, "menu")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export interface MixBucketProps {
  epoxyGrams: number;
  sandGrams: number;
  bucketSelection?: BucketSelection;
  onBucketChange?: (selection: BucketSelection) => void;
  sandType?: SandType;
  sandBulkDensity?: number;
  muted?: boolean;
  disabled?: boolean;
}

export function MixBucket({
  epoxyGrams,
  sandGrams,
  bucketSelection = DEFAULT_BUCKET_SELECTION,
  onBucketChange,
  sandType = "medium",
  sandBulkDensity = DEFAULT_SAND_BULK_DENSITY,
  muted = false,
  disabled = false,
}: MixBucketProps) {
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
    <div
      className="w-full min-w-0 rounded-xl select-none"
      style={{
        border: `1.5px solid ${BUCKET_CARD_BORDER}`,
        background: BUCKET_CARD_BG,
        padding: "12px 16px",
        opacity: muted ? 0.88 : 1,
        transition: "opacity 0.2s ease",
      }}
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between gap-5 min-w-0">
        <BucketSizeControl
          bucketSelection={bucketSelection}
          onBucketChange={onBucketChange}
          fillLiters={fillLiters}
          disabled={disabled}
          muted={muted}
        />

        <div
          className="pointer-events-none shrink-0 transition-opacity duration-200"
          style={{ opacity: noBucket ? NO_BUCKET_OPACITY : 1 }}
        >
          <BucketSvg
            clipId={clipId}
            fillY={fillY}
            fillRx={fillRx}
            fillRatio={hasBucket ? fillRatio : 0}
            muted={muted}
          />
        </div>

        <FillReadout
          hasBucket={hasBucket}
          displayPercent={displayPercent}
          bucketFull={bucketFull}
          muted={muted}
          faded={noBucket}
        />
      </div>
    </div>
  );
}
