import { useMemo, useState } from "react";
import {
  blendingRecipeFromFormula,
  blendingRecipeFromWeights,
  formatRecipeFormulaSummary,
  validateFormulaInput,
  validateWeightsInput,
  type CreateRecipeEntryContext,
  type RecipeCreateMethod,
} from "../../domain/recipe/createFromInputs";
import type { BlendingRecipe } from "../../domain/recipe/types";
import { useRecipeLibraryStore } from "../../recipe-library/store";
import { useSessionsStore } from "../../sessions/store";
import { AppHeader } from "../shared/AppHeader";
import {
  RecipeHeaderSubline,
  RecipeHeaderSublineStack,
} from "../mixer/RecipeZoneMeta";
import {
  SHEET_FIELD_INPUT_CLASS,
  sheetFieldInputStyle,
} from "../sheets/sheetChrome";

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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  inputMode?: "decimal" | "text";
}) {
  return (
    <label className="create-recipe__field">
      <span className="create-recipe__field-label">{label}</span>
      <span className="create-recipe__field-row">
        <input
          className={`${SHEET_FIELD_INPUT_CLASS} create-recipe__input`}
          style={sheetFieldInputStyle({ flex: 1 })}
          value={value}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix ? <span className="create-recipe__suffix">{suffix}</span> : null}
      </span>
    </label>
  );
}

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
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);

  const sessionId =
    context.source === "session" ? context.sessionId : activeSessionId;
  const canSaveInSession = sessionId != null;

  const [method, setMethod] = useState<RecipeCreateMethod>("formula");
  const [name, setName] = useState("");
  const [nameSubline, setNameSubline] = useState("Epoxy");
  const [a, setA] = useState(method === "formula" ? "2" : "");
  const [b, setB] = useState(method === "formula" ? "1" : "");
  const [filler, setFiller] = useState("");
  const [thickener, setThickener] = useState("");
  const [binderRef, setBinderRef] = useState("1500");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  const preview = useMemo(() => {
    if (method === "weights") {
      const input = {
        name: name || "Preview",
        nameSubline,
        a: parseNum(a),
        b: parseNum(b),
        filler: parseNum(filler) || 0,
        thickener: parseNum(thickener) || 0,
      };
      if (validateWeightsInput(input)) return null;
      return blendingRecipeFromWeights(input);
    }
    const input = {
      name: name || "Preview",
      nameSubline,
      aParts: parseNum(a),
      bParts: parseNum(b),
      fillerPercent: parseNum(filler) || 0,
      thickenerPercent: parseNum(thickener) || 0,
      initialBinderSum: parseNum(binderRef) || undefined,
    };
    if (validateFormulaInput(input)) return null;
    return blendingRecipeFromFormula(input);
  }, [method, name, nameSubline, a, b, filler, thickener, binderRef]);

  const switchMethod = (next: RecipeCreateMethod) => {
    setMethod(next);
    setError(null);
    markDirty();
    if (next === "formula") {
      setA((v) => v || "2");
      setB((v) => v || "1");
    }
  };

  const buildRecipe = (): BlendingRecipe | null => {
    if (method === "weights") {
      const input = {
        name,
        nameSubline,
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
      return blendingRecipeFromWeights(input);
    }
    const input = {
      name,
      nameSubline,
      aParts: parseNum(a),
      bParts: parseNum(b),
      fillerPercent: parseNum(filler) || 0,
      thickenerPercent: parseNum(thickener) || 0,
      initialBinderSum: parseNum(binderRef) || undefined,
    };
    const err = validateFormulaInput(input);
    if (err) {
      setError(err);
      return null;
    }
    return blendingRecipeFromFormula(input);
  };

  const handleBack = () => {
    if (dirty) {
      const ok = window.confirm("Discard this recipe?");
      if (!ok) return;
    }
    onBack();
  };

  const saveLibrary = () => {
    const recipe = buildRecipe();
    if (!recipe) return;
    addLibraryRecipe(recipe);
    setDirty(false);
    onSaved(recipe, "library");
  };

  const saveSession = () => {
    if (!sessionId) {
      setError("No active session — create or open a session first");
      return;
    }
    const recipe = buildRecipe();
    if (!recipe) return;
    addSessionRecipe(sessionId, recipe);
    setDirty(false);
    onSaved(recipe, "session");
  };

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
            onChange={(v) => {
              setName(v);
              markDirty();
            }}
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
                onChange={(v) => {
                  setA(v);
                  markDirty();
                }}
              />
              <Field
                label="Hardener B"
                value={b}
                suffix="parts"
                onChange={(v) => {
                  setB(v);
                  markDirty();
                }}
              />
              <Field
                label="Filler"
                value={filler}
                suffix="% of binder"
                onChange={(v) => {
                  setFiller(v);
                  markDirty();
                }}
              />
              <Field
                label="Thickener"
                value={thickener}
                suffix="% of binder"
                onChange={(v) => {
                  setThickener(v);
                  markDirty();
                }}
              />
              <Field
                label="Binder reference"
                value={binderRef}
                suffix="g"
                onChange={(v) => {
                  setBinderRef(v);
                  markDirty();
                }}
              />
            </>
          ) : (
            <>
              <Field
                label="Resin A"
                value={a}
                suffix="g"
                onChange={(v) => {
                  setA(v);
                  markDirty();
                }}
              />
              <Field
                label="Hardener B"
                value={b}
                suffix="g"
                onChange={(v) => {
                  setB(v);
                  markDirty();
                }}
              />
              <Field
                label="Filler"
                value={filler}
                suffix="g"
                onChange={(v) => {
                  setFiller(v);
                  markDirty();
                }}
              />
              <Field
                label="Thickener"
                value={thickener}
                suffix="g"
                onChange={(v) => {
                  setThickener(v);
                  markDirty();
                }}
              />
            </>
          )}

          {preview ? (
            <p className="create-recipe__preview">
              {formatRecipeFormulaSummary(preview)}
            </p>
          ) : null}

          {error ? <p className="create-recipe__error">{error}</p> : null}
        </div>
      </div>

      <div className="create-recipe__dock app-gutter-x">
        <div className="create-recipe__actions">
          {context.source === "session" || canSaveInSession ? (
            <button
              type="button"
              className="destination-page__primary-btn destination-page__primary-btn--session"
              onClick={saveSession}
            >
              Save in session
            </button>
          ) : null}
          <button
            type="button"
            className={
              context.source === "session" || canSaveInSession
                ? "create-recipe__secondary-btn"
                : "destination-page__primary-btn"
            }
            onClick={saveLibrary}
          >
            Save to library
          </button>
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
