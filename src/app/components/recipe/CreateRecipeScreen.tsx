import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  BatchMixer,
  type RecipeCreateCommitPayload,
} from "../../BatchMixer";
import {
  BUCKET_SIZES,
  type BucketSelection,
} from "../../domain/bucket/types";
import {
  blendingRecipeFromFormula,
  blendingRecipeFromWeights,
  countDescriptionWords,
  formatRecipeFormulaSummary,
  RECIPE_CARD_DESCRIPTION_MAX_CHARS,
  RECIPE_CARD_DESCRIPTION_MAX_WORDS,
  validateFormulaInput,
  validateRecipeCardDescription,
  validateWeightsInput,
  type CreateRecipeEntryContext,
  type RecipeCreateMethod,
} from "../../domain/recipe/createFromInputs";
import {
  FILLER_MATERIAL_ORDER,
  THICKENER_MATERIAL_ORDER,
  fillerMaterialOptionLabel,
  resolveFillerMaterialKind,
  resolveThickenerMaterialKind,
  resolveFillerMaterialLabel,
  resolveThickenerMaterialLabel,
  thickenerMaterialOptionLabel,
  type FillerMaterialKind,
  type ThickenerMaterialKind,
} from "../../domain/recipe/additiveMaterials";
import {
  PRESET_RECIPES,
  recipeMenuLabel,
  type BlendingRecipe,
} from "../../domain/recipe/types";
import {
  initialMixValues,
  recipeBinderSum,
} from "../../domain/recipe/calc";
import { partsUnitLabel } from "../../domain/recipe/ingredientLabels";
import type { AppLanguage } from "../../i18n/language";
import { displayLabel } from "../../i18n/localizedLabel";
import { useRecipeLibraryStore } from "../../recipe-library/store";
import { useSettingsStore } from "../../settings/store";
import { useSessionsStore } from "../../sessions/store";
import { sessionHeaderName } from "../../domain/sessions/stages";
import { CloseIcon, InfoIcon, ScaleIcon, SwipeAdjustIcon, SavedIcon } from "../shared/ActionIcons";
import { AppHeader } from "../shared/AppHeader";
import {
  RecipeHeaderSubline,
  RecipeHeaderSublineStack,
} from "../mixer/RecipeZoneMeta";
import { PickRecipeForMixSheet } from "../sessions/PickRecipeForMixSheet";
import { ConfirmActionSheet } from "../sheets/ConfirmActionSheet";
import { GramSwipeInputSheet } from "../sheets/GramSwipeInputSheet";
import {
  SHEET_FIELD_INPUT_CLASS,
  sheetFieldInputStyle,
} from "../sheets/sheetChrome";

const UNIT_POPOVER_FRAME_PAD = 8;

/** Prefill name when starting from an existing recipe: "Copy {original}". */
function copyRecipeName(
  recipe: BlendingRecipe,
  formatCopy: (name: string) => string,
  language?: AppLanguage,
): string {
  const original = displayLabel(recipe.name, language).trim() || recipe.id;
  return formatCopy(original);
}

type FieldKey = "name" | "a" | "b" | "c" | "filler" | "thickener" | "description";

/** Mixer UI supports at most this many ingredient cards (A/B/C/filler/thickener). */
const MAX_RECIPE_ENTITIES = 4;

/** Full create-recipe form for one method tab — Formula and Weights stay independent. */
type MethodFormDraft = {
  name: string;
  nameSubline: string;
  description: string;
  a: string;
  b: string;
  /** Optional third binder; only used when `includeC` is true. */
  c: string;
  /** Whether the C input is shown (counts toward the 4-entity cap). */
  includeC: boolean;
  filler: string;
  thickener: string;
  fillerMaterial: FillerMaterialKind;
  fillerCustomName: string;
  /** Session-only custom names shown in the filler dropdown. */
  fillerTempNames: string[];
  /** Inline custom-name editor open. */
  fillerNaming: boolean;
  fillerNameDraft: string;
  thickenerMaterial: ThickenerMaterialKind;
  thickenerCustomName: string;
  thickenerTempNames: string[];
  thickenerNaming: boolean;
  thickenerNameDraft: string;
  scaledBinderSum: number | undefined;
  bucketSelection: BucketSelection;
  advancedOpen: boolean;
  dirty: boolean;
};

function emptyMethodFormDraft(): MethodFormDraft {
  return {
    name: "",
    nameSubline: "",
    description: "",
    a: "",
    b: "",
    c: "",
    includeC: false,
    filler: "",
    thickener: "",
    fillerMaterial: "sand",
    fillerCustomName: "",
    fillerTempNames: [],
    fillerNaming: false,
    fillerNameDraft: "",
    thickenerMaterial: "tix",
    thickenerCustomName: "",
    thickenerTempNames: [],
    thickenerNaming: false,
    thickenerNameDraft: "",
    scaledBinderSum: undefined,
    bucketSelection: "none",
    advancedOpen: false,
    dirty: false,
  };
}

function fieldHasAmount(raw: string): boolean {
  const n = parseNum(raw);
  return Number.isFinite(n) && n > 0;
}

/** When C is present only one additive can be active — clear the excess (no message). */
function enforceEntityCap(draft: MethodFormDraft): MethodFormDraft {
  if (!draft.includeC) return draft;
  const fillerOn = fieldHasAmount(draft.filler);
  const thickenerOn = fieldHasAmount(draft.thickener);
  if (!(fillerOn && thickenerOn)) return draft;
  return {
    ...draft,
    thickener: "",
    thickenerNaming: false,
    thickenerNameDraft: "",
  };
}

const MATERIAL_TEMP_PREFIX = "tmp:";

function materialTempValue(name: string): string {
  return `${MATERIAL_TEMP_PREFIX}${name}`;
}

function materialTempName(value: string): string | null {
  if (!value.startsWith(MATERIAL_TEMP_PREFIX)) return null;
  return value.slice(MATERIAL_TEMP_PREFIX.length);
}

function parseNum(raw: string): number {
  const normalized = String(raw).trim().replace(",", ".");
  if (normalized === "" || normalized === ".") return NaN;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

/** Trim trailing zeros for display (1.5 → "1.5", 1500 → "1500"). */
function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
}

function gramsToKgDraft(gramsRaw: string): string {
  const g = parseNum(gramsRaw);
  if (!(g >= 0) || gramsRaw.trim() === "") return "";
  return formatAmount(g / 1000);
}

/** Digits only; at most one decimal separator (`.` or `,`). */
function sanitizeDecimalInput(raw: string): string {
  let out = "";
  let seenSep = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if ((ch === "." || ch === ",") && !seenSep) {
      seenSep = true;
      out += ch;
    }
  }
  return out;
}

/** @deprecated alias — unit converter uses the same rules. */
const sanitizeKgInput = sanitizeDecimalInput;

/** True when the draft is a usable kg amount (≥ 0). */
function isValidKgDraft(raw: string): boolean {
  const t = raw.trim();
  if (t === "" || t === "." || t === ",") return false;
  if (!/^\d+([.,]\d*)?$|^[.,]\d+$/.test(t)) return false;
  const kg = parseNum(t);
  return Number.isFinite(kg) && kg >= 0;
}

function kgDraftToGrams(kgRaw: string): string | null {
  if (!isValidKgDraft(kgRaw)) return null;
  const kg = parseNum(kgRaw);
  return formatAmount(kg * 1000);
}

/** Same digit rules as kg — used for % of binder drafts too. */
const sanitizeUnitInput = sanitizeKgInput;
const isValidUnitDraft = isValidKgDraft;

function gramsToPercentDraft(gramsRaw: string, binderGrams: number): string {
  const g = parseNum(gramsRaw);
  if (!(binderGrams > 0) || !(g >= 0) || gramsRaw.trim() === "") return "";
  return formatAmount((g / binderGrams) * 100);
}

function percentDraftToGrams(pctRaw: string, binderGrams: number): string | null {
  if (!(binderGrams > 0) || !isValidUnitDraft(pctRaw)) return null;
  const pct = parseNum(pctRaw);
  return formatAmount((pct / 100) * binderGrams);
}

type UnitConverterMode = "kg" | "percent";

const FIELD_FOCUS_ORDER: FieldKey[] = [
  "name",
  "a",
  "b",
  "c",
  "filler",
  "thickener",
  "description",
];

function focusCreateField(key: FieldKey) {
  window.requestAnimationFrame(() => {
    const root = document.querySelector<HTMLElement>(
      `[data-create-field="${key}"]`,
    );
    if (!root) return;
    root.scrollIntoView({ block: "center", behavior: "smooth" });
    const focusable =
      root.matches("input, textarea, button")
        ? root
        : root.querySelector<HTMLElement>("input, textarea");
    focusable?.focus?.();
  });
}

function firstInvalidFieldKey(
  errors: Partial<Record<FieldKey, true>>,
): FieldKey | null {
  for (const key of FIELD_FOCUS_ORDER) {
    if (errors[key]) return key;
  }
  return null;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  inputMode = "decimal",
  required = false,
  invalid = false,
  disabled = false,
  kgHelper = false,
  percentOfBinderHelper = false,
  binderGrams = null,
  fieldKey,
  nameSelect,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  inputMode?: "decimal" | "text";
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  /** Gram fields: open a unit converter that writes grams into this field. */
  kgHelper?: boolean;
  /** Filler/thickener: also offer % of binder in the converter sheet. */
  percentOfBinderHelper?: boolean;
  /** A+B[+C] grams when binder is complete; null disables % mode. */
  binderGrams?: number | null;
  /** For scroll/focus on validation errors. */
  fieldKey?: FieldKey;
  /** Optional material name control (filler / thickener). */
  nameSelect?: {
    /** Current select value: preset kind, `tmp:Name`, or `custom` while naming. */
    value: string;
    options: { value: string; label: string }[];
    onChange: (next: string) => void;
    naming: boolean;
    draftName: string;
    onDraftNameChange: (next: string) => void;
    onConfirmCustom: () => void;
    onCancelCustom: () => void;
    customPlaceholder?: string;
    ariaLabel: string;
    confirmAria: string;
    cancelAria: string;
  };
}) {
  const { t } = useTranslation("common");
  const labelId = useId();
  const slotRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const unitInputRef = useRef<HTMLInputElement>(null);
  const [unitOpen, setUnitOpen] = useState(false);
  const [unitMode, setUnitMode] = useState<UnitConverterMode>("kg");
  const [unitDraft, setUnitDraft] = useState("");
  const [swipeOpen, setSwipeOpen] = useState(false);
  const [unitPortal, setUnitPortal] = useState<HTMLElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const binderHint = t("recipe.binderHint");
  const dialSwipeLabel = t("recipe.dialSwipe");
  const [materialMenuOpen, setMaterialMenuOpen] = useState(false);
  const materialWrapRef = useRef<HTMLDivElement>(null);
  const materialMenuRef = useRef<HTMLDivElement>(null);
  const [materialMenuStyle, setMaterialMenuStyle] = useState<CSSProperties | null>(
    null,
  );
  const [materialMenuPortal, setMaterialMenuPortal] =
    useState<HTMLElement | null>(null);

  const materialSelectedLabel =
    nameSelect?.options.find((opt) => opt.value === nameSelect.value)?.label ??
    "";

  const updateMaterialMenuPosition = useCallback(() => {
    const wrap = materialWrapRef.current;
    const menu = materialMenuRef.current;
    const frame = wrap?.closest<HTMLElement>(".app-frame");
    if (!wrap || !frame) return;
    const frameR = frame.getBoundingClientRect();
    const wrapR = wrap.getBoundingClientRect();
    const pad = 8;
    const gap = 6;
    const minW = Math.max(wrapR.width, 168);
    const menuH = menu?.offsetHeight || 44 * (nameSelect?.options.length ?? 3) + 14;
    const spaceBelow = frameR.bottom - wrapR.bottom - pad;
    const spaceAbove = wrapR.top - frameR.top - pad;
    const placeAbove = spaceBelow < menuH + gap && spaceAbove > spaceBelow;
    let left = wrapR.left - frameR.left;
    left = Math.min(left, frameR.width - pad - minW);
    left = Math.max(pad, left);
    const top = placeAbove
      ? wrapR.top - frameR.top - gap - menuH
      : wrapR.bottom - frameR.top + gap;
    setMaterialMenuStyle({
      position: "absolute",
      top: Math.max(pad, top),
      left,
      minWidth: minW,
      zIndex: 40,
    });
  }, [nameSelect?.options.length]);

  useLayoutEffect(() => {
    if (!materialMenuOpen) {
      setMaterialMenuPortal(null);
      setMaterialMenuStyle(null);
      return;
    }
    const wrap = materialWrapRef.current;
    const frame = wrap?.closest<HTMLElement>(".app-frame") ?? null;
    setMaterialMenuPortal(frame);
    updateMaterialMenuPosition();
    const raf = requestAnimationFrame(() => {
      updateMaterialMenuPosition();
    });
    return () => cancelAnimationFrame(raf);
  }, [materialMenuOpen, updateMaterialMenuPosition, nameSelect?.options.length]);

  useEffect(() => {
    if (!materialMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const wrap = materialWrapRef.current;
      const menu = materialMenuRef.current;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (wrap?.contains(target)) return;
      if (menu?.contains(target)) return;
      setMaterialMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaterialMenuOpen(false);
    };
    const onReposition = () => updateMaterialMenuPosition();
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [materialMenuOpen, updateMaterialMenuPosition]);

  useEffect(() => {
    if (nameSelect?.naming) setMaterialMenuOpen(false);
  }, [nameSelect?.naming]);

  useEffect(() => {
    if (!disabled) return;
    setMaterialMenuOpen(false);
    setUnitOpen(false);
    setSwipeOpen(false);
  }, [disabled]);
  const binderReady = binderGrams != null && binderGrams > 0;
  const showPercentTab = percentOfBinderHelper;
  const unitDraftInvalid =
    unitDraft.trim() !== "" &&
    unitDraft !== "." &&
    unitDraft !== "," &&
    !isValidUnitDraft(unitDraft);

  const updatePopoverPosition = useCallback(() => {
    const slot = slotRef.current;
    const popover = popoverRef.current;
    const frame = slot?.closest<HTMLElement>(".app-frame");
    if (!slot || !frame) return;

    const frameR = frame.getBoundingClientRect();
    const slotR = slot.getBoundingClientRect();
    const pad = UNIT_POPOVER_FRAME_PAD;
    const width = slotR.width;
    const left = slotR.left - frameR.left;
    const maxH = Math.max(120, frameR.height - pad * 2);
    const popH = Math.min(popover?.offsetHeight || 168, maxH);
    const spaceBelow = frameR.bottom - slotR.top - pad;
    const spaceAbove = slotR.bottom - frameR.top - pad;

    let top: number;
    if (popH <= spaceBelow) {
      top = slotR.top - frameR.top;
    } else if (popH <= spaceAbove) {
      top = slotR.bottom - frameR.top - popH;
    } else {
      top = Math.max(
        pad,
        Math.min(slotR.top - frameR.top, frameR.height - pad - popH),
      );
    }

    setPopoverStyle({
      position: "absolute",
      top,
      left,
      width,
      maxHeight: maxH,
      zIndex: 36,
    });
  }, []);

  useLayoutEffect(() => {
    if (!unitOpen) {
      setUnitPortal(null);
      setPopoverStyle(null);
      return;
    }
    const slot = slotRef.current;
    const frame = slot?.closest<HTMLElement>(".app-frame") ?? null;
    setUnitPortal(frame);
    updatePopoverPosition();
    const id = window.requestAnimationFrame(() => updatePopoverPosition());
    return () => window.cancelAnimationFrame(id);
  }, [unitOpen, unitMode, unitDraftInvalid, showPercentTab, updatePopoverPosition]);

  useEffect(() => {
    if (!unitOpen) return;
    const onReposition = () => updatePopoverPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [unitOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!unitOpen) return;
    const id = window.requestAnimationFrame(() => {
      unitInputRef.current?.focus();
      unitInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [unitOpen, unitMode]);

  useEffect(() => {
    if (!unitOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setUnitOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unitOpen]);

  useEffect(() => {
    if (!unitOpen) return;
    if (unitMode === "percent" && !binderReady) {
      setUnitMode("kg");
      setUnitDraft(gramsToKgDraft(value));
    }
  }, [unitOpen, unitMode, binderReady, value]);

  const openUnitHelper = () => {
    if (disabled) return;
    setSwipeOpen(false);
    setUnitMode("kg");
    setUnitDraft(gramsToKgDraft(value));
    setUnitOpen(true);
  };

  const selectUnitMode = (next: UnitConverterMode) => {
    if (next === unitMode) return;
    if (next === "percent" && !binderReady) return;
    if (next === "percent" && binderGrams != null) {
      setUnitDraft(gramsToPercentDraft(value, binderGrams));
    } else {
      setUnitDraft(gramsToKgDraft(value));
    }
    setUnitMode(next);
  };

  const applyUnitHelper = () => {
    if (unitDraft.trim() !== "" && !isValidUnitDraft(unitDraft)) return;
    const grams =
      unitMode === "percent"
        ? binderGrams != null
          ? percentDraftToGrams(unitDraft, binderGrams)
          : null
        : kgDraftToGrams(unitDraft);
    if (grams != null) onChange(grams);
    setUnitOpen(false);
  };

  const closeUnitHelper = () => {
    if (unitDraft.trim() !== "" && !isValidUnitDraft(unitDraft)) {
      setUnitOpen(false);
      return;
    }
    const grams =
      unitMode === "percent"
        ? binderGrams != null
          ? percentDraftToGrams(unitDraft, binderGrams)
          : null
        : kgDraftToGrams(unitDraft);
    if (grams != null) onChange(grams);
    setUnitOpen(false);
  };

  const openSwipeHelper = () => {
    if (disabled) return;
    setUnitOpen(false);
    setSwipeOpen(true);
  };

  const gramValue = (() => {
    const n = parseNum(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();

  const unitCanApply =
    isValidUnitDraft(unitDraft) &&
    (unitMode === "kg" || binderReady);

  const unitSuffix =
    unitMode === "percent" ? t("recipe.percentOfBinder") : "kg";
  const scaleTitle = showPercentTab
    ? t("recipe.convertFromKgOrPercent")
    : t("recipe.enterInKg");
  const applyLabel =
    unitMode === "percent"
      ? t("recipe.convertFromPercent")
      : t("recipe.convertToGrams");
  const previewGrams =
    unitMode === "percent"
      ? binderGrams != null
        ? percentDraftToGrams(unitDraft, binderGrams)
        : null
      : kgDraftToGrams(unitDraft);
  const labelKg = kgHelper ? gramsToKgDraft(value) : "";

  const unitPopover =
    kgHelper && unitOpen && unitPortal && popoverStyle
      ? createPortal(
          <>
            <button
              type="button"
              className="create-recipe__kg-backdrop create-recipe__kg-backdrop--portaled"
              aria-label={t("recipe.dismissConverter")}
              onClick={closeUnitHelper}
            />
            <div
              ref={popoverRef}
              className="create-recipe__kg-popover create-recipe__kg-popover--portaled"
              style={popoverStyle}
              role="dialog"
              aria-label={t("recipe.convertAria", { label })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyUnitHelper();
                }
              }}
            >
              {showPercentTab ? (
                <div
                  className="create-recipe__unit-tabs"
                  role="tablist"
                  aria-label={t("recipe.converterType")}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={unitMode === "kg"}
                    className={`create-recipe__unit-tab${
                      unitMode === "kg" ? " create-recipe__unit-tab--active" : ""
                    }`}
                    onClick={() => selectUnitMode("kg")}
                  >
                    kg
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={unitMode === "percent"}
                    aria-disabled={!binderReady}
                    disabled={!binderReady}
                    className={`create-recipe__unit-tab${
                      unitMode === "percent" ? " create-recipe__unit-tab--active" : ""
                    }${!binderReady ? " create-recipe__unit-tab--disabled" : ""}`}
                    title={
                      binderReady ? t("recipe.percentOfBinder") : binderHint
                    }
                    onClick={() => selectUnitMode("percent")}
                  >
                    {t("recipe.percentOfBinder")}
                  </button>
                </div>
              ) : null}

              <div className="create-recipe__unit-row">
                <span
                  className={`create-recipe__control create-recipe__control--with-suffix create-recipe__unit-source${
                    unitDraftInvalid ? " create-recipe__control--invalid" : ""
                  }${
                    unitMode === "kg"
                      ? " create-recipe__control--unit-kg"
                      : " create-recipe__control--unit-percent"
                  }`}
                >
                  <input
                    ref={unitInputRef}
                    className={`${SHEET_FIELD_INPUT_CLASS} create-recipe__input`}
                    style={sheetFieldInputStyle({ flex: 1, minWidth: 0 })}
                    value={unitDraft}
                    inputMode="decimal"
                    aria-label={
                      unitMode === "percent"
                        ? `${label} as percent of binder`
                        : `${label} in kilograms`
                    }
                    aria-invalid={unitDraftInvalid || undefined}
                    onChange={(e) => setUnitDraft(sanitizeUnitInput(e.target.value))}
                  />
                  <span
                    className={`create-recipe__suffix create-recipe__suffix--grams${
                      unitMode === "percent" ? " create-recipe__suffix--percent" : ""
                    }`}
                    aria-hidden
                  >
                    {unitSuffix}
                  </span>
                </span>

                <span
                  className="create-recipe__control create-recipe__control--with-suffix create-recipe__unit-result"
                  aria-live="polite"
                >
                  <input
                    className={`${SHEET_FIELD_INPUT_CLASS} create-recipe__input`}
                    style={sheetFieldInputStyle({ flex: 1, minWidth: 0 })}
                    value={previewGrams ?? ""}
                    disabled
                    readOnly
                    tabIndex={-1}
                    aria-label={t("recipe.gramsComputedAria", { label })}
                    placeholder="—"
                  />
                  <span className="create-recipe__suffix create-recipe__suffix--grams" aria-hidden>
                    g
                  </span>
                </span>
              </div>
              {unitDraftInvalid ? (
                <p className="create-recipe__kg-error" role="alert">
                  {t("recipe.unitError")}
                </p>
              ) : null}
              <div className="create-recipe__kg-actions">
                <button
                  type="button"
                  className="create-recipe__kg-action create-recipe__kg-action--apply"
                  disabled={!unitCanApply}
                  onClick={applyUnitHelper}
                >
                  {applyLabel}
                </button>
                <button
                  type="button"
                  className="create-recipe__kg-action create-recipe__kg-action--cancel"
                  aria-label={t("recipe.cancel")}
                  onClick={() => setUnitOpen(false)}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>
          </>,
          unitPortal,
        )
      : null;

  return (
    <div
      className={`create-recipe__field${invalid ? " create-recipe__field--invalid" : ""}${
        disabled ? " create-recipe__field--disabled" : ""
      }${unitOpen ? " create-recipe__field--kg-open" : ""}`}
      data-create-field={fieldKey}
    >
      <div className="create-recipe__field-label-row">
        <div className="create-recipe__field-label-group">
          <span className="create-recipe__field-label" id={labelId}>
            {label}
            {required ? (
              <span className="create-recipe__field-required" aria-hidden>
                *
              </span>
            ) : null}
          </span>
          {nameSelect ? (
            <div className="create-recipe__material-control">
              {nameSelect.naming && !disabled ? (
                <div className="create-recipe__material-name-edit">
                  <input
                    className="create-recipe__material-draft"
                    value={nameSelect.draftName}
                    placeholder={nameSelect.customPlaceholder}
                    inputMode="text"
                    aria-label={nameSelect.customPlaceholder ?? nameSelect.ariaLabel}
                    autoFocus
                    onChange={(e) => nameSelect.onDraftNameChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        nameSelect.onConfirmCustom();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        nameSelect.onCancelCustom();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="create-recipe__material-cancel"
                    aria-label={nameSelect.cancelAria}
                    onClick={() => nameSelect.onCancelCustom()}
                  >
                    <CloseIcon size={14} />
                  </button>
                  <button
                    type="button"
                    className="create-recipe__material-confirm"
                    aria-label={nameSelect.confirmAria}
                    disabled={nameSelect.draftName.trim() === ""}
                    onClick={() => nameSelect.onConfirmCustom()}
                  >
                    <SavedIcon size={14} />
                  </button>
                </div>
              ) : (
                <div
                  ref={materialWrapRef}
                  className="create-recipe__material-select-wrap"
                >
                  <button
                    type="button"
                    className="create-recipe__material-trigger"
                    data-open={materialMenuOpen ? "" : undefined}
                    aria-label={nameSelect.ariaLabel}
                    aria-haspopup="listbox"
                    aria-expanded={materialMenuOpen}
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      setMaterialMenuOpen((open) => !open);
                    }}
                  >
                    <span className="create-recipe__material-trigger-label">
                      {materialSelectedLabel}
                    </span>
                    <span
                      className="create-recipe__material-chevron"
                      data-open={materialMenuOpen ? "" : undefined}
                      aria-hidden
                    >
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                        <path
                          d="M1 1.25L5 4.75L9 1.25"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {materialMenuOpen && materialMenuPortal && materialMenuStyle
                    ? createPortal(
                        <div
                          ref={materialMenuRef}
                          className="create-recipe__material-menu"
                          role="listbox"
                          aria-label={nameSelect.ariaLabel}
                          data-selected=""
                          style={materialMenuStyle}
                        >
                          {nameSelect.options.map((opt) => {
                            const active = opt.value === nameSelect.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                role="option"
                                aria-selected={active}
                                className="create-recipe__material-option"
                                data-active={active ? "" : undefined}
                                onClick={() => {
                                  setMaterialMenuOpen(false);
                                  nameSelect.onChange(opt.value);
                                }}
                              >
                                <span className="create-recipe__material-option-label">
                                  {opt.label}
                                </span>
                                <span
                                  className="create-recipe__material-option-check"
                                  aria-hidden
                                >
                                  {active ? <SavedIcon size={15} /> : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>,
                        materialMenuPortal,
                      )
                    : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
        {kgHelper && labelKg !== "" ? (
          <span className="create-recipe__field-kg" aria-live="polite">
            {labelKg} kg
          </span>
        ) : null}
      </div>
      <div className="create-recipe__field-input-slot" ref={slotRef}>
        <span
          className={`create-recipe__control${
            invalid ? " create-recipe__control--invalid" : ""
          }${suffix ? " create-recipe__control--with-suffix" : ""}${
            kgHelper ? " create-recipe__control--with-kg" : ""
          }${unitOpen ? " create-recipe__control--unit-covered" : ""}`}
        >
          <input
            className={`${SHEET_FIELD_INPUT_CLASS} create-recipe__input`}
            style={sheetFieldInputStyle({ flex: 1, minWidth: 0 })}
            value={value}
            placeholder={placeholder}
            inputMode={inputMode}
            required={required}
            disabled={disabled}
            aria-labelledby={labelId}
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            aria-disabled={disabled || undefined}
            onChange={(e) => {
              if (disabled) return;
              const next =
                inputMode === "decimal"
                  ? sanitizeDecimalInput(e.target.value)
                  : e.target.value;
              onChange(next);
            }}
          />
          {suffix ? (
            <span
              className={`create-recipe__suffix${
                suffix === "gram" ? " create-recipe__suffix--grams" : ""
              }`}
              aria-hidden
            >
              {suffix}
            </span>
          ) : null}
          {kgHelper ? (
            <>
              <button
                type="button"
                className="create-recipe__kg-btn"
                aria-label={`${dialSwipeLabel}: ${label}`}
                aria-expanded={swipeOpen}
                aria-haspopup="dialog"
                title={dialSwipeLabel}
                disabled={disabled}
                onClick={openSwipeHelper}
              >
                <SwipeAdjustIcon size={16} />
              </button>
              <button
                type="button"
                className="create-recipe__kg-btn"
                aria-label={scaleTitle}
                aria-expanded={unitOpen}
                aria-haspopup="dialog"
                title={scaleTitle}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  if (unitOpen) closeUnitHelper();
                  else openUnitHelper();
                }}
              >
                <ScaleIcon size={16} />
              </button>
            </>
          ) : null}
        </span>
      </div>

      {unitPopover}

      {kgHelper ? (
        <GramSwipeInputSheet
          open={swipeOpen}
          onOpenChange={setSwipeOpen}
          fieldLabel={label}
          valueGrams={gramValue}
          onApply={(grams) => onChange(formatAmount(grams))}
        />
      ) : null}
    </div>
  );
}

function bucketOptionLabel(
  option: BucketSelection,
  unlimitedLabel: string,
): string {
  return option === "none" ? unlimitedLabel : `${option} L`;
}

function collectFieldErrors(
  method: RecipeCreateMethod,
  name: string,
  a: string,
  b: string,
  c: string,
  includeC: boolean,
  filler: string,
  thickener: string,
  description: string,
): Partial<Record<FieldKey, true>> {
  const next: Partial<Record<FieldKey, true>> = {};
  if (!name.trim()) next.name = true;

  const aNum = parseNum(a);
  const bNum = parseNum(b);
  if (!(aNum > 0)) next.a = true;
  if (!(bNum > 0)) next.b = true;
  if (includeC) {
    const cNum = parseNum(c);
    if (!(cNum > 0)) next.c = true;
  }

  if (filler.trim() !== "") {
    const n = parseNum(filler);
    if (!Number.isFinite(n) || n < 0) next.filler = true;
  }
  if (thickener.trim() !== "") {
    const n = parseNum(thickener);
    if (!Number.isFinite(n) || n < 0) next.thickener = true;
  }
  if (validateRecipeCardDescription(description)) next.description = true;

  // Keep method param for future method-specific rules.
  void method;
  return next;
}

const CREATE_BUCKET_OPTIONS: BucketSelection[] = ["none", ...BUCKET_SIZES];

export function CreateRecipeScreen({
  context,
  embedded = false,
  onMenuClick,
  onBack,
  onSaved,
}: {
  context: CreateRecipeEntryContext;
  embedded?: boolean;
  onMenuClick: () => void;
  onBack: () => void;
  onSaved: (recipe: BlendingRecipe, via: "library" | "session") => void;
}) {
  const { t } = useTranslation("common");
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const addLibraryRecipe = useRecipeLibraryStore((s) => s.addRecipe);
  const userRecipes = useRecipeLibraryStore((s) => s.userRecipes);
  const addSessionRecipe = useSessionsStore((s) => s.addSessionRecipe);
  const sessions = useSessionsStore((s) => s.sessions);

  const sessionId = context.source === "session" ? context.sessionId : null;
  const showSessionSave = context.source === "session";
  const sessionName =
    sessionId != null
      ? (() => {
          const session = sessions.find((s) => s.id === sessionId);
          return session
            ? sessionHeaderName(session)
            : t("nav.sessionChip");
        })()
      : undefined;

  const libraryRecipes = useMemo(() => {
    const user = Array.isArray(userRecipes) ? userRecipes : [];
    return [...PRESET_RECIPES, ...user];
  }, [userRecipes]);

  const sessionRecipesForPicker = useMemo(() => {
    if (sessionId == null) return [];
    return sessions.find((s) => s.id === sessionId)?.sessionRecipes ?? [];
  }, [sessionId, sessions]);

  const [method, setMethod] = useState<RecipeCreateMethod>("formula");
  const [formulaForm, setFormulaForm] = useState<MethodFormDraft>(emptyMethodFormDraft);
  const [weightsForm, setWeightsForm] = useState<MethodFormDraft>(emptyMethodFormDraft);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formulaInfoOpen, setFormulaInfoOpen] = useState(false);
  const [bucketInfoOpen, setBucketInfoOpen] = useState(false);
  const [startFromOpen, setStartFromOpen] = useState(false);
  const [pendingStartRecipe, setPendingStartRecipe] =
    useState<BlendingRecipe | null>(null);

  const [phase, setPhase] = useState<"form" | "scale">("form");
  const [scalePurpose, setScalePurpose] = useState<"rec-batch" | "edit-weights">(
    "rec-batch",
  );
  const [draft, setDraft] = useState<BlendingRecipe | null>(null);
  const [draftMixValues, setDraftMixValues] = useState<number[] | undefined>(
    undefined,
  );

  const form = method === "formula" ? formulaForm : weightsForm;
  const setForm = method === "formula" ? setFormulaForm : setWeightsForm;
  const {
    name,
    nameSubline,
    description,
    a,
    b,
    c,
    includeC,
    filler,
    thickener,
    fillerMaterial,
    fillerCustomName,
    fillerTempNames,
    fillerNaming,
    fillerNameDraft,
    thickenerMaterial,
    thickenerCustomName,
    thickenerTempNames,
    thickenerNaming,
    thickenerNameDraft,
    scaledBinderSum,
    bucketSelection,
    advancedOpen,
    dirty,
  } = form;

  const patchForm = (
    patch: Partial<MethodFormDraft> | ((prev: MethodFormDraft) => MethodFormDraft),
  ) => {
    setForm((prev) => {
      const next =
        typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      return enforceEntityCap(next);
    });
  };

  const markDirty = () => patchForm({ dirty: true });

  const setComponentField = (
    key: "a" | "b" | "c" | "filler" | "thickener",
    value: string,
  ) => {
    patchForm((prev) => {
      const next = { ...prev, [key]: value, dirty: true };
      // When claiming the single additive slot under C, clear the other.
      if (prev.includeC && fieldHasAmount(value)) {
        if (key === "filler" && fieldHasAmount(prev.thickener)) {
          next.thickener = "";
          next.thickenerNaming = false;
          next.thickenerNameDraft = "";
        } else if (key === "thickener" && fieldHasAmount(prev.filler)) {
          next.filler = "";
          next.fillerNaming = false;
          next.fillerNameDraft = "";
        }
      }
      return next;
    });
    if (submitted) setError(null);
  };

  const addComponentC = () => {
    patchForm({
      includeC: true,
      dirty: true,
    });
  };

  const removeComponentC = () => {
    patchForm({
      includeC: false,
      c: "",
      dirty: true,
    });
  };

  const commitRecipeAsCopy = (recipe: BlendingRecipe) => {
    const copiedName = copyRecipeName(
      recipe,
      (n) => t("recipe.copyName", { name: n }),
      uiLanguage,
    );
    const copiedSubline = displayLabel(recipe.nameSubline, uiLanguage).trim();
    const copiedDescription = displayLabel(recipe.description, uiLanguage).trim();
    const sandEntry = recipe.binderPercents.find(
      (p) => p.id === "FILLER" || p.id === "SAND",
    );
    const tixEntry = recipe.binderPercents.find(
      (p) => p.id === "THICKENER" || p.id === "TIX",
    );    const cParts = recipe.binderParts.find((p) => p.id === "C")?.parts ?? 0;
    const hasC = cParts > 0;
    const nextFillerKind = resolveFillerMaterialKind(sandEntry);
    const nextThickenerKind = resolveThickenerMaterialKind(tixEntry);
    const fillerLabel =
      nextFillerKind === "custom" ? (sandEntry?.label ?? "").trim() : "";
    const thickenerLabel =
      nextThickenerKind === "custom" ? (tixEntry?.label ?? "").trim() : "";
    const materialPatch = {
      fillerMaterial: nextFillerKind,
      fillerCustomName: fillerLabel,
      fillerTempNames: fillerLabel ? [fillerLabel] : [],
      fillerNaming: false,
      fillerNameDraft: "",
      thickenerMaterial: nextThickenerKind,
      thickenerCustomName: thickenerLabel,
      thickenerTempNames: thickenerLabel ? [thickenerLabel] : [],
      thickenerNaming: false,
      thickenerNameDraft: "",
    };

    if (method === "weights") {
      const binder = recipeBinderSum(recipe);
      const [, aG, bG, cG, tixG, sandG] = initialMixValues(recipe, binder);
      patchForm({
        name: copiedName,
        nameSubline: copiedSubline,
        description: copiedDescription,
        a: formatAmount(aG),
        b: formatAmount(bG),
        c: hasC && cG > 0 ? formatAmount(cG) : "",
        includeC: hasC,
        filler: sandG > 0 ? formatAmount(sandG) : "",
        thickener: tixG > 0 ? formatAmount(tixG) : "",
        ...materialPatch,
        advancedOpen: copiedDescription !== "" ? true : form.advancedOpen,
        dirty: true,
      });
    } else {
      const aParts = recipe.binderParts.find((p) => p.id === "A")?.parts ?? 2;
      const bParts = recipe.binderParts.find((p) => p.id === "B")?.parts ?? 1;
      const sandPct = sandEntry?.percent;
      const tixPct = tixEntry?.percent;
      const binder =
        recipe.initialBinderSum != null &&
        Number.isFinite(recipe.initialBinderSum) &&
        recipe.initialBinderSum > 0
          ? Math.round(recipe.initialBinderSum)
          : undefined;

      patchForm({
        name: copiedName,
        nameSubline: copiedSubline,
        description: copiedDescription,
        a: formatAmount(aParts),
        b: formatAmount(bParts),
        c: hasC ? formatAmount(cParts) : "",
        includeC: hasC,
        filler: sandPct != null && sandPct > 0 ? formatAmount(sandPct) : "",
        thickener: tixPct != null && tixPct > 0 ? formatAmount(tixPct) : "",
        scaledBinderSum: binder,
        ...materialPatch,
        advancedOpen:
          binder != null || copiedDescription !== "" ? true : form.advancedOpen,
        dirty: true,
      });
    }

    setError(null);
    setSubmitted(false);
  };

  const applyRecipeAsCopy = (recipe: BlendingRecipe): boolean => {
    if (dirty) {
      setPendingStartRecipe(recipe);
      // Keep picker open under the confirm sheet.
      return true;
    }
    commitRecipeAsCopy(recipe);
    // false = close picker after successful apply.
    return false;
  };

  const descriptionWordCount = countDescriptionWords(description);
  const descriptionLimitError = validateRecipeCardDescription(description);
  const descriptionInvalid = Boolean(
    descriptionLimitError &&
      (submitted || descriptionWordCount > RECIPE_CARD_DESCRIPTION_MAX_WORDS),
  );

  const fieldErrors = useMemo(() => {
    if (!submitted) return {} as Partial<Record<FieldKey, true>>;
    return collectFieldErrors(
      method,
      name,
      a,
      b,
      c,
      includeC,
      filler,
      thickener,
      description,
    );
  }, [submitted, method, name, a, b, c, includeC, filler, thickener, description]);

  /** Actual-weights binder (A+B[+C]) — required for filler/thickener % converter. */
  const weightsBinderGrams = useMemo(() => {
    const aNum = parseNum(a);
    const bNum = parseNum(b);
    const cNum = includeC ? parseNum(c) : 0;
    if (!(aNum > 0) || !(bNum > 0)) return null;
    if (includeC && !(cNum > 0)) return null;
    return aNum + bNum + (includeC ? cNum : 0);
  }, [a, b, c, includeC]);

  const maxAdditives = MAX_RECIPE_ENTITIES - 2 - (includeC ? 1 : 0);
  const fillerDisabled =
    maxAdditives < 2 && fieldHasAmount(thickener) && !fieldHasAmount(filler);
  const thickenerDisabled =
    maxAdditives < 2 && fieldHasAmount(filler) && !fieldHasAmount(thickener);
  const resolvedFillerLabel = resolveFillerMaterialLabel(
    fillerMaterial,
    fillerCustomName,
    uiLanguage,
  );
  const resolvedThickenerLabel = resolveThickenerMaterialLabel(
    thickenerMaterial,
    thickenerCustomName,
    uiLanguage,
  );

  const fillerSelectValue =
    fillerMaterial === "custom" && fillerCustomName.trim()
      ? materialTempValue(fillerCustomName.trim())
      : fillerMaterial;
  const thickenerSelectValue =
    thickenerMaterial === "custom" && thickenerCustomName.trim()
      ? materialTempValue(thickenerCustomName.trim())
      : thickenerMaterial;

  const fillerSelectOptions = useMemo(() => {
    const presets = FILLER_MATERIAL_ORDER.filter((k) => k !== "custom").map(
      (kind) => ({
        value: kind,
        label: fillerMaterialOptionLabel(kind, uiLanguage),
      }),
    );
    const temps = fillerTempNames.map((n) => ({
      value: materialTempValue(n),
      label: n,
    }));
    return [
      ...presets,
      ...temps,
      {
        value: "custom",
        label: fillerMaterialOptionLabel("custom", uiLanguage),
      },
    ];
  }, [fillerTempNames, uiLanguage]);

  const thickenerSelectOptions = useMemo(() => {
    const presets = THICKENER_MATERIAL_ORDER.filter((k) => k !== "custom").map(
      (kind) => ({
        value: kind,
        label: thickenerMaterialOptionLabel(kind, uiLanguage),
      }),
    );
    const temps = thickenerTempNames.map((n) => ({
      value: materialTempValue(n),
      label: n,
    }));
    return [
      ...presets,
      ...temps,
      {
        value: "custom",
        label: thickenerMaterialOptionLabel("custom", uiLanguage),
      },
    ];
  }, [thickenerTempNames, uiLanguage]);

  const onFillerMaterialSelect = (next: string) => {
    if (next === "custom") {
      patchForm({
        fillerNaming: true,
        fillerNameDraft: "",
        dirty: true,
      });
      return;
    }
    const temp = materialTempName(next);
    if (temp != null) {
      patchForm({
        fillerMaterial: "custom",
        fillerCustomName: temp,
        fillerNaming: false,
        fillerNameDraft: "",
        dirty: true,
      });
      return;
    }
    patchForm({
      fillerMaterial: next as FillerMaterialKind,
      fillerNaming: false,
      fillerNameDraft: "",
      dirty: true,
    });
  };

  const onThickenerMaterialSelect = (next: string) => {
    if (next === "custom") {
      patchForm({
        thickenerNaming: true,
        thickenerNameDraft: "",
        dirty: true,
      });
      return;
    }
    const temp = materialTempName(next);
    if (temp != null) {
      patchForm({
        thickenerMaterial: "custom",
        thickenerCustomName: temp,
        thickenerNaming: false,
        thickenerNameDraft: "",
        dirty: true,
      });
      return;
    }
    patchForm({
      thickenerMaterial: next as ThickenerMaterialKind,
      thickenerNaming: false,
      thickenerNameDraft: "",
      dirty: true,
    });
  };

  const confirmFillerCustomName = () => {
    const trimmed = fillerNameDraft.trim();
    if (!trimmed) return;
    patchForm((prev) => ({
      ...prev,
      fillerMaterial: "custom",
      fillerCustomName: trimmed,
      fillerTempNames: prev.fillerTempNames.includes(trimmed)
        ? prev.fillerTempNames
        : [...prev.fillerTempNames, trimmed],
      fillerNaming: false,
      fillerNameDraft: "",
      dirty: true,
    }));
  };

  const cancelFillerCustomName = () => {
    patchForm({
      fillerNaming: false,
      fillerNameDraft: "",
    });
  };

  const confirmThickenerCustomName = () => {
    const trimmed = thickenerNameDraft.trim();
    if (!trimmed) return;
    patchForm((prev) => ({
      ...prev,
      thickenerMaterial: "custom",
      thickenerCustomName: trimmed,
      thickenerTempNames: prev.thickenerTempNames.includes(trimmed)
        ? prev.thickenerTempNames
        : [...prev.thickenerTempNames, trimmed],
      thickenerNaming: false,
      thickenerNameDraft: "",
      dirty: true,
    }));
  };

  const cancelThickenerCustomName = () => {
    patchForm({
      thickenerNaming: false,
      thickenerNameDraft: "",
    });
  };

  useEffect(() => {
    if (fillerDisabled && fillerNaming) {
      patchForm({ fillerNaming: false, fillerNameDraft: "" });
    }
  }, [fillerDisabled, fillerNaming]);

  useEffect(() => {
    if (thickenerDisabled && thickenerNaming) {
      patchForm({ thickenerNaming: false, thickenerNameDraft: "" });
    }
  }, [thickenerDisabled, thickenerNaming]);

  const preview = useMemo(() => {
    const cNum = includeC ? parseNum(c) : 0;
    if (method === "weights") {
      const input = {
        name: name.trim() || t("recipe.previewName"),
        nameSubline,
        description,
        a: parseNum(a),
        b: parseNum(b),
        c: includeC && cNum > 0 ? cNum : undefined,
        filler: parseNum(filler) || 0,
        thickener: parseNum(thickener) || 0,
        fillerLabel: resolvedFillerLabel,
        thickenerLabel: resolvedThickenerLabel,
        fillerMaterialKind: fillerMaterial,
        thickenerMaterialKind: thickenerMaterial,
      };
      // Preview without requiring a real name.
      if (!(input.a > 0) || !(input.b > 0)) return null;
      if (includeC && !(cNum > 0)) return null;
      if (input.filler < 0 || input.thickener < 0) return null;
      return blendingRecipeFromWeights(input);
    }
    const input = {
      name: name.trim() || t("recipe.previewName"),
      nameSubline,
      description,
      aParts: parseNum(a),
      bParts: parseNum(b),
      cParts: includeC && cNum > 0 ? cNum : undefined,
      fillerPercent: parseNum(filler) || 0,
      thickenerPercent: parseNum(thickener) || 0,
      initialBinderSum: scaledBinderSum,
      fillerLabel: resolvedFillerLabel,
      thickenerLabel: resolvedThickenerLabel,
      fillerMaterialKind: fillerMaterial,
      thickenerMaterialKind: thickenerMaterial,
    };
    if (!(input.aParts > 0) || !(input.bParts > 0)) return null;
    if (includeC && !(cNum > 0)) return null;
    if (input.fillerPercent < 0 || input.thickenerPercent < 0) return null;
    return blendingRecipeFromFormula(input);
  }, [
    method,
    name,
    nameSubline,
    description,
    a,
    b,
    c,
    includeC,
    filler,
    thickener,
    scaledBinderSum,
    resolvedFillerLabel,
    resolvedThickenerLabel,
    fillerMaterial,
    thickenerMaterial,
    t,
  ]);

  const switchMethod = (next: RecipeCreateMethod) => {
    if (next === method) return;
    // Keep each mode's fields independently — no conversion / wipe on switch.
    setMethod(next);
    setError(null);
    setSubmitted(false);
  };

  const buildRecipe = (): BlendingRecipe | null => {
    setSubmitted(true);
    const localErrors = collectFieldErrors(
      method,
      name,
      a,
      b,
      c,
      includeC,
      filler,
      thickener,
      description,
    );
    if (Object.keys(localErrors).length > 0) {
      if (localErrors.name) setError(t("recipe.errors.nameRequired"));
      else if (localErrors.description) {
        setError(
          validateRecipeCardDescription(description) ??
            t("recipe.errors.checkDescription"),
        );
        patchForm({ advancedOpen: true });
        window.setTimeout(() => focusCreateField("description"), 50);
        return null;
      } else if (localErrors.a || localErrors.b || localErrors.c) {
        setError(
          method === "formula"
            ? t("recipe.errors.partsPositive")
            : t("recipe.errors.abPositive"),
        );
      } else if (localErrors.filler || localErrors.thickener) {
        setError(
          method === "formula"
            ? t("recipe.errors.percentsNegative")
            : t("recipe.errors.fillersNegative"),
        );
      } else {
        setError(t("recipe.errors.checkFields"));
      }
      const focusKey = firstInvalidFieldKey(localErrors);
      if (focusKey && focusKey !== "description") focusCreateField(focusKey);
      return null;
    }

    const cNum = includeC ? parseNum(c) : 0;
    if (method === "weights") {
      const input = {
        name,
        nameSubline,
        description,
        a: parseNum(a),
        b: parseNum(b),
        c: includeC && cNum > 0 ? cNum : undefined,
        filler: parseNum(filler) || 0,
        thickener: parseNum(thickener) || 0,
        fillerLabel: resolvedFillerLabel,
        thickenerLabel: resolvedThickenerLabel,
        fillerMaterialKind: fillerMaterial,
        thickenerMaterialKind: thickenerMaterial,
      };
      const err = validateWeightsInput(input);
      if (err) {
        setError(err);
        focusCreateField(
          !(parseNum(a) > 0)
            ? "a"
            : !(parseNum(b) > 0)
              ? "b"
              : includeC && !(cNum > 0)
                ? "c"
                : "name",
        );
        return null;
      }
      setError(null);
      const recipe = blendingRecipeFromWeights(input);
      if (scaledBinderSum != null && scaledBinderSum > 0) {
        return { ...recipe, initialBinderSum: scaledBinderSum };
      }
      return recipe;
    }
    const input = {
      name,
      nameSubline,
      description,
      aParts: parseNum(a),
      bParts: parseNum(b),
      cParts: includeC && cNum > 0 ? cNum : undefined,
      fillerPercent: parseNum(filler) || 0,
      thickenerPercent: parseNum(thickener) || 0,
      initialBinderSum: scaledBinderSum,
      fillerLabel: resolvedFillerLabel,
      thickenerLabel: resolvedThickenerLabel,
      fillerMaterialKind: fillerMaterial,
      thickenerMaterialKind: thickenerMaterial,
    };
    const err = validateFormulaInput(input);
    if (err) {
      setError(err);
      focusCreateField(
        !(parseNum(a) > 0)
          ? "a"
          : !(parseNum(b) > 0)
            ? "b"
            : includeC && !(cNum > 0)
              ? "c"
              : "name",
      );
      return null;
    }
    setError(null);
    return blendingRecipeFromFormula(input);
  };

  const handleBack = () => {
    if (dirty) {
      const ok = window.confirm(t("recipe.discard"));
      if (!ok) return;
    }
    onBack();
  };

  const openRecBatchCalculator = () => {
    const recipe = buildRecipe();
    if (!recipe) return;
    const next =
      method === "formula" && scaledBinderSum == null
        ? { ...recipe, initialBinderSum: undefined }
        : recipe;
    setError(null);
    setScalePurpose("rec-batch");
    setDraftMixValues(undefined);
    setDraft(next);
    setPhase("scale");
  };

  const openEditWeightsCalculator = () => {
    if (method !== "weights") return;
    const aNum = parseNum(a);
    const bNum = parseNum(b);
    const cNum = includeC ? parseNum(c) : 0;
    if (!(aNum > 0) || !(bNum > 0) || (includeC && !(cNum > 0))) {
      setSubmitted(true);
      setError(t("recipe.errors.abPositive"));
      focusCreateField(
        !(aNum > 0) ? "a" : !(bNum > 0) ? "b" : "c",
      );
      return;
    }
    const fillNum = parseNum(filler);
    const tixNum = parseNum(thickener);
    const fillerG = Number.isFinite(fillNum) && fillNum > 0 ? fillNum : 0;
    const tixG = Number.isFinite(tixNum) && tixNum > 0 ? tixNum : 0;
    const cG = includeC && cNum > 0 ? cNum : 0;
    const recipe = blendingRecipeFromWeights({
      name: name.trim() || t("recipe.draftName"),
      nameSubline,
      description,
      a: aNum,
      b: bNum,
      c: cG > 0 ? cG : undefined,
      filler: fillerG,
      thickener: tixG,
      fillerLabel: resolvedFillerLabel,
      thickenerLabel: resolvedThickenerLabel,
      fillerMaterialKind: fillerMaterial,
      thickenerMaterialKind: thickenerMaterial,
    });
    const total = aNum + bNum + cG + fillerG + tixG;
    setError(null);
    setScalePurpose("edit-weights");
    setDraftMixValues([total, aNum, bNum, cG, tixG, fillerG]);
    setDraft(recipe);
    setPhase("scale");
  };

  const persistRecipe = (via: "library" | "session") => {
    if (via === "session" && !sessionId) {
      setError(t("recipe.errors.noSession"));
      return;
    }
    const recipe = buildRecipe();
    if (!recipe) return;
    if (via === "session") {
      addSessionRecipe(sessionId!, recipe);
    } else {
      addLibraryRecipe(recipe);
    }
    setForm((prev) => ({ ...prev, dirty: false }));
    onSaved(recipe, via);
  };

  const handleRecipeCreateCommit = (payload: RecipeCreateCommitPayload) => {
    if (scalePurpose === "edit-weights") {
      const vals = payload.values;
      const nextA = Math.max(0, Math.round(vals[1] ?? 0));
      const nextB = Math.max(0, Math.round(vals[2] ?? 0));
      const nextC = Math.max(0, Math.round(vals[3] ?? 0));
      const nextTix = Math.max(0, Math.round(vals[4] ?? 0));
      const nextFill = Math.max(0, Math.round(vals[5] ?? 0));
      setWeightsForm((prev) =>
        enforceEntityCap({
          ...prev,
          a: formatAmount(nextA),
          b: formatAmount(nextB),
          c: nextC > 0 ? formatAmount(nextC) : "",
          includeC: prev.includeC || nextC > 0,
          thickener: nextTix > 0 ? formatAmount(nextTix) : "",
          filler: nextFill > 0 ? formatAmount(nextFill) : "",
          bucketSelection: payload.bucketSelection,
          dirty: true,
        }),
      );
      setPhase("form");
      setDraft(null);
      setDraftMixValues(undefined);
      return;
    }
    const binderSum = payload.binderSum > 0 ? payload.binderSum : undefined;
    patchForm({
      scaledBinderSum: binderSum,
      bucketSelection: payload.bucketSelection,
      advancedOpen: true,
      dirty: true,
    });
    setPhase("form");
    setDraft(null);
    setDraftMixValues(undefined);
  };

  const updateMetaField = (
    key: "name" | "nameSubline" | "description",
    value: string,
  ) => {
    patchForm({ [key]: value, dirty: true });
    if (submitted) setError(null);
  };

  if (phase === "scale" && draft) {
    const mixer = (
      <BatchMixer
        embedded
        recipe={draft}
        recipes={[draft]}
        initialBinderSum={draft.initialBinderSum ?? 1000}
        initialValues={draftMixValues}
        initialBucketSelection={bucketSelection}
        onOpenNav={onMenuClick}
        recipeCreateMode={{
          sessionName:
            context.source === "session" ? sessionName : undefined,
          recipeLabel: recipeMenuLabel(draft, uiLanguage),
          purpose: scalePurpose,
          onCancel: () => {
            setPhase("form");
            setDraft(null);
            setDraftMixValues(undefined);
          },
          onCommit: handleRecipeCreateCommit,
        }}
      />
    );
    if (embedded) return mixer;
    return (
      <div className="mobile-shell">
        <div className="app-frame-host">{mixer}</div>
      </div>
    );
  }

  const frame = (
    <div
      className="app-frame relative flex flex-col overflow-hidden select-none h-full min-h-0"
      style={{ background: "var(--semantic-surface-app)" }}
    >
      <AppHeader
        title={t("recipe.createTitle")}
        onMenuClick={onMenuClick}
        onBack={handleBack}
        backLabel={
          context.source === "session"
            ? t("mixer.backToSession")
            : t("common.back")
        }
        backConfirmAction={
          context.source === "session"
            ? t("mixer.backToSessionConfirm")
            : t("common.goBack")
        }
        sessionChrome={context.source === "session"}
        subline={
          context.source === "session" ? (
            <RecipeHeaderSublineStack>
              <RecipeHeaderSubline>
                <span className="session-mode-chip">
                  <span className="session-mode-chip__dot" aria-hidden />
                  {t("recipe.sessionChip")}
                </span>
              </RecipeHeaderSubline>
            </RecipeHeaderSublineStack>
          ) : undefined
        }
      />

      <div className="destination-page__subnav app-gutter-x">
        <div
          className="catalog-hub__tabs"
          role="tablist"
          aria-label={t("recipe.methodAria")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={method === "formula"}
            className="catalog-hub__tab"
            data-active={method === "formula" ? "" : undefined}
            onClick={() => switchMethod("formula")}
          >
            {t("recipe.formula")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={method === "weights"}
            className="catalog-hub__tab"
            data-active={method === "weights" ? "" : undefined}
            onClick={() => switchMethod("weights")}
          >
            {t("recipe.actualWeights")}
          </button>
        </div>
      </div>

      <div className="create-recipe__scroll flex-1 min-h-0 overflow-y-auto overscroll-none app-gutter-x">
        <div className="create-recipe__body">
          <div className="create-recipe__start-from">
            <button
              type="button"
              className="create-recipe__secondary-btn"
              onClick={() => setStartFromOpen(true)}
            >
              {t("recipe.startFrom")}
            </button>
          </div>

          <Field
            label={t("recipe.name")}
            value={name}
            inputMode="text"
            required
            fieldKey="name"
            invalid={Boolean(fieldErrors.name)}
            onChange={(v) => updateMetaField("name", v)}
          />
          <Field
            label={t("recipe.subline")}
            value={nameSubline}
            placeholder={t("recipe.defaultSubline")}
            inputMode="text"
            onChange={(v) => updateMetaField("nameSubline", v)}
          />

          {method === "formula" ? (
            <>
              <Field
                label={t("recipe.resinA")}
                value={a}
                placeholder={t("recipe.placeholderPartsA")}
                suffix={partsUnitLabel(uiLanguage)}
                required
                fieldKey="a"
                invalid={Boolean(fieldErrors.a)}
                onChange={(v) => setComponentField("a", v)}
              />
              <Field
                label={t("recipe.hardenerB")}
                value={b}
                placeholder={t("recipe.placeholderPartsB")}
                suffix={partsUnitLabel(uiLanguage)}
                required
                fieldKey="b"
                invalid={Boolean(fieldErrors.b)}
                onChange={(v) => setComponentField("b", v)}
              />
              {includeC ? (
                <div className="create-recipe__component-c">
                  <Field
                    label={t("recipe.componentC")}
                    value={c}
                    placeholder={t("recipe.placeholderPartsC")}
                    suffix={partsUnitLabel(uiLanguage)}
                    required
                    fieldKey="c"
                    invalid={Boolean(fieldErrors.c)}
                    onChange={(v) => setComponentField("c", v)}
                  />
                  <button
                    type="button"
                    className="create-recipe__secondary-btn create-recipe__component-c-toggle"
                    onClick={removeComponentC}
                  >
                    {t("recipe.removeComponentC")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="create-recipe__secondary-btn create-recipe__component-c-toggle"
                  onClick={addComponentC}
                >
                  {t("recipe.addComponentC")}
                </button>
              )}
              <Field
                label={t("recipe.filler")}
                value={filler}
                placeholder={t("recipe.placeholderPercent")}
                suffix={t("recipe.percentOfBinder")}
                fieldKey="filler"
                invalid={Boolean(fieldErrors.filler)}
                disabled={fillerDisabled}
                onChange={(v) => setComponentField("filler", v)}
                nameSelect={{
                  value: fillerSelectValue,
                  options: fillerSelectOptions,
                  onChange: onFillerMaterialSelect,
                  naming: fillerNaming,
                  draftName: fillerNameDraft,
                  onDraftNameChange: (next) =>
                    patchForm({ fillerNameDraft: next, dirty: true }),
                  onConfirmCustom: confirmFillerCustomName,
                  onCancelCustom: cancelFillerCustomName,
                  customPlaceholder: t("recipe.customMaterialName"),
                  ariaLabel: t("recipe.fillerMaterialAria"),
                  confirmAria: t("recipe.confirmCustomMaterial"),
                  cancelAria: t("recipe.cancelCustomMaterial"),
                }}
              />
              <Field
                label={t("recipe.thickener")}
                value={thickener}
                placeholder={t("recipe.placeholderPercent")}
                suffix={t("recipe.percentOfBinder")}
                fieldKey="thickener"
                invalid={Boolean(fieldErrors.thickener)}
                disabled={thickenerDisabled}
                onChange={(v) => setComponentField("thickener", v)}
                nameSelect={{
                  value: thickenerSelectValue,
                  options: thickenerSelectOptions,
                  onChange: onThickenerMaterialSelect,
                  naming: thickenerNaming,
                  draftName: thickenerNameDraft,
                  onDraftNameChange: (next) =>
                    patchForm({ thickenerNameDraft: next, dirty: true }),
                  onConfirmCustom: confirmThickenerCustomName,
                  onCancelCustom: cancelThickenerCustomName,
                  customPlaceholder: t("recipe.customMaterialName"),
                  ariaLabel: t("recipe.thickenerMaterialAria"),
                  confirmAria: t("recipe.confirmCustomMaterial"),
                  cancelAria: t("recipe.cancelCustomMaterial"),
                }}
              />
            </>
          ) : (
            <>
              <Field
                label={t("recipe.resinA")}
                value={a}
                placeholder={t("recipe.placeholderGrams")}
                suffix="gram"
                required
                kgHelper
                fieldKey="a"
                invalid={Boolean(fieldErrors.a)}
                onChange={(v) => setComponentField("a", v)}
              />
              <Field
                label={t("recipe.hardenerB")}
                value={b}
                placeholder={t("recipe.placeholderGrams")}
                suffix="gram"
                required
                kgHelper
                fieldKey="b"
                invalid={Boolean(fieldErrors.b)}
                onChange={(v) => setComponentField("b", v)}
              />
              {includeC ? (
                <div className="create-recipe__component-c">
                  <Field
                    label={t("recipe.componentC")}
                    value={c}
                    placeholder={t("recipe.placeholderGrams")}
                    suffix="gram"
                    required
                    kgHelper
                    fieldKey="c"
                    invalid={Boolean(fieldErrors.c)}
                    onChange={(v) => setComponentField("c", v)}
                  />
                  <button
                    type="button"
                    className="create-recipe__secondary-btn create-recipe__component-c-toggle"
                    onClick={removeComponentC}
                  >
                    {t("recipe.removeComponentC")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="create-recipe__secondary-btn create-recipe__component-c-toggle"
                  onClick={addComponentC}
                >
                  {t("recipe.addComponentC")}
                </button>
              )}
              <Field
                label={t("recipe.filler")}
                value={filler}
                placeholder={t("recipe.placeholderGrams")}
                suffix="gram"
                kgHelper
                percentOfBinderHelper
                binderGrams={weightsBinderGrams}
                fieldKey="filler"
                invalid={Boolean(fieldErrors.filler)}
                disabled={fillerDisabled}
                onChange={(v) => setComponentField("filler", v)}
                nameSelect={{
                  value: fillerSelectValue,
                  options: fillerSelectOptions,
                  onChange: onFillerMaterialSelect,
                  naming: fillerNaming,
                  draftName: fillerNameDraft,
                  onDraftNameChange: (next) =>
                    patchForm({ fillerNameDraft: next, dirty: true }),
                  onConfirmCustom: confirmFillerCustomName,
                  onCancelCustom: cancelFillerCustomName,
                  customPlaceholder: t("recipe.customMaterialName"),
                  ariaLabel: t("recipe.fillerMaterialAria"),
                  confirmAria: t("recipe.confirmCustomMaterial"),
                  cancelAria: t("recipe.cancelCustomMaterial"),
                }}
              />
              <Field
                label={t("recipe.thickener")}
                value={thickener}
                placeholder={t("recipe.placeholderGrams")}
                suffix="gram"
                kgHelper
                percentOfBinderHelper
                binderGrams={weightsBinderGrams}
                fieldKey="thickener"
                invalid={Boolean(fieldErrors.thickener)}
                disabled={thickenerDisabled}
                onChange={(v) => setComponentField("thickener", v)}
                nameSelect={{
                  value: thickenerSelectValue,
                  options: thickenerSelectOptions,
                  onChange: onThickenerMaterialSelect,
                  naming: thickenerNaming,
                  draftName: thickenerNameDraft,
                  onDraftNameChange: (next) =>
                    patchForm({ thickenerNameDraft: next, dirty: true }),
                  onConfirmCustom: confirmThickenerCustomName,
                  onCancelCustom: cancelThickenerCustomName,
                  customPlaceholder: t("recipe.customMaterialName"),
                  ariaLabel: t("recipe.thickenerMaterialAria"),
                  confirmAria: t("recipe.confirmCustomMaterial"),
                  cancelAria: t("recipe.cancelCustomMaterial"),
                }}
              />
              <div className="create-recipe__weights-tools">
                <button
                  type="button"
                  className="create-recipe__secondary-btn"
                  disabled={weightsBinderGrams == null}
                  title={
                    weightsBinderGrams == null
                      ? t("recipe.enterABFirst")
                      : t("recipe.dialFormGrams")
                  }
                  onClick={openEditWeightsCalculator}
                  >
                  {t("recipe.dialFormGramsBtn")}
                </button>
                <p className="create-recipe__weights-tools-hint">
                  {weightsBinderGrams == null
                    ? t("recipe.enterABUnlock")
                    : parseNum(filler) > 0 || parseNum(thickener) > 0
                      ? t("recipe.weightsScaleHintFull")
                      : t("recipe.weightsScaleHintAB")}
                </p>
              </div>
            </>
          )}

          {preview ? (
            <div className="create-recipe__preview-block">
              <div className="create-recipe__preview-head">
                <span className="create-recipe__field-label">{t("recipe.formulaResult")}</span>
                <button
                  type="button"
                  className="create-recipe__preview-info"
                  aria-label={t("recipe.aboutFormula")}
                  aria-expanded={formulaInfoOpen}
                  onClick={() => setFormulaInfoOpen((open) => !open)}
                >
                  <InfoIcon size={15} />
                </button>
              </div>
              <p className="create-recipe__preview">
                {formatRecipeFormulaSummary(preview, uiLanguage)}
              </p>
              {formulaInfoOpen ? (
                <p className="create-recipe__preview-hint">{t("recipe.formulaInfo")}</p>
              ) : null}
            </div>
          ) : null}

          <div className="create-recipe__advanced">
            <button
              type="button"
              className="create-recipe__advanced-toggle"
              aria-expanded={advancedOpen}
              aria-label={
                advancedOpen
                  ? t("recipe.hideAdvanced")
                  : t("recipe.showAdvanced")
              }
              onClick={() => patchForm({ advancedOpen: !advancedOpen })}
            >
              <span>{t("recipe.advanced")}</span>
              <span
                className={`create-recipe__advanced-chevron${
                  advancedOpen ? " create-recipe__advanced-chevron--open" : ""
                }`}
                aria-hidden
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>

            {advancedOpen ? (
              <div className="create-recipe__advanced-body">
                <label
                  className={`create-recipe__field${
                    descriptionInvalid || fieldErrors.description
                      ? " create-recipe__field--invalid"
                      : ""
                  }`}
                  data-create-field="description"
                >
                  <span className="create-recipe__field-label-row">
                    <span className="create-recipe__field-label">{t("recipe.cardDescription")}</span>
                    <span className="create-recipe__field-meta" aria-live="polite">
                      {descriptionWordCount}/{RECIPE_CARD_DESCRIPTION_MAX_WORDS} words ·{" "}
                      {description.length}/{RECIPE_CARD_DESCRIPTION_MAX_CHARS}
                    </span>
                  </span>
                  <textarea
                    className={`${SHEET_FIELD_INPUT_CLASS} create-recipe__textarea`}
                    value={description}
                    rows={2}
                    maxLength={RECIPE_CARD_DESCRIPTION_MAX_CHARS}
                    placeholder={t("recipe.blurbPlaceholder")}
                    aria-invalid={
                      descriptionInvalid || fieldErrors.description || undefined
                    }
                    onChange={(e) => {
                      const next = e.target.value.slice(
                        0,
                        RECIPE_CARD_DESCRIPTION_MAX_CHARS,
                      );
                      updateMetaField("description", next);
                    }}
                  />
                </label>

                <div className="create-recipe__field">
                  <div className="create-recipe__preview-head">
                    <span className="create-recipe__field-label" id="create-recipe-bucket-label">
                      {t("recipe.bucket")}
                    </span>
                    <button
                      type="button"
                      className="create-recipe__preview-info"
                      aria-label={t("recipe.aboutBucket")}
                      aria-expanded={bucketInfoOpen}
                      onClick={() => setBucketInfoOpen((open) => !open)}
                    >
                      <InfoIcon size={15} />
                    </button>
                  </div>
                  {bucketInfoOpen ? (
                    <p className="create-recipe__preview-hint">{t("recipe.bucketInfo")}</p>
                  ) : null}
                  <div
                    className="create-recipe__bucket-options"
                    role="radiogroup"
                    aria-labelledby="create-recipe-bucket-label"
                  >
                    {CREATE_BUCKET_OPTIONS.map((option) => {
                      const selected = bucketSelection === option;
                      return (
                        <button
                          key={String(option)}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={`create-recipe__bucket-option${
                            selected ? " create-recipe__bucket-option--selected" : ""
                          }`}
                          onClick={() => {
                            patchForm({
                              bucketSelection: option,
                              dirty: true,
                            });
                          }}
                        >
                          {bucketOptionLabel(option, t("recipe.unlimited"))}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="create-recipe__advanced-actions">
                  <button
                    type="button"
                    className="create-recipe__secondary-btn"
                    onClick={openRecBatchCalculator}
                  >
                    {t("recipe.setRecommendedBatch")}
                  </button>
                  {scaledBinderSum != null ? (
                    <p className="create-recipe__advanced-status">
                      {t("recipe.recBatchBinderSet", {
                        amount: `${scaledBinderSum} g`,
                      })}
                      {bucketSelection === "none"
                        ? t("recipe.unlimitedBucket")
                        : null}
                    </p>
                  ) : (
                    <p className="create-recipe__advanced-status create-recipe__advanced-status--muted">
                      {t("recipe.noRecBatchYet")}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="create-recipe__error" role="alert">
              {error}
            </p>
          ) : null}

          <div
            className={`create-recipe__actions${
              showSessionSave ? " create-recipe__actions--row" : ""
            }`}
          >
            {showSessionSave ? (
              <button
                type="button"
                className="destination-page__primary-btn destination-page__primary-btn--session"
                onClick={() => persistRecipe("session")}
              >
                {t("recipe.saveInSession")}
              </button>
            ) : null}
            <button
              type="button"
              className={
                showSessionSave
                  ? "create-recipe__secondary-btn"
                  : "destination-page__primary-btn destination-page__primary-btn--form"
              }
              onClick={() => persistRecipe("library")}
            >
              {t("recipe.saveToLibrary")}
            </button>
          </div>
        </div>
      </div>

      <PickRecipeForMixSheet
        open={startFromOpen}
        onOpenChange={setStartFromOpen}
        libraryRecipes={libraryRecipes}
        sessionRecipes={sessionRecipesForPicker}
        title={t("recipe.startFrom")}
        openLabelFor={(recipe) =>
          t("sheets.recipePicker.useRecipe", {
            title: recipeMenuLabel(recipe, uiLanguage),
          })
        }
        onPick={applyRecipeAsCopy}
      />

      <ConfirmActionSheet
        open={pendingStartRecipe != null}
        onOpenChange={(open) => {
          if (!open) setPendingStartRecipe(null);
        }}
        title={t("recipe.replaceTitle")}
        body={t("recipe.replaceConfirm")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.ok")}
        onCancel={() => setPendingStartRecipe(null)}
        onConfirm={() => {
          if (!pendingStartRecipe) return;
          commitRecipeAsCopy(pendingStartRecipe);
          setPendingStartRecipe(null);
          setStartFromOpen(false);
        }}
      />
    </div>
  );

  if (embedded) return frame;

  return (
    <div className="mobile-shell">
      <div className="app-frame-host">{frame}</div>
    </div>
  );
}
