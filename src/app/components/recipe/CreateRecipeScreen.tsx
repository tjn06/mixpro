import { useMemo, useState } from "react";
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
  recipeMenuLabel,
  type BlendingRecipe,
} from "../../domain/recipe/types";
import { useRecipeLibraryStore } from "../../recipe-library/store";
import { useSessionsStore } from "../../sessions/store";
import { InfoIcon } from "../shared/ActionIcons";
import { AppHeader } from "../shared/AppHeader";
import {
  RecipeHeaderSubline,
  RecipeHeaderSublineStack,
} from "../mixer/RecipeZoneMeta";
import {
  SHEET_FIELD_INPUT_CLASS,
  sheetFieldInputStyle,
} from "../sheets/sheetChrome";

type FieldKey = "name" | "a" | "b" | "filler" | "thickener" | "description";

function parseNum(raw: string): number {
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function Field({
  label,
  value,
  onChange,
  suffix,
  inputMode = "decimal",
  required = false,
  invalid = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  inputMode?: "decimal" | "text";
  required?: boolean;
  invalid?: boolean;
}) {
  return (
    <label className={`create-recipe__field${invalid ? " create-recipe__field--invalid" : ""}`}>
      <span className="create-recipe__field-label-row">
        <span className="create-recipe__field-label">{label}</span>
        {required ? (
          <span className="create-recipe__field-required" aria-hidden>
            Required
          </span>
        ) : null}
      </span>
      <span
        className={`create-recipe__control${
          invalid ? " create-recipe__control--invalid" : ""
        }${suffix ? " create-recipe__control--with-suffix" : ""}`}
      >
        <input
          className={`${SHEET_FIELD_INPUT_CLASS} create-recipe__input`}
          style={sheetFieldInputStyle({ flex: 1, minWidth: 0 })}
          value={value}
          inputMode={inputMode}
          required={required}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix ? (
          <span className="create-recipe__suffix" aria-hidden>
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
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
  const addSessionRecipe = useSessionsStore((s) => s.addSessionRecipe);
  const sessions = useSessionsStore((s) => s.sessions);

  const sessionId = context.source === "session" ? context.sessionId : null;
  const showSessionSave = context.source === "session";
  const sessionName =
    sessionId != null
      ? sessions.find((s) => s.id === sessionId)?.name ?? "Session"
      : undefined;

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

  /** Advanced: untouched = unlimited bucket, no binder baseline. */
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [bucketSelection, setBucketSelection] = useState<BucketSelection>("none");
  const [scaledBinderSum, setScaledBinderSum] = useState<number | undefined>(undefined);

  const [phase, setPhase] = useState<"form" | "scale">("form");
  const [draft, setDraft] = useState<BlendingRecipe | null>(null);

  const markDirty = () => setDirty(true);

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
    setMethod(next);
    setError(null);
    setSubmitted(false);
    markDirty();
    if (next === "formula") {
      setA((v) => v || "2");
      setB((v) => v || "1");
    }
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
    setDraft(next);
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
    const binderSum = payload.binderSum > 0 ? payload.binderSum : undefined;
    setScaledBinderSum(binderSum);
    setBucketSelection(payload.bucketSelection);
    setAdvancedOpen(true);
    setPhase("form");
    setDraft(null);
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
        initialBucketSelection={bucketSelection}
        onOpenNav={onMenuClick}
        recipeCreateMode={{
          sessionName:
            context.source === "session" ? sessionName : undefined,
          recipeLabel: recipeMenuLabel(draft),
          onCancel: () => {
            setPhase("form");
            setDraft(null);
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
            Actual weights
          </button>
        </div>
      </div>

      <div className="create-recipe__scroll flex-1 min-h-0 overflow-y-auto overscroll-none app-gutter-x">
        <div className="create-recipe__body">
          <p className="create-recipe__lede">
            {method === "formula"
              ? "Define A:B parts and filler / thickener as % of binder."
              : "Enter measured grams — the formula is derived automatically."}
          </p>

          <Field
            label="Name"
            value={name}
            inputMode="text"
            required
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
                invalid={Boolean(fieldErrors.a)}
                onChange={(v) => updateField("a", v, setA)}
              />
              <Field
                label="Hardener B"
                value={b}
                suffix="parts"
                required
                invalid={Boolean(fieldErrors.b)}
                onChange={(v) => updateField("b", v, setB)}
              />
              <Field
                label="Filler"
                value={filler}
                suffix="% of binder"
                invalid={Boolean(fieldErrors.filler)}
                onChange={(v) => updateField("filler", v, setFiller)}
              />
              <Field
                label="Thickener"
                value={thickener}
                suffix="% of binder"
                invalid={Boolean(fieldErrors.thickener)}
                onChange={(v) => updateField("thickener", v, setThickener)}
              />
            </>
          ) : (
            <>
              <Field
                label="Resin A"
                value={a}
                suffix="g"
                required
                invalid={Boolean(fieldErrors.a)}
                onChange={(v) => updateField("a", v, setA)}
              />
              <Field
                label="Hardener B"
                value={b}
                suffix="g"
                required
                invalid={Boolean(fieldErrors.b)}
                onChange={(v) => updateField("b", v, setB)}
              />
              <Field
                label="Filler"
                value={filler}
                suffix="g"
                invalid={Boolean(fieldErrors.filler)}
                onChange={(v) => updateField("filler", v, setFiller)}
              />
              <Field
                label="Thickener"
                value={thickener}
                suffix="g"
                invalid={Boolean(fieldErrors.thickener)}
                onChange={(v) => updateField("thickener", v, setThickener)}
              />
            </>
          )}

          {preview ? (
            <div className="create-recipe__preview-block">
              <div className="create-recipe__preview-head">
                <span className="create-recipe__field-label">Formula</span>
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
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <span>Advanced</span>
              <span
                className={`create-recipe__advanced-chevron${
                  advancedOpen ? " create-recipe__advanced-chevron--open" : ""
                }`}
                aria-hidden
              >
                ▾
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
                    Set rec. batch in calculator
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
    </div>
  );

  if (embedded) return frame;

  return (
    <div className="mobile-shell">
      <div className="app-frame-host">{frame}</div>
    </div>
  );
}
