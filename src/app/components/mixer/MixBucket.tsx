import React, { useId, useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback, forwardRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { BucketFillAssessment } from "../../domain/bucket/assess";
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
import type { VolumeConfidence } from "../../domain/material-volume/types";
import { LongPressProgress, useLongPress } from "../shared/LongPressButton";
import {
  DEFAULT_SAND_BULK_DENSITY,
  estimateMixVolume,
  type MixVolumeEstimate,
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
import {
  frustumChordPath,
  sampleWaveSurface,
  wavedFillPath,
  waveBandScale,
  waveSurfacePolyline,
} from "../../presentation/bucketWave";
import { FeatureReadoutStack } from "./FeatureReadoutStack";
import { cv, themeColorVar } from "../../ui/tokens";

const dd = {
  menuText: themeColorVar("dropdownMenuText"),
  menuLockedLabel: themeColorVar("dropdownMenuLockedLabel"),
  menuBackground: themeColorVar("dropdownMenuBg"),
  menuActiveBackground: cv.surface.input,
  inputSurface: themeColorVar("inputSurface"),
  menuBorder: cv.border.input,
  menuShadow: cv.sheetPanel.shadow,
};

export {
  DEFAULT_BUCKET_SELECTION,
  DEFAULT_BUCKET_SIZE,
  type BucketSelection,
  type BucketSize,
} from "../../domain/bucket/types";
export const DEFAULT_BUCKET_CAPACITY_LITERS = DEFAULT_BUCKET_SIZE;

/** Menu wide enough for size label + ⇣ FORCE FIT on locked rows. */
const DROPDOWN_MENU_MIN_W = 200;

function bucketSelectionLabel(selection: BucketSelection, context: "trigger" | "menu" = "trigger"): string {
  if (selection === "none") return context === "menu" ? "∞" : "∞ L";
  return `${selection} L`;
}

function BucketFeaturePanel({
  clipId,
  fillY,
  fillRx,
  fillRatio,
  fillRatioLow,
  fillRatioHigh,
  safeFillRatio,
  initialPotentialRatio,
  confidence,
  showGradualCue,
  showWave,
  bucketFull,
  approaching,
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
  fillRatioLow: number;
  fillRatioHigh: number;
  safeFillRatio: number;
  initialPotentialRatio: number;
  confidence: VolumeConfidence | undefined;
  showGradualCue: boolean;
  showWave: boolean;
  bucketFull: boolean;
  approaching: boolean;
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
  const { t } = useTranslation("common");
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
        <FeatureReadoutStack label={t("mixer.bucket.size")} muted={muted}>
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
        className="pointer-events-none shrink-0 w-full flex items-center justify-center bucket-svg-slot"
        style={{ marginTop: "var(--feature-content-gap)" }}
      >
        <BucketSvg
          clipId={clipId}
          fillY={fillY}
          fillRx={fillRx}
          fillRatio={fillRatio}
          fillRatioLow={fillRatioLow}
          fillRatioHigh={fillRatioHigh}
          safeFillRatio={safeFillRatio}
          initialPotentialRatio={initialPotentialRatio}
          confidence={confidence}
          showGradualCue={showGradualCue}
          showWave={showWave}
          bucketFull={bucketFull}
          approaching={approaching}
          muted={muted}
          infinite={noBucket}
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

/** Near-cylinder bucket — almost straight walls so fill % matches height visually. */
const BUCKET = {
  centerX: 500,
  topY: 180,
  bottomY: 780,
  /** Slight taper only (was 620→540); keeps silhouette from looking conical. */
  widthTop: 560,
  widthBottom: 548,
  wallLeftTopX: 220,
  wallRightTopX: 780,
  wallLeftBottomX: 226,
  wallRightBottomX: 774,
  topEllipseRy: 28,
  bottomEllipseRy: 26,
  /** Matching diameters → nearly linear volume↔height. */
  dTopCm: 28,
  dBotCm: 27.4,
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

/**
 * Map fill percent → SVG height.
 * Near-cylinder: height fraction ≈ volume fraction (linear).
 * SafeFill therefore sits at the configured fraction of wall height.
 */
function fillGeometryFromPercent(fillPercent: number): {
  fillY: number;
  fillRx: number;
} {
  const { topY, bottomY, widthTop, widthBottom } = BUCKET;
  const hPx = bottomY - topY;
  const clamped = Math.min(100, Math.max(0, fillPercent));

  if (clamped <= 0) {
    return { fillY: bottomY, fillRx: widthBottom / 2 };
  }

  const heightFraction = clamped / 100;
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

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  return reduced;
}

/** Slow phase drift for uncertainty wave — not fluid slosh. */
function useWavePhase(active: boolean): number {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active || reduced) {
      setPhase(0);
      return;
    }
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      acc += dt;
      // ~12 Hz React updates; phase advances for ~14s cycle.
      if (acc >= 1 / 12) {
        setPhase((p) => p + acc * ((Math.PI * 2) / 14));
        acc = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reduced]);
  return phase;
}

function BucketSvg({
  clipId,
  fillY,
  fillRx,
  fillRatio,
  fillRatioLow = fillRatio,
  fillRatioHigh = fillRatio,
  safeFillRatio = RECOMMENDED_MAX_FILL_PERCENT / 100,
  initialPotentialRatio = 0,
  confidence,
  showGradualCue = false,
  showWave = false,
  bucketFull,
  approaching = false,
  muted,
  infinite = false,
}: {
  clipId: string;
  fillY: number;
  fillRx: number;
  fillRatio: number;
  fillRatioLow?: number;
  fillRatioHigh?: number;
  safeFillRatio?: number;
  initialPotentialRatio?: number;
  confidence?: VolumeConfidence;
  showGradualCue?: boolean;
  showWave?: boolean;
  bucketFull: boolean;
  approaching?: boolean;
  muted: boolean;
  infinite?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [renderW, setRenderW] = useState(95);
  const phase = useWavePhase(showWave && !infinite && !muted && fillRatio > 0.008);

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

  const lowGeom = fillGeometryFromPercent(Math.round(fillRatioLow * 100));
  const highGeom = fillGeometryFromPercent(Math.round(fillRatioHigh * 100));
  const safeGeom = fillGeometryFromPercent(Math.round(safeFillRatio * 100));
  const potGeom = fillGeometryFromPercent(
    Math.round(Math.min(1, initialPotentialRatio) * 100),
  );

  const bandHalf = Math.max(0, (lowGeom.fillY - highGeom.fillY) / 2);
  const ampScale = waveBandScale(confidence);
  // Tiny residual wave even for tight bands (pure epoxy).
  const amplitudePx = showWave
    ? Math.max(3.5, bandHalf * ampScale + (confidence === "HIGH" ? 2 : 5))
    : 0;

  const leftX = BUCKET.centerX - fillRx;
  const rightX = BUCKET.centerX + fillRx;
  const surface = showWave
    ? sampleWaveSurface({
        leftX,
        rightX,
        centerY: fillY,
        amplitudePx,
        phaseRad: phase,
      })
    : [];
  const fillPath = showWave && surface.length > 1
    ? wavedFillPath({
        wallLeftBottomX: BUCKET.wallLeftBottomX,
        wallRightBottomX: BUCKET.wallRightBottomX,
        bottomY: BUCKET.bottomY,
        surface,
      })
    : flatFillPath(fillY, fillRx);
  const surfaceStroke = showWave ? waveSurfacePolyline(surface) : "";

  // Uncertainty haze band (low→high) as a soft rect-like frustum slice.
  const hazeTop = highGeom.fillY;
  const hazeBottom = lowGeom.fillY;
  const hazePath =
    hazeBottom > hazeTop + 2
      ? [
          `M ${BUCKET.centerX - highGeom.fillRx} ${hazeTop}`,
          `L ${BUCKET.centerX + highGeom.fillRx} ${hazeTop}`,
          `L ${BUCKET.centerX + lowGeom.fillRx} ${hazeBottom}`,
          `L ${BUCKET.centerX - lowGeom.fillRx} ${hazeBottom}`,
          "Z",
        ].join(" ")
      : "";

  const fillColor = bucketFull
    ? muted
      ? themeColorVar("bucketFillFullMuted")
      : themeColorVar("bucketFillFull")
    : muted
      ? themeColorVar("fillMuted")
      : approaching
        ? themeColorVar("bucketFillFull")
        : themeColorVar("fill");
  const showFill = !infinite && fillRatio > 0.008;
  const bodyStroke = strokeWidthPx(STROKE_PX.body, renderW);
  const outlineColor = themeColorVar("fillOutline");
  const dashLen = strokeWidthPx(5, renderW);
  const gapLen = strokeWidthPx(4, renderW);
  const infinityY = (BUCKET.topY + BUCKET.bottomY) / 2 + 16;
  const fillOpacity = muted
    ? 0.38
    : bucketFull
      ? 0.62
      : approaching
        ? 0.58
        : 0.55;

  const showSafeLine = !infinite && safeFillRatio > 0.05;
  const showPotential =
    showGradualCue &&
    !infinite &&
    initialPotentialRatio > fillRatio + 0.02;

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

      {/* Empty bucket body under fill */}
      <path
        d={BODY_PATH}
        fill={infinite ? "transparent" : themeColorVar("fillEmpty")}
        stroke="none"
      />

      <g clipPath={`url(#${clipId})`}>
        {/* Headroom / SafeFill zone tint above the limit line */}
        {showSafeLine ? (
          <path
            d={[
              `M ${BUCKET.centerX - safeGeom.fillRx} ${safeGeom.fillY}`,
              `L ${BUCKET.centerX + safeGeom.fillRx} ${safeGeom.fillY}`,
              `L ${BUCKET.wallRightTopX} ${BUCKET.topY}`,
              `L ${BUCKET.wallLeftTopX} ${BUCKET.topY}`,
              "Z",
            ].join(" ")}
            fill={outlineColor}
            opacity={muted ? 0.04 : 0.07}
          />
        ) : null}

        {/* Gradual-add ghost: initial loose potential above expected */}
        {showPotential ? (
          <path
            d={flatFillPath(potGeom.fillY, potGeom.fillRx)}
            fill={fillColor}
            opacity={muted ? 0.08 : 0.14}
          />
        ) : null}

        {/* Uncertainty haze between low and high */}
        {showWave && hazePath && showFill ? (
          <path
            d={hazePath}
            fill={fillColor}
            opacity={muted ? 0.1 : 0.18}
          />
        ) : null}

        {showFill && (
          <path d={fillPath} fill={fillColor} opacity={fillOpacity} />
        )}

        {showFill && showWave && surfaceStroke ? (
          <path
            d={surfaceStroke}
            stroke={outlineColor}
            strokeWidth={strokeWidthPx(1.1, renderW)}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={muted ? 0.28 : 0.45}
          />
        ) : null}

        {showPotential ? (
          <path
            d={frustumChordPath(
              BUCKET.centerX,
              potGeom.fillY,
              potGeom.fillRx,
            )}
            stroke={outlineColor}
            strokeWidth={strokeWidthPx(1, renderW)}
            strokeDasharray={`${dashLen * 0.7} ${gapLen * 0.85}`}
            strokeLinecap="round"
            opacity={muted ? 0.28 : 0.42}
          />
        ) : null}

        {showSafeLine ? (
          <path
            d={frustumChordPath(
              BUCKET.centerX,
              safeGeom.fillY,
              safeGeom.fillRx,
            )}
            stroke={
              bucketFull || approaching
                ? themeColorVar("bucketFillFull")
                : outlineColor
            }
            strokeWidth={strokeWidthPx(1.25, renderW)}
            strokeDasharray={`${dashLen} ${gapLen}`}
            strokeLinecap="round"
            opacity={muted ? 0.35 : bucketFull || approaching ? 0.72 : 0.5}
          />
        ) : null}
      </g>

      <path
        d={BODY_PATH}
        fill="none"
        stroke={outlineColor}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeWidth={bodyStroke}
        strokeDasharray={infinite ? `${dashLen} ${gapLen}` : undefined}
        strokeOpacity={infinite ? (muted ? 0.52 : 0.68) : 1}
      />

      {infinite ? (
        <text
          x={BUCKET.centerX}
          y={infinityY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={outlineColor}
          fillOpacity={muted ? 0.74 : 0.94}
          fontSize={152}
          fontFamily="'Outfit', sans-serif"
          fontWeight={600}
        >
          ∞
        </text>
      ) : null}
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
  const { t } = useTranslation("common");
  const { progress, holding, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
    useLongPress(onForceFit, !locked, {
      confirmAction: t("mixer.bucket.forceFitConfirm", { size }),
    });

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      aria-label={
        locked
          ? t("mixer.forceFitAria", { size })
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
            color: holding ? cv.text.primary : dd.menuText,
            flexShrink: 0,
            transition: "color 0.15s ease",
          }}
        >
          {t("mixer.bucket.forceFit")}
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
  const { t } = useTranslation("common");
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
        aria-label={t("mixer.bucket.size")}
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
  const noBucket = bucketSelection === "none";
  const capacity: BucketSize = noBucket ? DEFAULT_BUCKET_SIZE : bucketSelection;
  const liters = noBucket ? 0 : fillLiters;
  const fillPercent = displayFillPercent(liters, capacity);
  const fillRatio = noBucket ? 0 : fillRatioForDisplay(liters, capacity);
  const { fillY, fillRx } = fillGeometryFromPercent(fillPercent);
  const bucketFull =
    !noBucket && isBucketAtMaxFill(liters, bucketSelection);

  return (
    <div className={className.trim()} aria-hidden>
      <BucketSvg
        clipId={clipId}
        fillY={fillY}
        fillRx={fillRx}
        fillRatio={fillRatio}
        bucketFull={bucketFull}
        muted={muted}
        infinite={noBucket}
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
  /** Authoritative volume from MaterialVolumeModel (preferred). */
  volumeOverride?: MixVolumeEstimate;
  /** Phase 2 fill assessment — geometry + SafeFill state (preferred over volumeOverride). */
  fillAssessment?: BucketFillAssessment;
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
    volumeOverride,
    fillAssessment,
    muted = false,
    disabled = false,
    readoutRef,
  },
  ref,
) {
  const { t } = useTranslation("common");
  const clipId = useId();
  const hasBucket = bucketSelection !== "none";
  const capacityLiters = hasBucket ? bucketSelection : null;

  const volume = useMemo(
    () =>
      fillAssessment?.legacy ??
      volumeOverride ??
      estimateMixVolume({
        epoxyGrams,
        sandGrams,
        sandType,
        sandBulkDensity,
      }),
    [
      fillAssessment,
      volumeOverride,
      epoxyGrams,
      sandGrams,
      sandType,
      sandBulkDensity,
    ],
  );

  const fillLiters = volume.estimatedLiters;
  const safeFillPercent = fillAssessment
    ? Math.round(fillAssessment.safety.safeFillFraction * 100)
    : RECOMMENDED_MAX_FILL_PERCENT;
  const displayPercent =
    fillAssessment && hasBucket
      ? fillAssessment.displayFillPercent
      : capacityLiters != null
        ? displayFillPercent(fillLiters, capacityLiters, safeFillPercent)
        : undefined;
  const bucketFull =
    fillAssessment && hasBucket
      ? fillAssessment.bucketFull
      : capacityLiters != null &&
        isBucketAtMaxFill(
          fillLiters,
          capacityLiters,
          safeFillPercent / 100,
        );
  const fillRatio =
    fillAssessment && hasBucket
      ? fillAssessment.displayFillRatio
      : capacityLiters != null
        ? fillRatioForDisplay(fillLiters, capacityLiters, safeFillPercent / 100)
        : 0;
  const safetyState = fillAssessment?.fillSafetyState ?? "COMFORTABLE";
  const approaching =
    safetyState === "APPROACHING_LIMIT" ||
    safetyState === "GRADUAL_AGGREGATE_ADDITION_RECOMMENDED";
  const showGradualCue =
    safetyState === "GRADUAL_AGGREGATE_ADDITION_RECOMMENDED";
  const fillRatioLow =
    fillAssessment && hasBucket
      ? fillAssessment.displayFillRatioLow
      : fillRatio;
  const fillRatioHigh =
    fillAssessment && hasBucket
      ? fillAssessment.displayFillRatioHigh
      : fillRatio;
  const safeFillRatio =
    fillAssessment && hasBucket
      ? fillAssessment.safeFillDisplayRatio
      : safeFillPercent / 100;
  const initialPotentialRatio =
    fillAssessment && hasBucket
      ? fillAssessment.initialPotentialDisplayRatio
      : 0;
  const confidence = fillAssessment?.volume.confidence;
  const showWave = Boolean(fillAssessment && hasBucket);
  const svgFillPercent = Math.round(fillRatio * 100);
  const { fillY, fillRx } = fillGeometryFromPercent(svgFillPercent);

  const ariaLabel =
    capacityLiters != null
      ? bucketFull
        ? t("mixer.bucket.fullAria", {
            percent: safeFillPercent,
            size: capacityLiters,
          })
        : t("mixer.bucket.fillAria", {
            percent: displayPercent,
            size: capacityLiters,
          })
      : t("mixer.bucket.infinite");

  const noBucket = !hasBucket;

  return (
    <BucketFeaturePanel
      panelRef={ref}
      clipId={clipId}
      fillY={fillY}
      fillRx={fillRx}
      fillRatio={hasBucket ? fillRatio : 0}
      fillRatioLow={hasBucket ? fillRatioLow : 0}
      fillRatioHigh={hasBucket ? fillRatioHigh : 0}
      safeFillRatio={hasBucket ? safeFillRatio : 0}
      initialPotentialRatio={hasBucket ? initialPotentialRatio : 0}
      confidence={confidence}
      showGradualCue={showGradualCue}
      showWave={showWave}
      bucketFull={bucketFull}
      approaching={approaching}
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
