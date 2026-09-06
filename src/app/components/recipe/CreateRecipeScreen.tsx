import { useEffect, useId, useMemo, useRef, useState } from "react";
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
import { initialMixValues } from "../../domain/recipe/calc";
import {
  PRESET_RECIPES,
  recipeMenuLabel,
  type BlendingRecipe,
} from "../../domain/recipe/types";
import { useRecipeLibraryStore } from "../../recipe-library/store";
import { useSessionsStore } from "../../sessions/store";
import { CloseIcon, InfoIcon, ScaleIcon, SwipeAdjustIcon } from "../shared/ActionIcons";
import { AppHeader } from "../shared/AppHeader";
import {
  RecipeHeaderSubline,
  RecipeHeaderSublineStack,
} from "../mixer/RecipeZoneMeta";
import { PickRecipeForMixSheet } from "../sessions/PickRecipeForMixSheet";
import { GramSwipeInputSheet } from "../sheets/GramSwipeInputSheet";
import {
  SHEET_FIELD_INPUT_CLASS,
  sheetFieldInputStyle,
} from "../sheets/sheetChrome";

/** Prefill name when starting from an existing recipe: "Copy {original}". */
function copyRecipeName(recipe: BlendingRecipe): string {
  const original = recipe.name?.trim() || recipe.id;
  return `Copy ${original}`;
}

type FieldKey = "name" | "a" | "b" | "filler" | "thickener" | "description";

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

const PERCENT_NEEDS_BINDER =
  "Enter Resin A and Hardener B first to use % of binder.";

const FIELD_FOCUS_ORDER: FieldKey[] = [
  "name",
  "a",
  "b",
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
  suffix,
  inputMode = "decimal",
  required = false,
  invalid = false,
  kgHelper = false,
  percentOfBinderHelper = false,
  binderGrams = null,
  fieldKey,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  inputMode?: "decimal" | "text";
  required?: boolean;
  invalid?: boolean;
  /** Gram fields: open a unit converter that writes grams into this field. */
  kgHelper?: boolean;
  /** Filler/thickener: also offer % of binder in the converter sheet. */
  percentOfBinderHelper?: boolean;
  /** A+B grams when both are complete; null disables % mode. */
  binderGrams?: number | null;
  /** For scroll/focus on validation errors. */
  fieldKey?: FieldKey;
}) {
  const labelId = useId();
  const unitInputRef = useRef<HTMLInputElement>(null);
  const [unitOpen, setUnitOpen] = useState(false);
  const [unitMode, setUnitMode] = useState<UnitConverterMode>("kg");
  const [unitDraft, setUnitDraft] = useState("");
  const [swipeOpen, setSwipeOpen] = useState(false);

  const binderReady = binderGrams != null && binderGrams > 0;
  const showPercentTab = percentOfBinderHelper;

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
    setUnitOpen(false);
    setSwipeOpen(true);
  };

  const gramValue = (() => {
    const n = parseNum(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();

  const unitDraftInvalid =
    unitDraft.trim() !== "" &&
    unitDraft !== "." &&
    unitDraft !== "," &&
    !isValidUnitDraft(unitDraft);
  const unitCanApply =
    isValidUnitDraft(unitDraft) &&
    (unitMode === "kg" || binderReady);

  const unitSuffix = unitMode === "percent" ? "% of binder" : "kg";
  const scaleTitle = showPercentTab
    ? "Convert from kg or % of binder"
    : "Enter in kilograms";
  const previewGrams =
    unitMode === "percent"
      ? binderGrams != null
        ? percentDraftToGrams(unitDraft, binderGrams)
        : null
      : kgDraftToGrams(unitDraft);
  const labelKg = kgHelper ? gramsToKgDraft(value) : "";

  return (
    <div
      className={`create-recipe__field${invalid ? " create-recipe__field--invalid" : ""}${
        unitOpen ? " create-recipe__field--kg-open" : ""
      }`}
      data-create-field={fieldKey}
    >
      <div className="create-recipe__field-label-row">
        <span className="create-recipe__field-label" id={labelId}>
          {label}
          {required ? (
            <span className="create-recipe__field-required" aria-hidden>
              *
            </span>
          ) : null}
        </span>
        {kgHelper && labelKg !== "" ? (
          <span className="create-recipe__field-kg" aria-live="polite">
            {labelKg} kg
          </span>
        ) : null}
      </div>
      <div className="create-recipe__field-input-slot">
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
            inputMode={inputMode}
            required={required}
            aria-labelledby={labelId}
            aria-invalid={invalid || undefined}
            aria-required={required || undefined}
            onChange={(e) => {
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
                aria-label={`Dial ${label} with swipe`}
                aria-expanded={swipeOpen}
                aria-haspopup="dialog"
                title="Dial with swipe"
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
                onClick={() => {
                  if (unitOpen) closeUnitHelper();
                  else openUnitHelper();
                }}
              >
                <ScaleIcon size={16} />
              </button>
            </>
          ) : null}
        </span>

        {kgHelper && unitOpen ? (
          <>
            <button
              type="button"
              className="create-recipe__kg-backdrop"
              aria-label="Dismiss unit converter"
              onClick={closeUnitHelper}
            />
            <div
              className="create-recipe__kg-popover"
              role="dialog"
              aria-label={`Convert ${label}`}
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
                  aria-label="Converter type"
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
                    title={binderReady ? "% of binder" : PERCENT_NEEDS_BINDER}
                    onClick={() => selectUnitMode("percent")}
                  >
                    % of binder
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
                    aria-label={`${label} in grams (computed)`}
                    placeholder="—"
                  />
                  <span className="create-recipe__suffix create-recipe__suffix--grams" aria-hidden>
                    g
                  </span>
                </span>
              </div>
              {unitDraftInvalid ? (
                <p className="create-recipe__kg-error" role="alert">
                  Use digits and one decimal point (`.` or `,`).
                </p>
              ) : null}
              <div className="create-recipe__kg-actions">
                <button
                  type="button"
                  className="create-recipe__kg-action create-recipe__kg-action--apply"
                  disabled={!unitCanApply}
                  onClick={applyUnitHelper}
                >
                  Convert to grams
                </button>
                <button
                  type="button"
                  className="create-recipe__kg-action create-recipe__kg-action--cancel"
                  aria-label="Cancel"
                  onClick={() => setUnitOpen(false)}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

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

function bucketOptionLabel(option: BucketSelection): string {
  return option === "none" ? "Unlimited" : `${option} L`;
}

function collectFieldErrors(
  method: RecipeCreateMethod,
  name: string,
  a: string,
  b: string,
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
const FORMULA_INFO =
  "Locked mix ratio for this recipe. Filler and thickener are percent of binder (A + B), not of total mix weight.";
const BUCKET_INFO =
  "Pick a bucket for volume guidance, or leave unlimited. You can set a recommended batch size in the calculator either way.";

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
  const addLibraryRecipe = useRecipeLibraryStore((s) => s.addRecipe);
  const userRecipes = useRecipeLibraryStore((s) => s.userRecipes);
  const addSessionRecipe = useSessionsStore((s) => s.addSessionRecipe);
  const sessions = useSessionsStore((s) => s.sessions);

  const sessionId = context.source === "session" ? context.sessionId : null;
  const showSessionSave = context.source === "session";
  const sessionName =
    sessionId != null
      ? sessions.find((s) => s.id === sessionId)?.name ?? "Session"
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
  const [name, setName] = useState("");
  const [nameSubline, setNameSubline] = useState("Epoxy");
  const [description, setDescription] = useState("");
  const [a, setA] = useState(method === "formula" ? "2" : "");
  const [b, setB] = useState(method === "formula" ? "1" : "");
  const [filler, setFiller] = useState("");
  const [thickener, setThickener] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formulaInfoOpen, setFormulaInfoOpen] = useState(false);
  const [bucketInfoOpen, setBucketInfoOpen] = useState(false);
  const [startFromOpen, setStartFromOpen] = useState(false);

  /** Advanced: untouched = unlimited bucket, no binder baseline. */
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [bucketSelection, setBucketSelection] = useState<BucketSelection>("none");
  const [scaledBinderSum, setScaledBinderSum] = useState<number | undefined>(undefined);

  const [phase, setPhase] = useState<"form" | "scale">("form");
  const [scalePurpose, setScalePurpose] = useState<"rec-batch" | "edit-weights">(
    "rec-batch",
  );
  const [draft, setDraft] = useState<BlendingRecipe | null>(null);
  const [draftMixValues, setDraftMixValues] = useState<number[] | undefined>(
    undefined,
  );

  const markDirty = () => setDirty(true);

  const applyRecipeAsCopy = (recipe: BlendingRecipe): boolean => {
    if (dirty) {
      const ok = window.confirm(
        "Replace the current form with a copy of this recipe?",
      );
      if (!ok) return false;
    }
    const aParts = recipe.binderParts.find((p) => p.id === "A")?.parts ?? 2;
    const bParts = recipe.binderParts.find((p) => p.id === "B")?.parts ?? 1;
    const sandPct = recipe.binderPercents.find((p) => p.id === "SAND")?.percent;
    const tixPct = recipe.binderPercents.find((p) => p.id === "TIX")?.percent;
    const binder =
      recipe.initialBinderSum != null &&
      Number.isFinite(recipe.initialBinderSum) &&
      recipe.initialBinderSum > 0
        ? Math.round(recipe.initialBinderSum)
        : undefined;

    setMethod("formula");
    setName(copyRecipeName(recipe));
    setNameSubline(recipe.nameSubline?.trim() || "Epoxy");
    setDescription(recipe.description?.trim() ?? "");
    setA(formatAmount(aParts));
    setB(formatAmount(bParts));
    setFiller(sandPct != null && sandPct > 0 ? formatAmount(sandPct) : "");
    setThickener(tixPct != null && tixPct > 0 ? formatAmount(tixPct) : "");
    setScaledBinderSum(binder);
    if (binder != null || (recipe.description?.trim() ?? "") !== "") {
      setAdvancedOpen(true);
    }
    setError(null);
    setSubmitted(false);
    markDirty();
    return true;
  };

  const descriptionWordCount = countDescriptionWords(description);
  const descriptionLimitError = validateRecipeCardDescription(description);
  const descriptionInvalid = Boolean(
    descriptionLimitError &&
      (submitted || descriptionWordCount > RECIPE_CARD_DESCRIPTION_MAX_WORDS),
  );

  const fieldErrors = useMemo(() => {
    if (!submitted) return {} as Partial<Record<FieldKey, true>>;
    return collectFieldErrors(method, name, a, b, filler, thickener, description);
  }, [submitted, method, name, a, b, filler, thickener, description]);

  /** Actual-weights binder (A+B) — required for filler/thickener % converter. */
  const weightsBinderGrams = useMemo(() => {
    const aNum = parseNum(a);
    const bNum = parseNum(b);
    if (!(aNum > 0) || !(bNum > 0)) return null;
    return aNum + bNum;
  }, [a, b]);

  const preview = useMemo(() => {
    if (method === "weights") {
      const input = {
        name: name.trim() || "Preview",
        nameSubline,
        description,
        a: parseNum(a),
        b: parseNum(b),
        filler: parseNum(filler) || 0,
        thickener: parseNum(thickener) || 0,
      };
      // Preview without requiring a real name.
      if (!(input.a > 0) || !(input.b > 0)) return null;
      if (input.filler < 0 || input.thickener < 0) return null;
      return blendingRecipeFromWeights(input);
    }
    const input = {
      name: name.trim() || "Preview",
      nameSubline,
      description,
      aParts: parseNum(a),
      bParts: parseNum(b),
      fillerPercent: parseNum(filler) || 0,
      thickenerPercent: parseNum(thickener) || 0,
      initialBinderSum: scaledBinderSum,
    };
    if (!(input.aParts > 0) || !(input.bParts > 0)) return null;
    if (input.fillerPercent < 0 || input.thickenerPercent < 0) return null;
    return blendingRecipeFromFormula(input);
  }, [method, name, nameSubline, description, a, b, filler, thickener, scaledBinderSum]);

  const switchMethod = (next: RecipeCreateMethod) => {
    if (next === method) return;

    const aNum = parseNum(a);
    const bNum = parseNum(b);
    const fillNum = parseNum(filler);
    const tixNum = parseNum(thickener);
    const hasComponentInput =
      a.trim() !== "" ||
      b.trim() !== "" ||
      filler.trim() !== "" ||
      thickener.trim() !== "";

    if (next === "formula") {
      // Actual weights → Formula: convert grams to parts / % when A+B are valid.
      if (aNum > 0 && bNum > 0) {
        const recipe = blendingRecipeFromWeights({
          name: name.trim() || "Draft",
          nameSubline,
          description,
          a: aNum,
          b: bNum,
          filler: Number.isFinite(fillNum) && fillNum > 0 ? fillNum : 0,
          thickener: Number.isFinite(tixNum) && tixNum > 0 ? tixNum : 0,
        });
        const aParts = recipe.binderParts.find((p) => p.id === "A")?.parts ?? 2;
        const bParts = recipe.binderParts.find((p) => p.id === "B")?.parts ?? 1;
        const sandPct = recipe.binderPercents.find((p) => p.id === "SAND")?.percent;
        const tixPct = recipe.binderPercents.find((p) => p.id === "TIX")?.percent;
        setA(String(aParts));
        setB(String(bParts));
        setFiller(sandPct != null && sandPct > 0 ? formatAmount(sandPct) : "");
        setThickener(tixPct != null && tixPct > 0 ? formatAmount(tixPct) : "");
      } else if (hasComponentInput) {
        const ok = window.confirm(
          "Switch to Formula? Resin A and Hardener B must be set to convert grams — other component values will be reset.",
        );
        if (!ok) return;
        setA("2");
        setB("1");
        setFiller("");
        setThickener("");
      } else {
        setA((v) => v || "2");
        setB((v) => v || "1");
      }
    } else {
      // Formula → Actual weights: convert with rec. batch binder when available.
      if (
        aNum > 0 &&
        bNum > 0 &&
        scaledBinderSum != null &&
        scaledBinderSum > 0
      ) {
        const recipe = blendingRecipeFromFormula({
          name: name.trim() || "Draft",
          nameSubline,
          description,
          aParts: aNum,
          bParts: bNum,
          fillerPercent: Number.isFinite(fillNum) && fillNum > 0 ? fillNum : 0,
          thickenerPercent: Number.isFinite(tixNum) && tixNum > 0 ? tixNum : 0,
          initialBinderSum: scaledBinderSum,
        });
        const vals = initialMixValues(recipe, scaledBinderSum);
        setA(formatAmount(vals[1] ?? 0));
        setB(formatAmount(vals[2] ?? 0));
        setThickener((vals[3] ?? 0) > 0 ? formatAmount(vals[3] ?? 0) : "");
        setFiller((vals[4] ?? 0) > 0 ? formatAmount(vals[4] ?? 0) : "");
      } else if (hasComponentInput) {
        const ok = window.confirm(
          scaledBinderSum == null || !(scaledBinderSum > 0)
            ? "Switch to Actual weights? Without a rec. batch size, parts/% cannot be converted to grams and component fields will be cleared. Cancel and set rec. batch first to convert."
            : "Switch to Actual weights? Component values that cannot be converted will be cleared.",
        );
        if (!ok) return;
        setA("");
        setB("");
        setFiller("");
        setThickener("");
      }
    }

    setMethod(next);
    setError(null);
    setSubmitted(false);
    markDirty();
  };

  const buildRecipe = (): BlendingRecipe | null => {
    setSubmitted(true);
    const localErrors = collectFieldErrors(
      method,
      name,
      a,
      b,
      filler,
      thickener,
      description,
    );
    if (Object.keys(localErrors).length > 0) {
      if (localErrors.name) setError("Name is required");
      else if (localErrors.description) {
        setError(
          validateRecipeCardDescription(description) ??
            "Check the description field",
        );
        setAdvancedOpen(true);
        window.setTimeout(() => focusCreateField("description"), 50);
        return null;
      } else if (localErrors.a || localErrors.b) {
        setError(
          method === "formula"
            ? "A and B parts must be greater than 0"
            : "Resin (A) and Hardener (B) must be greater than 0",
        );
      } else if (localErrors.filler || localErrors.thickener) {
        setError(
          method === "formula"
            ? "Percents cannot be negative"
            : "Filler and thickener cannot be negative",
        );
      } else {
        setError("Check the highlighted fields");
      }
      const focusKey = firstInvalidFieldKey(localErrors);
      if (focusKey && focusKey !== "description") focusCreateField(focusKey);
      return null;
    }

    if (method === "weights") {
      const input = {
        name,
        nameSubline,
        description,
        a: parseNum(a),
        b: parseNum(b),
        filler: parseNum(filler) || 0,
        thickener: parseNum(thickener) || 0,
      };
      const err = validateWeightsInput(input);
      if (err) {
        setError(err);
        focusCreateField(
          !(parseNum(a) > 0) ? "a" : !(parseNum(b) > 0) ? "b" : "name",
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
      fillerPercent: parseNum(filler) || 0,
      thickenerPercent: parseNum(thickener) || 0,
      initialBinderSum: scaledBinderSum,
    };
    const err = validateFormulaInput(input);
    if (err) {
      setError(err);
      focusCreateField(
        !(parseNum(a) > 0) ? "a" : !(parseNum(b) > 0) ? "b" : "name",
      );
      return null;
    }
    setError(null);
    return blendingRecipeFromFormula(input);
  };

  const handleBack = () => {
    if (dirty) {
      const ok = window.confirm("Discard this recipe?");
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
    if (!(aNum > 0) || !(bNum > 0)) {
      setSubmitted(true);
      setError("Resin (A) and Hardener (B) must be greater than 0");
      focusCreateField(!(aNum > 0) ? "a" : "b");
      return;
    }
    const fillNum = parseNum(filler);
    const tixNum = parseNum(thickener);
    const fillerG = Number.isFinite(fillNum) && fillNum > 0 ? fillNum : 0;
    const tixG = Number.isFinite(tixNum) && tixNum > 0 ? tixNum : 0;
    const recipe = blendingRecipeFromWeights({
      name: name.trim() || "Draft",
      nameSubline,
      description,
      a: aNum,
      b: bNum,
      filler: fillerG,
      thickener: tixG,
    });
    const total = aNum + bNum + fillerG + tixG;
    setError(null);
    setScalePurpose("edit-weights");
    setDraftMixValues([total, aNum, bNum, tixG, fillerG]);
    setDraft(recipe);
    setPhase("scale");
  };

  const persistRecipe = (via: "library" | "session") => {
    if (via === "session" && !sessionId) {
      setError("No active session — create or open a session first");
      return;
    }
    const recipe = buildRecipe();
    if (!recipe) return;
    if (via === "session") {
      addSessionRecipe(sessionId!, recipe);
    } else {
      addLibraryRecipe(recipe);
    }
    setDirty(false);
    onSaved(recipe, via);
  };

  const handleRecipeCreateCommit = (payload: RecipeCreateCommitPayload) => {
    if (scalePurpose === "edit-weights") {
      const vals = payload.values;
      const nextA = Math.max(0, Math.round(vals[1] ?? 0));
      const nextB = Math.max(0, Math.round(vals[2] ?? 0));
      const nextTix = Math.max(0, Math.round(vals[3] ?? 0));
      const nextFill = Math.max(0, Math.round(vals[4] ?? 0));
      setA(formatAmount(nextA));
      setB(formatAmount(nextB));
      setThickener(nextTix > 0 ? formatAmount(nextTix) : "");
      setFiller(nextFill > 0 ? formatAmount(nextFill) : "");
      setBucketSelection(payload.bucketSelection);
      setPhase("form");
      setDraft(null);
      setDraftMixValues(undefined);
      markDirty();
      return;
    }
    const binderSum = payload.binderSum > 0 ? payload.binderSum : undefined;
    setScaledBinderSum(binderSum);
    setBucketSelection(payload.bucketSelection);
    setAdvancedOpen(true);
    setPhase("form");
    setDraft(null);
    setDraftMixValues(undefined);
    markDirty();
  };

  const updateField = (key: FieldKey, value: string, setter: (v: string) => void) => {
    setter(value);
    markDirty();
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
          recipeLabel: recipeMenuLabel(draft),
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
        title="Create recipe"
        onMenuClick={onMenuClick}
        onBack={handleBack}
        backLabel={
          context.source === "session" ? "Back to session" : "Back"
        }
        backConfirmAction={
          context.source === "session" ? "BACK TO SESSION" : "GO BACK"
        }
        sessionChrome={context.source === "session"}
        subline={
          context.source === "session" ? (
            <RecipeHeaderSublineStack>
              <RecipeHeaderSubline>
                <span className="session-mode-chip">
                  <span className="session-mode-chip__dot" aria-hidden />
                  Session recipe
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
          aria-label="Recipe method"
        >
          <button
            type="button"
            role="tab"
            aria-selected={method === "formula"}
            className="catalog-hub__tab"
            data-active={method === "formula" ? "" : undefined}
            onClick={() => switchMethod("formula")}
          >
            Formula
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={method === "weights"}
            className="catalog-hub__tab"
            data-active={method === "weights" ? "" : undefined}
            onClick={() => switchMethod("weights")}
          >
            Actual weights (grams)
          </button>
        </div>
      </div>

      <div className="create-recipe__start-from app-gutter-x">
        <button
          type="button"
          className="create-recipe__secondary-btn"
          onClick={() => setStartFromOpen(true)}
        >
          Start from recipe
        </button>
      </div>

      <div className="create-recipe__scroll flex-1 min-h-0 overflow-y-auto overscroll-none app-gutter-x">
        <div className="create-recipe__body">
          <p className="create-recipe__lede">
            {method === "formula"
              ? "Define A:B parts and filler / thickener as % of binder."
              : (
                <>
                  Enter measured{" "}
                  <span className="create-recipe__lede-emphasis">grams</span>
                  {" "}— the formula is derived automatically.
                </>
              )}
          </p>

          <Field
            label="Name"
            value={name}
            inputMode="text"
            required
            fieldKey="name"
            invalid={Boolean(fieldErrors.name)}
            onChange={(v) => updateField("name", v, setName)}
          />
          <Field
            label="Subline"
            value={nameSubline}
            inputMode="text"
            onChange={(v) => {
              setNameSubline(v);
              markDirty();
            }}
          />

          {method === "formula" ? (
            <>
              <Field
                label="Resin A"
                value={a}
                suffix="parts"
                required
                fieldKey="a"
                invalid={Boolean(fieldErrors.a)}
                onChange={(v) => updateField("a", v, setA)}
              />
              <Field
                label="Hardener B"
                value={b}
                suffix="parts"
                required
                fieldKey="b"
                invalid={Boolean(fieldErrors.b)}
                onChange={(v) => updateField("b", v, setB)}
              />
              <Field
                label="Filler"
                value={filler}
                suffix="% of binder"
                fieldKey="filler"
                invalid={Boolean(fieldErrors.filler)}
                onChange={(v) => updateField("filler", v, setFiller)}
              />
              <Field
                label="Thickener"
                value={thickener}
                suffix="% of binder"
                fieldKey="thickener"
                invalid={Boolean(fieldErrors.thickener)}
                onChange={(v) => updateField("thickener", v, setThickener)}
              />
            </>
          ) : (
            <>
              <Field
                label="Resin A"
                value={a}
                suffix="gram"
                required
                kgHelper
                fieldKey="a"
                invalid={Boolean(fieldErrors.a)}
                onChange={(v) => updateField("a", v, setA)}
              />
              <Field
                label="Hardener B"
                value={b}
                suffix="gram"
                required
                kgHelper
                fieldKey="b"
                invalid={Boolean(fieldErrors.b)}
                onChange={(v) => updateField("b", v, setB)}
              />
              <Field
                label="Filler"
                value={filler}
                suffix="gram"
                kgHelper
                percentOfBinderHelper
                binderGrams={weightsBinderGrams}
                fieldKey="filler"
                invalid={Boolean(fieldErrors.filler)}
                onChange={(v) => updateField("filler", v, setFiller)}
              />
              <Field
                label="Thickener"
                value={thickener}
                suffix="gram"
                kgHelper
                percentOfBinderHelper
                binderGrams={weightsBinderGrams}
                fieldKey="thickener"
                invalid={Boolean(fieldErrors.thickener)}
                onChange={(v) => updateField("thickener", v, setThickener)}
              />
              <div className="create-recipe__weights-tools">
                <button
                  type="button"
                  className="create-recipe__secondary-btn"
                  disabled={weightsBinderGrams == null}
                  title={
                    weightsBinderGrams == null
                      ? "Enter Resin A and Hardener B first"
                      : "Dial form grams in the calculator (does not set rec. batch)"
                  }
                  onClick={openEditWeightsCalculator}
                >
                  Dial form grams
                </button>
                <p className="create-recipe__weights-tools-hint">
                  {weightsBinderGrams == null
                    ? "Enter Resin A and Hardener B to unlock the calculator."
                    : parseNum(filler) > 0 || parseNum(thickener) > 0
                      ? "Opens the mixer to scale this batch, then writes grams back here. Does not set rec. batch."
                      : "Opens the mixer to scale A:B. Add filler/thickener grams first if you want to dial those too. Does not set rec. batch."}
                </p>
              </div>
            </>
          )}

          {preview ? (
            <div className="create-recipe__preview-block">
              <div className="create-recipe__preview-head">
                <span className="create-recipe__field-label">Formula result</span>
                <button
                  type="button"
                  className="create-recipe__preview-info"
                  aria-label="About formula summary"
                  aria-expanded={formulaInfoOpen}
                  onClick={() => setFormulaInfoOpen((open) => !open)}
                >
                  <InfoIcon size={15} />
                </button>
              </div>
              <p className="create-recipe__preview">
                {formatRecipeFormulaSummary(preview)}
              </p>
              {formulaInfoOpen ? (
                <p className="create-recipe__preview-hint">{FORMULA_INFO}</p>
              ) : null}
            </div>
          ) : null}

          <div className="create-recipe__advanced">
            <button
              type="button"
              className="create-recipe__advanced-toggle"
              aria-expanded={advancedOpen}
              aria-label={advancedOpen ? "Hide advanced options" : "Show advanced options"}
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <span>Advanced</span>
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
                    <span className="create-recipe__field-label">Card description</span>
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
                    placeholder="Short blurb on the recipe card (optional)"
                    aria-invalid={
                      descriptionInvalid || fieldErrors.description || undefined
                    }
                    onChange={(e) => {
                      const next = e.target.value.slice(
                        0,
                        RECIPE_CARD_DESCRIPTION_MAX_CHARS,
                      );
                      setDescription(next);
                      markDirty();
                    }}
                  />
                </label>

                <div className="create-recipe__field">
                  <div className="create-recipe__preview-head">
                    <span className="create-recipe__field-label" id="create-recipe-bucket-label">
                      Bucket
                    </span>
                    <button
                      type="button"
                      className="create-recipe__preview-info"
                      aria-label="About bucket and rec. batch"
                      aria-expanded={bucketInfoOpen}
                      onClick={() => setBucketInfoOpen((open) => !open)}
                    >
                      <InfoIcon size={15} />
                    </button>
                  </div>
                  {bucketInfoOpen ? (
                    <p className="create-recipe__preview-hint">{BUCKET_INFO}</p>
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
                            setBucketSelection(option);
                            markDirty();
                          }}
                        >
                          {bucketOptionLabel(option)}
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
                    Set recommended batch
                  </button>
                  {scaledBinderSum != null ? (
                    <p className="create-recipe__advanced-status">
                      Rec. batch binder set: {scaledBinderSum} g
                      {bucketSelection === "none" ? " · Unlimited bucket" : null}
                    </p>
                  ) : (
                    <p className="create-recipe__advanced-status create-recipe__advanced-status--muted">
                      No rec. batch size set yet
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
                Save in session
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
              Save to library
            </button>
          </div>
        </div>
      </div>

      <PickRecipeForMixSheet
        open={startFromOpen}
        onOpenChange={setStartFromOpen}
        libraryRecipes={libraryRecipes}
        sessionRecipes={sessionRecipesForPicker}
        title="Start from recipe"
        openLabelFor={(recipe) => `Use ${recipeMenuLabel(recipe)}`}
        onPick={applyRecipeAsCopy}
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
