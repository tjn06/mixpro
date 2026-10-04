import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  BUCKET_SIZES,
  type BucketSize,
} from "../../domain/bucket/types";
import {
  estimateRepairHoleVolume,
  estimateRepairSessionTotals,
} from "../../domain/repair/estimate";
import {
  formatRepairAreaMm2,
  formatRepairLiters,
  formatRepairMassGrams,
  formatRepairMetersFromMm,
  formatWorkMarginPercent,
} from "../../domain/repair/format";
import {
  solveMaterialRequirement,
  type MaterialRequirementResult,
} from "../../domain/repair/materialRequirement";
import { analyticPlanAreaMm2, buildOutlineMm } from "../../domain/repair/outline";
import { recommendedDepthPointCount } from "../../domain/repair/depthSamples";
import { computeEdgeInsetMm } from "../../domain/repair/edge";
import {
  materialCalcTargetLiters,
  type RepairCalcBasis,
} from "../../domain/repair/planning";
import {
  buildRepairMaterialShareText,
  calcBasisShareLabel,
  confidenceShareLabel,
} from "../../domain/repair/shareReport";
import type {
  FallAxis,
  MeasurementDetail,
  RepairConfidence,
  RepairHole,
  RepairShapeType,
} from "../../domain/repair/types";
import {
  planRecipeBatches,
  type RecipeBatchPlanResult,
} from "../../domain/mix/batchPlan";
import { getIngredientLabel } from "../../domain/recipe/calc";
import {
  PRESET_RECIPES,
  recipeMenuLabel,
  type BlendingRecipe,
} from "../../domain/recipe/types";
import { useRecipeLibraryStore } from "../../recipe-library/store";
import { useRepairStore } from "../../repair/store";
import { useSettingsStore } from "../../settings/store";
import { cv } from "../../ui/tokens";
import { DestinationPageChrome } from "../pages/DestinationPageChrome";
import { DeleteIcon, ExactDepthIcon, InfoIcon, NextPointIcon, NextStepIcon, SavedIcon } from "../shared/ActionIcons";
import { PickRecipeForMixSheet } from "../sessions/PickRecipeForMixSheet";
import { RepairSelectedHolesSheet } from "../sheets/RepairSelectedHolesSheet";
import { RepairBatchCard } from "./RepairBatchCard";
import { RepairDepthView } from "./RepairDepthView";
import { RepairOutlineEditor } from "./RepairOutlineEditor";
import { RepairPackagingReportView } from "./RepairPackagingReportView";
import { RepairPlanView } from "./RepairPlanView";
import { RepairShareDock } from "./RepairShareDock";
import { RepairSlopeIsoView } from "./RepairSlopeIsoView";
import { RepairSlopeSectionView } from "./RepairSlopeSectionView";
import { RepairVizAccordion } from "./RepairVizAccordion";

type WizardStep = "shape" | "dimensions" | "depth" | "review";

type RepairView =
  | { kind: "overview" }
  | { kind: "wizard"; holeId: string; step: WizardStep; isNew: boolean }
  | { kind: "material" }
  | { kind: "batches" }
  | { kind: "packaging" };
function solveFailureMessage(
  t: (key: string) => string,
  result: Extract<MaterialRequirementResult, { ok: false }>,
): string {
  switch (result.reason) {
    case "UNKNOWN_CUSTOM_VOLUME":
      return t("repair.solveFailedUnknownCustom");
    case "ZERO_VOLUME_RECIPE":
      return t("repair.solveFailedZeroVolume");
    case "INVALID_TARGET":
      return t("repair.solveFailedInvalidTarget");
    default:
      return t("repair.solveFailed");
  }
}
function confidenceLabelKey(c: RepairConfidence): string {
  switch (c) {
    case "HIGH":
      return "repair.confidence.high";
    case "MEDIUM":
      return "repair.confidence.medium";
    case "LOW":
      return "repair.confidence.low";
    case "EXPERIMENTAL":
      return "repair.confidence.experimental";
  }
}

function holePlanAreaMm2(hole: RepairHole): number {
  const outlineMm = buildOutlineMm(
    hole.shapeType,
    hole.dimensions,
    hole.outline,
  );
  return analyticPlanAreaMm2(hole.shapeType, hole.dimensions, outlineMm);
}

function NumberField({
  label,
  value,
  onChange,
  hint,
  unit,
  min = 0,
  allowEmpty = false,
  info,
  infoAriaLabel,
  action,
  badge,
  placeholder,
  hideLabel = false,
  focusKey,
  labelMeta,
  variant = "box",
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  hint?: string;
  unit: string;
  min?: number;
  allowEmpty?: boolean;
  info?: string;
  infoAriaLabel?: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    ariaLabel?: string;
    /** Single chevron + point badge (cycle points; distinct from step Next). */
    nextPointBadge?: string | number;
  };
  /** Numbered disc matching figure markers (e.g. depth point index). */
  badge?: string | number;
  placeholder?: string;
  hideLabel?: boolean;
  /** When this changes, refocus the input for immediate typing. */
  focusKey?: string | number;
  /** Right-aligned label-row meta (e.g. meters conversion). */
  labelMeta?: string;
  /** box = bordered control; underline = single-row label + bare value. */
  variant?: "box" | "underline";
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  /** Local text while focused — avoids the classic “stuck 0” controlled-number trap. */
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusKeySeen = useRef<string | number | undefined>(undefined);

  const formatValue = (n: number | null) =>
    n == null || !Number.isFinite(n) ? "" : String(Math.round(n));

  useLayoutEffect(() => {
    if (focusKey == null) return;
    if (focusKeySeen.current === undefined) {
      focusKeySeen.current = focusKey;
      return;
    }
    if (focusKeySeen.current === focusKey) return;
    focusKeySeen.current = focusKey;
    setDraft(formatValue(value));
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
    // Only re-focus when the point identity changes — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const isUnderline = variant === "underline";
  const shown =
    draft !== null
      ? draft
      : isUnderline && value === 0
        ? ""
        : formatValue(value);

  const inputEl = (
    <input
      ref={inputRef}
      className="repair-field__input"
      type="number"
      inputMode="numeric"
      min={min}
      step={1}
      placeholder={placeholder}
      aria-label={label}
      value={shown}
      onFocus={(e) => {
        setDraft(formatValue(value));
        e.currentTarget.select();
      }}
      onBlur={() => {
        setDraft(null);
        if (
          (value == null || !Number.isFinite(value)) &&
          !allowEmpty
        ) {
          onChange(min);
        }
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        // Empty while typing — don't force 0 back into the field.
        if (raw === "") {
          if (allowEmpty) onChange(null);
          return;
        }
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(Math.max(min, Math.round(n)));
      }}
    />
  );

  const actionEl = action ? (
    <button
      type="button"
      className={`repair-field__action${
        action.nextPointBadge != null
          ? " repair-field__action--next-point"
          : ""
      }`}
      disabled={action.disabled}
      aria-label={action.ariaLabel ?? action.label}
      onClick={() => {
        action.onClick();
      }}
    >
      {action.nextPointBadge != null ? (
        <>
          <NextPointIcon size={18} />
          <span className="repair-field__action-badge" aria-hidden>
            {action.nextPointBadge}
          </span>
        </>
      ) : (
        action.label
      )}
    </button>
  ) : null;

  return (
    <div
      className={`repair-field${hideLabel ? " repair-field--compact" : ""}${
        isUnderline ? " repair-field--underline" : ""
      }`}
    >
      {isUnderline ? (
        <div className="repair-field__underline-row">
          <span className="repair-field__label">{label}</span>
          {info ? (
            <button
              type="button"
              className="repair-field__info"
              aria-label={infoAriaLabel ?? label}
              aria-expanded={infoOpen}
              onClick={() => setInfoOpen((open) => !open)}
            >
              <InfoIcon size={15} />
            </button>
          ) : null}
          <div className="repair-field__underline-control">
            {inputEl}
            <span className="repair-field__unit">{unit}</span>
          </div>
        </div>
      ) : (
        <>
          {!hideLabel ? (
            <div className="repair-field__label-row">
              <span className="repair-field__label">{label}</span>
              {info ? (
                <button
                  type="button"
                  className="repair-field__info"
                  aria-label={infoAriaLabel ?? label}
                  aria-expanded={infoOpen}
                  onClick={() => setInfoOpen((open) => !open)}
                >
                  <InfoIcon size={15} />
                </button>
              ) : null}
              {labelMeta ? (
                <span
                  className="repair-field__label-meta"
                  style={{ color: cv.text.muted }}
                >
                  {labelMeta}
                </span>
              ) : null}
            </div>
          ) : null}
          <div
            className={`repair-field__control${
              action ? " repair-field__control--with-action" : ""
            }${badge != null ? " repair-field__control--badged" : ""}`}
          >
            {badge != null ? (
              <span className="repair-field__badge" aria-hidden>
                {badge}
              </span>
            ) : null}
            {inputEl}
            <span className="repair-field__unit">{unit}</span>
            {actionEl}
          </div>
        </>
      )}
      {info && infoOpen ? (
        <p className="repair-field__info-text" style={{ color: cv.text.muted }}>
          {info}
        </p>
      ) : null}
      {hint ? (
        <span className="repair-field__hint" style={{ color: cv.text.muted }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: { id: T; label: ReactNode; ariaLabel?: string }[];
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={`repair-segmented${className ? ` ${className}` : ""}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          aria-label={opt.ariaLabel}
          className={`repair-segmented__btn${
            value === opt.id ? " is-active" : ""
          }`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

type RepairTotalsInfoKey = RepairCalcBasis | "MARGIN";

function VolumeBasisPicks({
  expectedLiters,
  planningTargetLiters,
  calcBasis,
  onCalcBasisChange,
  infoOpen,
  onInfoOpenChange,
}: {
  expectedLiters: number | null;
  planningTargetLiters: number | null;
  calcBasis: RepairCalcBasis;
  onCalcBasisChange: (basis: RepairCalcBasis) => void;
  infoOpen: RepairTotalsInfoKey | null;
  onInfoOpenChange: (next: RepairTotalsInfoKey | null) => void;
}) {
  const { t } = useTranslation("common");
  const estimatedLabel =
    expectedLiters == null
      ? t("repair.figure.volumePending")
      : formatRepairLiters(expectedLiters);
  const planningLabel =
    planningTargetLiters == null
      ? t("repair.figure.volumePending")
      : formatRepairLiters(planningTargetLiters);
  return (
    <>
      <div
        className={`repair-totals__pick${
          calcBasis === "ESTIMATED" ? " is-active" : ""
        }`}
      >
        <button
          type="button"
          className="repair-totals__pick-main"
          role="radio"
          aria-checked={calcBasis === "ESTIMATED"}
          onClick={() => onCalcBasisChange("ESTIMATED")}
        >
          <span className="repair-totals__pick-label">
            <span
              className={`repair-totals__check${
                calcBasis === "ESTIMATED" ? " is-on" : ""
              }`}
              aria-hidden
            >
              ✓
            </span>
            {t("repair.estimatedVolume")}
          </span>
          <span className="repair-totals__value">{estimatedLabel}</span>
        </button>
        <button
          type="button"
          className="repair-field__info"
          aria-label={t("repair.aboutEstimatedVolume")}
          aria-expanded={infoOpen === "ESTIMATED"}
          onClick={() =>
            onInfoOpenChange(infoOpen === "ESTIMATED" ? null : "ESTIMATED")
          }
        >
          <InfoIcon size={15} />
        </button>
      </div>
      {infoOpen === "ESTIMATED" ? (
        <p
          className="repair-field__info-text"
          style={{ color: cv.text.muted }}
        >
          {t("repair.estimatedVolumeInfo")}
        </p>
      ) : null}

      <div
        className={`repair-totals__pick${
          calcBasis === "PLANNING" ? " is-active" : ""
        }`}
      >
        <button
          type="button"
          className="repair-totals__pick-main"
          role="radio"
          aria-checked={calcBasis === "PLANNING"}
          onClick={() => onCalcBasisChange("PLANNING")}
        >
          <span className="repair-totals__pick-label">
            <span
              className={`repair-totals__check${
                calcBasis === "PLANNING" ? " is-on" : ""
              }`}
              aria-hidden
            >
              ✓
            </span>
            {t("repair.planningVolume")}
          </span>
          <span className="repair-totals__value">{planningLabel}</span>
        </button>
        <button
          type="button"
          className="repair-field__info"
          aria-label={t("repair.aboutPlanningVolume")}
          aria-expanded={infoOpen === "PLANNING"}
          onClick={() =>
            onInfoOpenChange(infoOpen === "PLANNING" ? null : "PLANNING")
          }
        >
          <InfoIcon size={15} />
        </button>
      </div>
      {infoOpen === "PLANNING" ? (
        <p
          className="repair-field__info-text"
          style={{ color: cv.text.muted }}
        >
          {t("repair.planningVolumeInfo")}
        </p>
      ) : null}
    </>
  );
}

function WorkMarginTotalsRow({
  fraction,
  infoOpen,
  onInfoOpenChange,
}: {
  fraction: number;
  infoOpen: boolean;
  onInfoOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("common");
  return (
    <>
      <div className="repair-totals__pick">
        <div className="repair-totals__pick-main repair-totals__pick-main--static">
          <span className="repair-totals__pick-label">
            {t("repair.workMargin")}
          </span>
          <span className="repair-totals__value">
            {formatWorkMarginPercent(fraction)}
          </span>
        </div>
        <button
          type="button"
          className="repair-field__info"
          aria-label={t("repair.aboutWorkMargin")}
          aria-expanded={infoOpen}
          onClick={() => onInfoOpenChange(!infoOpen)}
        >
          <InfoIcon size={15} />
        </button>
      </div>
      {infoOpen ? (
        <p
          className="repair-field__info-text"
          style={{ color: cv.text.muted }}
        >
          {t("repair.workMarginInfo")}
        </p>
      ) : null}
    </>
  );
}

function HoleCard({
  hole,
  index,
  selected,
  onToggleSelect,
  onOpen,
  onDelete,
}: {
  hole: RepairHole;
  index: number;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("common");
  const est = useMemo(() => estimateRepairHoleVolume(hole), [hole]);
  const areaMm2 = useMemo(() => holePlanAreaMm2(hole), [hole]);
  const title = hole.name || t("repair.holeN", { n: index + 1 });

  return (
    <li className={`repair-hole-card${selected ? " is-selected" : ""}`}>
      <button
        type="button"
        className={`repair-hole-card__select${selected ? " is-checked" : ""}`}
        aria-pressed={selected}
        aria-label={t("repair.selectHole", { name: title })}
        onClick={onToggleSelect}
      >
        <span className="repair-hole-card__check" aria-hidden>
          {selected ? <SavedIcon size={14} /> : null}
        </span>
      </button>

      <button type="button" className="repair-hole-card__main" onClick={onOpen}>
        <div className="repair-hole-card__thumb">
          <RepairPlanView hole={hole} compact showDepthMarkers />
        </div>
        <div className="repair-hole-card__meta">
          <span className="repair-hole-card__title">{title}</span>
          <span className="repair-hole-card__volume">
            {est ? (
              <>
                {formatRepairLiters(est.expectedLiters)}
                <span className="repair-hole-card__confidence">
                  {t(confidenceLabelKey(est.confidence))}
                </span>
              </>
            ) : (
              <span className="repair-hole-card__needs-depth">
                {t("repair.needsDepth")}
              </span>
            )}
          </span>
          <span className="repair-hole-card__area">
            {formatRepairAreaMm2(areaMm2)}
          </span>
        </div>
      </button>

      <button
        type="button"
        className="repair-hole-card__delete"
        aria-label={t("common.delete")}
        onClick={onDelete}
      >
        <DeleteIcon size={16} />
      </button>
    </li>
  );
}

function WizardChrome({
  title,
  stepLabel,
  onMenuClick,
  onBack,
  children,
  footer,
}: {
  title: string;
  stepLabel: string;
  onMenuClick: () => void;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <DestinationPageChrome
      title={title}
      subline={stepLabel}
      onMenuClick={onMenuClick}
      onBack={onBack}
      backImmediate
      embedded
      footer={
        footer ? <div className="repair-wizard-dock">{footer}</div> : undefined
      }
    >
      {children}
    </DestinationPageChrome>
  );
}

/** Repair Hole — overview + guided geometry wizard (Phase E–F). */
export function RepairPage({
  onMenuClick,
  embedded = false,
}: {
  onMenuClick: () => void;
  embedded?: boolean;
}) {
  const { t } = useTranslation("common");
  const session = useRepairStore((s) => s.session);
  const addHole = useRepairStore((s) => s.addHole);
  const removeHole = useRepairStore((s) => s.removeHole);
  const setHoleShape = useRepairStore((s) => s.setHoleShape);
  const setHoleDimensions = useRepairStore((s) => s.setHoleDimensions);
  const setHoleOutline = useRepairStore((s) => s.setHoleOutline);
  const setHoleMeasurementDetail = useRepairStore(
    (s) => s.setHoleMeasurementDetail,
  );
  const setHoleSlopeEnabled = useRepairStore((s) => s.setHoleSlopeEnabled);
  const setHoleFallAxis = useRepairStore((s) => s.setHoleFallAxis);
  const setHoleEdgeProfile = useRepairStore((s) => s.setHoleEdgeProfile);
  const setHoleEdgeInsetMm = useRepairStore((s) => s.setHoleEdgeInsetMm);
  const setDepthValue = useRepairStore((s) => s.setDepthValue);
  const moveDepthSample = useRepairStore((s) => s.moveDepthSample);
  const setWorkMarginFraction = useRepairStore((s) => s.setWorkMarginFraction);
  const setRecipeId = useRepairStore((s) => s.setRecipeId);
  const setBucketSize = useRepairStore((s) => s.setBucketSize);

  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const outlineHelperOn = useSettingsStore(
    (s) => s.helperAnimations.outlineEdit,
  );
  const userRecipes = useRecipeLibraryStore((s) => s.userRecipes) ?? [];
  const libraryRecipes = useMemo(
    () => [...PRESET_RECIPES, ...userRecipes],
    [userRecipes],
  );

  const [view, setView] = useState<RepairView>({ kind: "overview" });
  const [selectedDepthId, setSelectedDepthId] = useState<string | null>(null);
  const [slopeInfoOpen, setSlopeInfoOpen] = useState(false);
  const [depthPointsInfoOpen, setDepthPointsInfoOpen] = useState(false);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [holesSheetOpen, setHolesSheetOpen] = useState(false);
  const [materialResult, setMaterialResult] =
    useState<MaterialRequirementResult | null>(null);
  const [batchPlan, setBatchPlan] = useState<RecipeBatchPlanResult | null>(
    null,
  );
  /** Prefer recipe Rec. batch sizing — off by default (SafeFill-max batches). */
  const [useRecBatches, setUseRecBatches] = useState(false);
  /** PLANNING = upper×margin (default); ESTIMATED = expected×margin (exact). */
  const [calcBasis, setCalcBasis] = useState<RepairCalcBasis>("PLANNING");
  const [volumeInfoOpen, setVolumeInfoOpen] = useState<
    RepairTotalsInfoKey | null
  >(null);
  /** null = all holes selected (default); otherwise explicit inclusion set. */
  const [selectedHoleIds, setSelectedHoleIds] = useState<string[] | null>(null);
  const [sharePanelExpanded, setSharePanelExpanded] = useState(false);
  const [packagingReportText, setPackagingReportText] = useState("");

  const holeIdsKey = session.holes.map((h) => h.id).join("|");

  useEffect(() => {
    setSharePanelExpanded(false);
    if (view.kind !== "packaging") setPackagingReportText("");
  }, [view.kind]);

  useEffect(() => {
    setSelectedHoleIds((prev) => {
      if (prev == null) return null;
      const currentIds = session.holes.map((h) => h.id);
      const currentSet = new Set(currentIds);
      const prevSet = new Set(prev);
      const kept = prev.filter((id) => currentSet.has(id));
      const added = currentIds.filter((id) => !prevSet.has(id));
      return [...kept, ...added];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync on hole id set only
  }, [holeIdsKey]);

  const includedHoles = useMemo(() => {
    if (selectedHoleIds == null) return session.holes;
    const selected = new Set(selectedHoleIds);
    return session.holes.filter((h) => selected.has(h.id));
  }, [session.holes, selectedHoleIds]);

  const includedHoleEntries = useMemo(
    () =>
      session.holes
        .map((hole, index) => ({ hole, index }))
        .filter(({ hole }) => includedHoles.some((h) => h.id === hole.id)),
    [session.holes, includedHoles],
  );

  const isHoleSelected = (holeId: string) =>
    selectedHoleIds == null || selectedHoleIds.includes(holeId);

  const toggleHoleSelected = (holeId: string) => {
    setSelectedHoleIds((prev) => {
      const allIds = session.holes.map((h) => h.id);
      const current = new Set(prev ?? allIds);
      if (current.has(holeId)) current.delete(holeId);
      else current.add(holeId);
      return allIds.filter((id) => current.has(id));
    });
  };

  const totals = useMemo(
    () =>
      includedHoles.length === 0
        ? null
        : estimateRepairSessionTotals(
            {
              holes: includedHoles,
              workMarginFraction: session.workMarginFraction,
            },
            { skipIncomplete: true },
          ),
    [includedHoles, session.workMarginFraction],
  );

  /** Material calc needs depth on every selected hole — partial display totals are not enough. */
  const selectionDepthComplete = useMemo(
    () =>
      includedHoles.length > 0 &&
      includedHoles.every((hole) => estimateRepairHoleVolume(hole) != null),
    [includedHoles],
  );

  const selectedAreaMm2 = useMemo(
    () => includedHoles.reduce((sum, hole) => sum + holePlanAreaMm2(hole), 0),
    [includedHoles],
  );

  const materialTargetLiters = useMemo(() => {
    if (!totals || !selectionDepthComplete) return null;
    return materialCalcTargetLiters({
      expectedLiters: totals.expectedLiters,
      upperLiters: totals.upperLiters,
      workMarginFraction: session.workMarginFraction,
      basis: calcBasis,
    });
  }, [totals, selectionDepthComplete, session.workMarginFraction, calcBasis]);

  const selectedRecipe = useMemo(() => {
    if (!session.recipeId) return null;
    return libraryRecipes.find((r) => r.id === session.recipeId) ?? null;
  }, [libraryRecipes, session.recipeId]);

  const runSolve = (
    recipe: BlendingRecipe,
    planningTargetLiters?: number,
  ) => {
    const target = planningTargetLiters ?? materialTargetLiters;
    if (target == null || !(target > 0)) {
      setMaterialResult({ ok: false, reason: "INVALID_TARGET" });
      setBatchPlan(null);
      return;
    }
    const result = solveMaterialRequirement({
      recipe,
      planningTargetLiters: target,
    });
    setMaterialResult(result);
    setBatchPlan(null);
  };

  const runBatchPlan = (
    recipe: BlendingRecipe,
    values: number[],
    bucket: BucketSize = session.bucketSize ?? 17,
    preferRecBatch: boolean = useRecBatches,
  ) => {
    const plan = planRecipeBatches({
      recipe,
      requiredValues: values,
      bucket,
      preferRecBatch,
    });
    setBatchPlan(plan);
    return plan;
  };

  // Re-solve when material target changes (margin, basis, selected holes).
  useEffect(() => {
    if (view.kind !== "material" || !selectedRecipe || materialTargetLiters == null)
      return;
    runSolve(selectedRecipe, materialTargetLiters);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional target-driven re-solve
  }, [view.kind, selectedRecipe?.id, materialTargetLiters]);

  // Re-plan batches when bucket or Rec. batch preference changes.
  useEffect(() => {
    if (view.kind !== "batches") return;
    if (!selectedRecipe || !materialResult?.ok) return;
    runBatchPlan(
      selectedRecipe,
      materialResult.values,
      session.bucketSize ?? 17,
      useRecBatches,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind, session.bucketSize, selectedRecipe?.id, materialResult, useRecBatches]);

  const wizardHole =
    view.kind === "wizard"
      ? session.holes.find((h) => h.id === view.holeId) ?? null
      : null;

  useEffect(() => {
    if (view.kind === "wizard" && !wizardHole) {
      setView({ kind: "overview" });
    }
  }, [view.kind, wizardHole]);

  const startAddHole = () => {
    const hole = addHole();
    setSelectedDepthId(null);
    setView({ kind: "wizard", holeId: hole.id, step: "shape", isNew: true });
  };

  const openHole = (holeId: string) => {
    setSelectedDepthId(null);
    setView({ kind: "wizard", holeId, step: "review", isNew: false });
  };

  const leaveWizard = (holeId: string, isNew: boolean) => {
    if (isNew) {
      const hole = session.holes.find((h) => h.id === holeId);
      const hasDepth = hole?.depthSamples.some((s) => s.depthMm != null);
      if (!hasDepth) removeHole(holeId);
    }
    setView({ kind: "overview" });
  };

  // ---------- Overview ----------
  if (view.kind === "overview") {
    const hasHoles = session.holes.length > 0;
    return (
      <DestinationPageChrome
        title={t("repair.title")}
        onMenuClick={onMenuClick}
        embedded={embedded}
        footer={
          hasHoles ? (
            <div className="repair-wizard-dock">
              <button
                type="button"
                className="destination-page__primary-btn"
                disabled={
                  !selectionDepthComplete || includedHoles.length === 0
                }
                onClick={() => {
                  if (selectedRecipe) {
                    runSolve(selectedRecipe);
                    setView({ kind: "material" });
                    return;
                  }
                  setRecipePickerOpen(true);
                }}
              >
                {t("repair.calculateMaterial")}
              </button>
            </div>
          ) : undefined
        }
      >
        {!hasHoles ? (
          <>
            <p className="destination-page__lede" style={{ color: cv.text.muted }}>
              {t("repair.emptyLede")}
            </p>
            <button
              type="button"
              className="text-btn repair-add-hole-btn"
              onClick={startAddHole}
            >
              <span className="batch-totals-add-extra-btn__icon" aria-hidden>
                +
              </span>
              {t("repair.addHole")}
            </button>
          </>
        ) : (
          <>
            <div className="repair-totals">
              <div className="repair-totals__row">
                <span>
                  {t("repair.selectedHolesCount", {
                    selected: includedHoles.length,
                    total: session.holes.length,
                  })}
                </span>
              </div>
              <div className="repair-totals__row">
                <span>{t("repair.totalArea")}</span>
                <strong>
                  {includedHoles.length === 0
                    ? t("repair.figure.volumePending")
                    : formatRepairAreaMm2(selectedAreaMm2)}
                </strong>
              </div>
              <div
                className="repair-totals__basis"
                role="radiogroup"
                aria-label={t("repair.calculateMaterial")}
              >
                <VolumeBasisPicks
                  expectedLiters={totals?.expectedLiters ?? null}
                  planningTargetLiters={
                    totals?.planning.planningTargetLiters ?? null
                  }
                  calcBasis={calcBasis}
                  onCalcBasisChange={setCalcBasis}
                  infoOpen={volumeInfoOpen}
                  onInfoOpenChange={setVolumeInfoOpen}
                />
                <WorkMarginTotalsRow
                  fraction={session.workMarginFraction}
                  infoOpen={volumeInfoOpen === "MARGIN"}
                  onInfoOpenChange={(open) =>
                    setVolumeInfoOpen(open ? "MARGIN" : null)
                  }
                />
              </div>
            </div>

            <ul className="repair-hole-list">
              {session.holes.map((hole, i) => (
                <HoleCard
                  key={hole.id}
                  hole={hole}
                  index={i}
                  selected={isHoleSelected(hole.id)}
                  onToggleSelect={() => toggleHoleSelected(hole.id)}
                  onOpen={() => openHole(hole.id)}
                  onDelete={() => {
                    if (
                      !window.confirm(
                        t("repair.confirmDeleteHole", {
                          name: hole.name || t("repair.holeN", { n: i + 1 }),
                        }),
                      )
                    )
                      return;
                    removeHole(hole.id);
                  }}
                />
              ))}
            </ul>

            <button
              type="button"
              className="text-btn repair-add-hole-btn"
              onClick={startAddHole}
            >
              <span className="batch-totals-add-extra-btn__icon" aria-hidden>
                +
              </span>
              {t("repair.addHole")}
            </button>

            <PickRecipeForMixSheet
              open={recipePickerOpen}
              onOpenChange={setRecipePickerOpen}
              libraryRecipes={libraryRecipes}
              title={t("repair.pickRecipeTitle")}
              openLabelFor={(recipe) =>
                t("repair.pickRecipeAction", {
                  name: recipeMenuLabel(recipe, uiLanguage),
                })
              }
              onPick={(recipe) => {
                setRecipeId(recipe.id);
                runSolve(recipe);
                setView({ kind: "material" });
              }}
            />
          </>
        )}
      </DestinationPageChrome>
    );
  }

  // ---------- Material requirement ----------
  if (view.kind === "material") {
    const recipe = selectedRecipe;
    const ok = materialResult?.ok === true ? materialResult : null;
    const fail =
      materialResult && !materialResult.ok ? materialResult : null;

    const materialReportText =
      ok && recipe
        ? buildRepairMaterialShareText({
            labels: {
              title: t("repair.materialReportTitle"),
              recipeLabel: t("repair.recipeLabel"),
              areaLabel: t("repair.totalArea"),
              marginLabel: t("repair.workMargin"),
              basisLabel: t("repair.calcTarget"),
              volumeLabel: t("repair.materialRequired"),
              rangeLabel: t("repair.materialRange"),
              componentsHeading: t("repair.componentMasses"),
              totalMassLabel: t("repair.totalMass"),
            },
            recipeName: recipeMenuLabel(recipe, uiLanguage),
            selectedHolesLabel: t("repair.selectedHolesCount", {
              selected: includedHoles.length,
              total: session.holes.length,
            }),
            totalAreaMm2: selectedAreaMm2,
            workMarginFraction: session.workMarginFraction,
            calcBasisLabel: calcBasisShareLabel(calcBasis, {
              planning: t("repair.planningVolume"),
              estimated: t("repair.estimatedVolume"),
            }),
            volumeLiters: ok.material.expectedRestVolumeL,
            rangeLowLiters: ok.material.restVolumeLowL,
            rangeHighLiters: ok.material.restVolumeHighL,
            confidenceLabel: confidenceShareLabel(
              ok.material.confidence,
              t,
            ),
            components: ok.components
              .filter((c) => c.id !== "TOTAL")
              .map((c) => ({
                label:
                  getIngredientLabel(recipe, c.id, uiLanguage) ?? c.id,
                grams: c.grams,
              })),
            totalGrams:
              ok.components.find((c) => c.id === "TOTAL")?.grams ??
              ok.values[0] ??
              0,
          })
        : "";

    return (
      <>
        <DestinationPageChrome
          title={t("repair.title")}
          subline={t("repair.materialRequired")}
          onMenuClick={onMenuClick}
          onBack={() => setView({ kind: "overview" })}
          backImmediate
          embedded={embedded}
          bottomSheet={
            ok ? (
              <RepairShareDock
                panelId="repair-material-share-panel"
                summaryLabel={t("repair.materialRequired")}
                summaryValue={formatRepairLiters(
                  ok.material.expectedRestVolumeL,
                )}
                reportTitle={t("repair.materialReportTitle")}
                reportText={materialReportText}
                canShare={Boolean(materialReportText)}
                sourceExpanded={sharePanelExpanded}
                onSourceExpandedChange={setSharePanelExpanded}
                remeasureKey={`${ok.material.expectedRestVolumeL}:${calcBasis}:${session.workMarginFraction}:${includedHoles.length}`}
              />
            ) : undefined
          }
        >
          <div className="repair-totals">
            <div className="repair-totals__row">
              <span>
                {t("repair.selectedHolesCount", {
                  selected: includedHoles.length,
                  total: session.holes.length,
                })}
              </span>
            </div>
            <div className="repair-totals__row">
              <span>{t("repair.totalArea")}</span>
              <strong>
                {includedHoles.length === 0
                  ? t("repair.figure.volumePending")
                  : formatRepairAreaMm2(selectedAreaMm2)}
              </strong>
            </div>
            <div
              className="repair-totals__basis"
              role="radiogroup"
              aria-label={t("repair.calculateMaterial")}
            >
              <VolumeBasisPicks
                expectedLiters={totals?.expectedLiters ?? null}
                planningTargetLiters={
                  totals?.planning.planningTargetLiters ?? null
                }
                calcBasis={calcBasis}
                onCalcBasisChange={setCalcBasis}
                infoOpen={volumeInfoOpen}
                onInfoOpenChange={setVolumeInfoOpen}
              />
              <WorkMarginTotalsRow
                fraction={session.workMarginFraction}
                infoOpen={volumeInfoOpen === "MARGIN"}
                onInfoOpenChange={(open) =>
                  setVolumeInfoOpen(open ? "MARGIN" : null)
                }
              />
            </div>
          </div>

          <ul className="repair-included-hole-list">
            {includedHoleEntries.map(({ hole, index }) => {
              const est = estimateRepairHoleVolume(hole);
              const title = hole.name || t("repair.holeN", { n: index + 1 });
              const areaLabel = formatRepairAreaMm2(holePlanAreaMm2(hole));
              return (
                <li key={hole.id} className="repair-included-hole-list__row">
                  <span className="repair-included-hole-list__name">{title}</span>
                  <span className="repair-included-hole-list__meta">
                    <span className="repair-included-hole-list__area">
                      {areaLabel}
                    </span>
                    <span className="repair-included-hole-list__volume">
                      {est
                        ? formatRepairLiters(est.expectedLiters)
                        : t("repair.needsDepth")}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className="repair-chip-btn"
            onClick={() => setHolesSheetOpen(true)}
          >
            {t("repair.viewSelectedHoles")}
          </button>

          <NumberField
            label={t("repair.workMarginPercent")}
            unit="%"
            min={0}
            value={Math.round(session.workMarginFraction * 100)}
            onChange={(n) => {
              if (n == null) return;
              setWorkMarginFraction(Math.max(0, Math.min(100, n)) / 100);
            }}
            info={t("repair.workMarginInfo")}
            infoAriaLabel={t("repair.aboutWorkMargin")}
          />

          <div className="repair-totals">
            <div className="repair-totals__row">
              <span>{t("repair.recipeLabel")}</span>
              <strong>
                {recipe
                  ? recipeMenuLabel(recipe, uiLanguage)
                  : "—"}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="repair-chip-btn"
            onClick={() => setRecipePickerOpen(true)}
          >
            {t("repair.changeRecipe")}
          </button>

          {fail ? (
            <p
              className="destination-page__lede"
              style={{ color: cv.text.muted }}
            >
              {solveFailureMessage(t, fail)}
            </p>
          ) : null}

          {ok && recipe ? (
            <>
              <div className="repair-totals">
                <div className="repair-totals__row repair-totals__row--strong">
                  <span>{t("repair.materialRequired")}</span>
                  <strong>
                    {formatRepairLiters(ok.material.expectedRestVolumeL)}
                  </strong>
                </div>
                <div className="repair-totals__row">
                  <span>{t("repair.materialRange")}</span>
                  <span>
                    {formatRepairLiters(ok.material.restVolumeLowL)} –{" "}
                    {formatRepairLiters(ok.material.restVolumeHighL)}
                  </span>
                </div>
                <div
                  className="repair-totals__row"
                  style={{ color: cv.text.muted }}
                >
                  <span>{t(confidenceLabelKey(ok.material.confidence))}</span>
                </div>
              </div>

              <div className="repair-component-list">
                <p className="repair-field__label">{t("repair.componentMasses")}</p>
                <ul>
                  {ok.components
                    .filter((c) => c.id !== "TOTAL")
                    .map((c) => (
                      <li key={c.id} className="repair-totals__row">
                        <span>
                          {getIngredientLabel(recipe, c.id, uiLanguage) ?? c.id}
                        </span>
                        <strong>{formatRepairMassGrams(c.grams)}</strong>
                      </li>
                    ))}
                  <li className="repair-totals__row repair-totals__row--strong">
                    <span>{t("repair.totalMass")}</span>
                    <strong>
                      {formatRepairMassGrams(
                        ok.components.find((c) => c.id === "TOTAL")?.grams ??
                          ok.values[0] ??
                          0,
                      )}
                    </strong>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className="destination-page__primary-btn destination-page__primary-btn--form"
                onClick={() => {
                  if (!recipe || !ok) return;
                  runBatchPlan(recipe, ok.values);
                  setView({ kind: "batches" });
                }}
              >
                {t("repair.planBatches")}
              </button>

              <button
                type="button"
                className="repair-chip-btn"
                onClick={() => setView({ kind: "packaging" })}
              >
                {t("repair.packaging.open")}
              </button>
            </>
          ) : null}
        </DestinationPageChrome>

        <PickRecipeForMixSheet
          open={recipePickerOpen}
          onOpenChange={setRecipePickerOpen}
          libraryRecipes={libraryRecipes}
          title={t("repair.pickRecipeTitle")}
          openLabelFor={(r) =>
            t("repair.pickRecipeAction", {
              name: recipeMenuLabel(r, uiLanguage),
            })
          }
          onPick={(picked) => {
            setRecipeId(picked.id);
            runSolve(picked);
          }}
        />

        <RepairSelectedHolesSheet
          open={holesSheetOpen}
          onOpenChange={setHolesSheetOpen}
          holes={includedHoleEntries}
        />
      </>
    );
  }

  // ---------- Package buy report ----------
  if (view.kind === "packaging") {
    const recipe = selectedRecipe;
    const ok = materialResult?.ok === true ? materialResult : null;
    if (!recipe || !ok) {
      return (
        <DestinationPageChrome
          title={t("repair.title")}
          subline={t("repair.packaging.title")}
          onMenuClick={onMenuClick}
          onBack={() => setView({ kind: "material" })}
          backImmediate
          embedded={embedded}
        >
          <p className="destination-page__lede" style={{ color: cv.text.muted }}>
            {t("repair.packaging.needMaterialFirst")}
          </p>
        </DestinationPageChrome>
      );
    }
    return (
      <DestinationPageChrome
        title={t("repair.title")}
        subline={t("repair.packaging.title")}
        onMenuClick={onMenuClick}
        onBack={() => setView({ kind: "material" })}
        backImmediate
        embedded={embedded}
        bottomSheet={
          <RepairShareDock
            panelId="repair-packaging-share-panel"
            summaryLabel={t("repair.packaging.title")}
            summaryValue={formatRepairMassGrams(ok.values[0] ?? 0)}
            reportTitle={t("repair.packaging.reportTitle")}
            reportText={packagingReportText}
            canShare={packagingReportText.trim().length > 0}
            sourceExpanded={sharePanelExpanded}
            onSourceExpandedChange={setSharePanelExpanded}
            remeasureKey={packagingReportText}
          />
        }
      >
        <RepairPackagingReportView
          recipe={recipe}
          values={ok.values}
          onReportTextChange={setPackagingReportText}
        />
      </DestinationPageChrome>
    );
  }

  // ---------- Mixing batches ----------
  if (view.kind === "batches") {
    const recipe = selectedRecipe;
    const okPlan = batchPlan?.ok === true ? batchPlan : null;
    const failPlan = batchPlan && !batchPlan.ok ? batchPlan : null;

    const failMessage = failPlan
      ? failPlan.reason === "ZERO_SAFE_BATCH"
        ? t("repair.batchPlanFailedZero")
        : failPlan.reason === "TOO_MANY_BATCHES"
          ? t("repair.batchPlanFailedTooMany")
          : t("repair.batchPlanFailed")
      : null;

    return (
      <DestinationPageChrome
        title={t("repair.title")}
        subline={t("repair.batchesTitle")}
        onMenuClick={onMenuClick}
        onBack={() => setView({ kind: "material" })}
        backImmediate
        embedded={embedded}
      >
        <label className="repair-field">
          <span className="repair-field__label">{t("repair.bucketSize")}</span>
          <div className="repair-segmented" role="radiogroup">
            {BUCKET_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={(session.bucketSize ?? 17) === size}
                className={`repair-segmented__btn${
                  (session.bucketSize ?? 17) === size ? " is-active" : ""
                }`}
                onClick={() => setBucketSize(size)}
              >
                {t("mixer.bucket.liters", { size })}
              </button>
            ))}
          </div>
        </label>

        <div className="repair-field">
          <div className="repair-switch-row">
            <span className="repair-field__label" id="repair-rec-batches-label">
              {t("repair.useRecBatches")}
            </span>
            <button
              type="button"
              className={`repair-switch${useRecBatches ? " is-on" : ""}`}
              role="switch"
              aria-checked={useRecBatches}
              aria-labelledby="repair-rec-batches-label"
              onClick={() => setUseRecBatches((v) => !v)}
            >
              <span className="repair-switch__thumb" aria-hidden />
            </button>
          </div>
          <p
            className="repair-field__hint"
            style={{ color: cv.text.muted, margin: 0 }}
          >
            {useRecBatches
              ? t("repair.recBatchesHintOn")
              : t("repair.recBatchesHintOff")}
          </p>
        </div>

        {okPlan ? (
          <>
            <div className="repair-totals">
              <div className="repair-totals__row">
                <span>
                  {t("repair.batchCount", { count: okPlan.batches.length })}
                </span>
                <span>
                  {formatRepairMassGrams(okPlan.requiredTotalGrams)}
                </span>
              </div>
              {okPlan.usedRecBatch ? (
                <div
                  className="repair-totals__row repair-totals__row--muted"
                  style={{ color: cv.text.muted }}
                >
                  <span>{t("mixer.recBatch")}</span>
                  <span>{formatRepairMassGrams(okPlan.batchSizeGrams)}</span>
                </div>
              ) : null}
            </div>

            <ul className="repair-batch-list">
              {okPlan.batches.map((batch) =>
                recipe ? (
                  <RepairBatchCard
                    key={batch.index}
                    batch={batch}
                    recipe={recipe}
                    language={uiLanguage}
                  />
                ) : null,
              )}
            </ul>
          </>
        ) : (
          <p className="destination-page__lede" style={{ color: cv.text.muted }}>
            {failMessage ?? t("repair.batchPlanFailed")}
          </p>
        )}
      </DestinationPageChrome>
    );
  }

  // ---------- Wizard ----------
  if (!wizardHole) {
    return null;
  }

  const hole = wizardHole;
  const step = view.step;
  const stepLabel = t(`repair.steps.${step}`);

  const goStep = (next: WizardStep) =>
    setView({ ...view, step: next });

  const footerNext = (label: string, onClick: () => void, disabled = false) => (
    <button
      type="button"
      className="destination-page__primary-btn destination-page__primary-btn--form"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );

  if (step === "shape") {
    const shapes: {
      id: RepairShapeType;
      label: string;
      icon: ReactNode;
    }[] = [
      {
        id: "RECTANGLE",
        label: t("repair.shape.rectangle"),
        icon: (
          <svg viewBox="0 0 32 32" className="repair-shape-card__icon" aria-hidden>
            <rect x="6" y="9" width="20" height="14" rx="1.5" />
          </svg>
        ),
      },
      {
        id: "OVAL",
        label: t("repair.shape.oval"),
        icon: (
          <svg viewBox="0 0 32 32" className="repair-shape-card__icon" aria-hidden>
            <ellipse cx="16" cy="16" rx="11" ry="8" />
          </svg>
        ),
      },
      {
        id: "IRREGULAR",
        label: t("repair.shape.irregular"),
        icon: (
          <svg viewBox="0 0 32 32" className="repair-shape-card__icon" aria-hidden>
            <path d="M8 10.5 L18 7 L26 13.5 L22.5 23 L10 25 Z" />
          </svg>
        ),
      },
    ];
    return (
      <WizardChrome
        title={t("repair.title")}
        stepLabel={stepLabel}
        onMenuClick={onMenuClick}
        onBack={() => leaveWizard(hole.id, view.isNew)}
        footer={footerNext(t("common.next"), () => goStep("dimensions"))}
      >
        <div className="repair-shape-grid" role="radiogroup" aria-label={t("repair.chooseShape")}>
          {shapes.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={hole.shapeType === s.id}
              aria-label={s.label}
              className={`repair-shape-card${
                hole.shapeType === s.id ? " is-active" : ""
              }`}
              onClick={() => setHoleShape(hole.id, s.id)}
            >
              {s.icon}
            </button>
          ))}
        </div>
        <div className="repair-plan-frame">
          <RepairPlanView hole={hole} showLabels />
        </div>
      </WizardChrome>
    );
  }

  if (step === "dimensions") {
    const isOval = hole.shapeType === "OVAL";
    const isCircle =
      isOval &&
      Math.abs(hole.dimensions.lengthMm - hole.dimensions.widthMm) < 0.5;
    return (
      <WizardChrome
        title={t("repair.title")}
        stepLabel={stepLabel}
        onMenuClick={onMenuClick}
        onBack={() => goStep("shape")}
        footer={footerNext(t("common.next"), () => goStep("depth"))}
      >
        {isOval ? (
          <Segmented
            ariaLabel={t("repair.ovalMode")}
            value={isCircle ? "circle" : "oval"}
            options={[
              { id: "circle", label: t("repair.shape.circle") },
              { id: "oval", label: t("repair.shape.oval") },
            ]}
            onChange={(mode) => {
              if (mode === "circle") {
                const d = hole.dimensions.lengthMm;
                setHoleDimensions(hole.id, { lengthMm: d, widthMm: d });
              }
            }}
          />
        ) : null}

        {isOval && isCircle ? (
          <NumberField
            label={t("repair.fields.diameter")}
            unit="mm"
            min={1}
            value={hole.dimensions.lengthMm}
            labelMeta={formatRepairMetersFromMm(hole.dimensions.lengthMm)}
            onChange={(n) => {
              if (n == null) return;
              setHoleDimensions(hole.id, { lengthMm: n, widthMm: n });
            }}
          />
        ) : (
          <div className="repair-dim-row">
            <NumberField
              label={t("repair.fields.length")}
              unit="mm"
              min={1}
              value={hole.dimensions.lengthMm}
              labelMeta={formatRepairMetersFromMm(hole.dimensions.lengthMm)}
              onChange={(n) => {
                if (n == null) return;
                setHoleDimensions(hole.id, {
                  lengthMm: n,
                  widthMm: hole.dimensions.widthMm,
                });
              }}
            />
            <NumberField
              label={t("repair.fields.width")}
              unit="mm"
              min={1}
              value={hole.dimensions.widthMm}
              labelMeta={formatRepairMetersFromMm(hole.dimensions.widthMm)}
              onChange={(n) => {
                if (n == null) return;
                setHoleDimensions(hole.id, {
                  lengthMm: hole.dimensions.lengthMm,
                  widthMm: n,
                });
              }}
            />
          </div>
        )}

        {hole.shapeType === "IRREGULAR" ? (
          <>
            {!outlineHelperOn ? (
              <p
                className="destination-page__lede"
                style={{ color: cv.text.muted }}
              >
                {t("repair.irregularHint")}
              </p>
            ) : null}
            <RepairOutlineEditor
              dimensions={hole.dimensions}
              outline={hole.outline}
              holeForLabels={hole}
              onChange={(outline) => setHoleOutline(hole.id, outline)}
            />
          </>
        ) : (
          <div className="repair-plan-frame">
            <RepairPlanView hole={hole} showLabels />
          </div>
        )}
      </WizardChrome>
    );
  }

  if (step === "depth") {
    const effectiveSelectedId =
      selectedDepthId &&
      hole.depthSamples.some((s) => s.id === selectedDepthId)
        ? selectedDepthId
        : hole.depthSamples[0]?.id ?? null;
    const selected =
      hole.depthSamples.find((s) => s.id === effectiveSelectedId) ?? null;
    const selectedIndex = selected
      ? hole.depthSamples.findIndex((s) => s.id === selected.id)
      : -1;
    const hasDepth = hole.depthSamples.some((s) => s.depthMm != null);
    const hasMultiplePoints = hole.depthSamples.length > 1;
    const nextPointNumber =
      selectedIndex >= 0
        ? ((selectedIndex + 1) % hole.depthSamples.length) + 1
        : 1;
    const goNextPoint = () => {
      if (!hasMultiplePoints) return;
      const i = selectedIndex >= 0 ? selectedIndex : 0;
      const next = hole.depthSamples[(i + 1) % hole.depthSamples.length];
      if (next) setSelectedDepthId(next.id);
    };

    return (
      <WizardChrome
        title={t("repair.title")}
        stepLabel={stepLabel}
        onMenuClick={onMenuClick}
        onBack={() => goStep("dimensions")}
        footer={
          <div className="repair-depth-dock">
            {selected ? (
              <>
                <div className="repair-depth-dock__row">
                  <NumberField
                    label={
                      hole.flatBottom
                        ? t("repair.fields.flatDepth")
                        : t("repair.fields.pointDepth", {
                            n: selectedIndex + 1,
                          })
                    }
                    hideLabel
                    badge={selectedIndex + 1}
                    focusKey={selected.id}
                    placeholder={t("repair.fields.pointPlaceholder")}
                    unit="mm"
                    min={0}
                    allowEmpty
                    value={selected.depthMm}
                    onChange={(n) => setDepthValue(hole.id, selected.id, n)}
                    action={
                      hasMultiplePoints
                        ? {
                            label: t("common.next"),
                            ariaLabel: t("repair.nextPointAria", {
                              n: nextPointNumber,
                            }),
                            onClick: goNextPoint,
                            nextPointBadge: nextPointNumber,
                          }
                        : undefined
                    }
                  />
                  <button
                    type="button"
                    className="destination-page__primary-btn destination-page__primary-btn--form repair-depth-dock__next"
                    disabled={!hasDepth}
                    aria-label={t("common.next")}
                    onClick={() => goStep("review")}
                  >
                    <NextStepIcon size={20} />
                  </button>
                </div>
              </>
            ) : (
              <div className="repair-depth-dock__row">
                <p
                  className="destination-page__empty repair-depth-dock__empty"
                  style={{ color: cv.text.dimmed, margin: 0 }}
                >
                  {t("repair.tapDepthPoint")}
                </p>
                <button
                  type="button"
                  className="destination-page__primary-btn destination-page__primary-btn--form repair-depth-dock__next"
                  disabled
                  aria-label={t("common.next")}
                >
                  <NextStepIcon size={20} />
                </button>
              </div>
            )}
          </div>
        }
      >
        <div className="repair-field">
          <div className="repair-field__label-row">
            <span className="repair-field__label" id="repair-depth-points-label">
              {t("repair.depthPoints")}
            </span>
            <button
              type="button"
              className="repair-field__info"
              aria-label={t("repair.aboutDepthPoints")}
              aria-expanded={depthPointsInfoOpen}
              onClick={() => setDepthPointsInfoOpen((open) => !open)}
            >
              <InfoIcon size={15} />
            </button>
          </div>
          <Segmented<MeasurementDetail>
            className="repair-segmented--points"
            ariaLabel={t("repair.depthPoints")}
            value={hole.measurementDetail}
            options={(
              [
                { id: "QUICK" as const, nameKey: "repair.detail.quick" },
                { id: "STANDARD" as const, nameKey: "repair.detail.standard" },
                { id: "DETAILED" as const, nameKey: "repair.detail.detailed" },
                { id: "EXACT" as const, nameKey: "repair.detail.exact" },
              ] as const
            ).map((opt) => {
              const count = recommendedDepthPointCount(
                opt.id,
                hole.slopeEnabled,
              );
              if (opt.id === "EXACT") {
                return {
                  id: opt.id,
                  ariaLabel: t("repair.detail.exactAria"),
                  label: <ExactDepthIcon size={18} />,
                };
              }
              return {
                id: opt.id,
                ariaLabel: t("repair.detail.pointsAria", {
                  label: t(opt.nameKey),
                  count,
                }),
                label: (
                  <span className="repair-segmented__points-count">{count}</span>
                ),
              };
            })}
            onChange={(id) => {
              setHoleMeasurementDetail(hole.id, id);
              setSelectedDepthId(null);
            }}
          />
          {depthPointsInfoOpen ? (
            <p
              className="repair-field__info-text"
              style={{ color: cv.text.muted }}
            >
              {t("repair.depthPointsInfo")}
            </p>
          ) : null}
        </div>

        <div className="repair-field">
          <div className="repair-switch-row">
            <span className="repair-switch-row__text repair-switch-row__text--inline">
              <span className="repair-field__label" id="repair-slope-label">
                {t("repair.slopeAttribute")}
              </span>
              <button
                type="button"
                className="repair-field__info"
                aria-label={t("repair.slopeAttribute")}
                aria-expanded={slopeInfoOpen}
                onClick={() => setSlopeInfoOpen((open) => !open)}
              >
                <InfoIcon size={15} />
              </button>
            </span>
            <button
              type="button"
              className={`repair-switch${hole.slopeEnabled ? " is-on" : ""}`}
              role="switch"
              aria-checked={hole.slopeEnabled}
              aria-labelledby="repair-slope-label"
              onClick={() => {
                setHoleSlopeEnabled(hole.id, !hole.slopeEnabled);
                setSelectedDepthId(null);
              }}
            >
              <span className="repair-switch__thumb" aria-hidden />
            </button>
          </div>
          {slopeInfoOpen ? (
            <p
              className="repair-field__info-text"
              style={{ color: cv.text.muted }}
            >
              {hole.measurementDetail === "EXACT"
                ? t("repair.exactSlopeHint")
                : t("repair.slopeHint")}
            </p>
          ) : null}
        </div>

        {hole.slopeEnabled ? (
          <div className="repair-field">
            <div className="repair-switch-row">
              <span className="repair-switch-row__text repair-switch-row__text--inline">
                <span className="repair-field__label" id="repair-fall-axis-label">
                  {t("repair.fallAxis")}
                </span>
                <span
                  className="repair-switch-row__value"
                  style={{ color: "var(--semantic-text-muted)" }}
                >
                  {(hole.fallAxis ?? "LENGTH") === "WIDTH"
                    ? t("repair.fallAlongWidth")
                    : t("repair.fallAlongLength")}
                </span>
              </span>
              <button
                type="button"
                className={`repair-switch${
                  (hole.fallAxis ?? "LENGTH") === "WIDTH" ? " is-on" : ""
                }`}
                role="switch"
                aria-checked={(hole.fallAxis ?? "LENGTH") === "WIDTH"}
                aria-labelledby="repair-fall-axis-label"
                onClick={() => {
                  const next: FallAxis =
                    (hole.fallAxis ?? "LENGTH") === "WIDTH"
                      ? "LENGTH"
                      : "WIDTH";
                  setHoleFallAxis(hole.id, next);
                  setSelectedDepthId(null);
                }}
              >
                <span className="repair-switch__thumb" aria-hidden />
              </button>
            </div>
          </div>
        ) : null}

        {!hole.flatBottom ? (
          <NumberField
            label={t("repair.edgeCover")}
            unit="mm"
            min={0}
            variant="underline"
            placeholder="0"
            value={
              hole.edgeProfile === "SLOPED"
                ? (hole.edgeInsetMm ?? computeEdgeInsetMm(hole.dimensions))
                : 0
            }
            onChange={(n) => {
              if (n == null) return;
              if (n <= 0) {
                setHoleEdgeInsetMm(hole.id, null);
                setHoleEdgeProfile(hole.id, "UNIFORM");
                return;
              }
              setHoleEdgeInsetMm(hole.id, n);
            }}
            info={t("repair.edgeCoverHint")}
            infoAriaLabel={t("repair.edgeCover")}
          />
        ) : null}

        <RepairVizAccordion
          labels={{
            plan: t("repair.viz.plan"),
            section: t("repair.viz.section"),
            iso: t("repair.viz.iso"),
          }}
          plan={
            <div className="repair-plan-frame repair-plan-frame--flush">
              <RepairDepthView
                hole={hole}
                selectedId={effectiveSelectedId}
                onSelect={setSelectedDepthId}
                onMoveSample={(id, xMm, yMm) =>
                  moveDepthSample(hole.id, id, xMm, yMm)
                }
              />
            </div>
          }
          section={
            <div className="repair-plan-frame repair-plan-frame--flush">
              <RepairSlopeSectionView hole={hole} />
            </div>
          }
          iso={
            <div className="repair-plan-frame repair-plan-frame--flush">
              <RepairSlopeIsoView
                hole={hole}
                selectedId={effectiveSelectedId}
                onSelect={setSelectedDepthId}
                onChangeDepth={(id, depthMm) =>
                  setDepthValue(hole.id, id, depthMm)
                }
              />
            </div>
          }
        />
      </WizardChrome>
    );
  }

  // review
  const est = estimateRepairHoleVolume(hole);

  return (
    <WizardChrome
      title={t("repair.title")}
      stepLabel={stepLabel}
      onMenuClick={onMenuClick}
      onBack={() => goStep("depth")}
      footer={footerNext(t("repair.done"), () =>
        setView({ kind: "overview" }),
      )}
    >
      <RepairVizAccordion
        labels={{
          plan: t("repair.viz.plan"),
          section: t("repair.viz.section"),
          iso: t("repair.viz.iso"),
        }}
        plan={
          <div className="repair-plan-frame repair-plan-frame--flush">
            <RepairPlanView hole={hole} showDepthMarkers showLabels />
          </div>
        }
        section={
          <div className="repair-plan-frame repair-plan-frame--flush">
            <RepairSlopeSectionView hole={hole} />
          </div>
        }
        iso={
          <div className="repair-plan-frame repair-plan-frame--flush">
            <RepairSlopeIsoView hole={hole} />
          </div>
        }
      />

      {est ? (
        <div className="repair-totals">
          <div className="repair-totals__row repair-totals__row--strong">
            <span>{t("repair.estimatedHoleVolume")}</span>
            <strong>
              {formatRepairLiters(est.expectedLiters)}
              <span
                style={{
                  color: cv.text.muted,
                  fontWeight: 500,
                  fontSize: "0.82em",
                }}
              >
                {" "}
                · {t(confidenceLabelKey(est.confidence))}
              </span>
            </strong>
          </div>
          <div className="repair-totals__row">
            <span>{t("repair.estimatedRange")}</span>
            <span>
              {formatRepairLiters(est.lowerLiters)} –{" "}
              {formatRepairLiters(est.upperLiters)}
            </span>
          </div>
          <div
            className="repair-totals__row"
            style={{ color: cv.text.muted }}
          >
            <span>
              {t("repair.edgeResolved", {
                mode: t(
                  est.assumptions.edgeModeResolved === "SLOPED"
                    ? "repair.edge.sloped"
                    : "repair.edge.uniform",
                ),
              })}
              {est.assumptions.edgeModeResolved === "SLOPED" &&
              est.assumptions.edgeInsetMm > 0
                ? ` · ${Math.round(est.assumptions.edgeInsetMm)} mm`
                : ""}
            </span>
          </div>
        </div>
      ) : (
        <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
          {t("repair.needsDepth")}
        </p>
      )}

      <div className="repair-outline-editor__actions">
        <button
          type="button"
          className="repair-chip-btn"
          onClick={() => goStep("dimensions")}
        >
          {t("repair.editMeasurements")}
        </button>
        <button
          type="button"
          className="repair-chip-btn"
          onClick={() => goStep("depth")}
        >
          {t("repair.editDepths")}
        </button>
      </div>
    </WizardChrome>
  );
}
