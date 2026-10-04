import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatRepairMassGrams } from "../../domain/repair/format";
import {
  buildRepairPackagingReport,
  EPOXY_PACKAGE_PRESETS_L,
  formatPackagePlanPhrase,
  formatRepairPackagingReportText,
  type PackageFractionHint,
  type PackagePlan,
  SAND_PACKAGE_PRESETS_KG,
} from "../../domain/repair/packaging";
import { getIngredientLabel } from "../../domain/recipe/calc";
import type { BlendingRecipe } from "../../domain/recipe/types";
import type { AppLanguage } from "../../i18n/language";
import { useSettingsStore } from "../../settings/store";
import { CloseIcon, SavedIcon } from "../shared/ActionIcons";
import { cv } from "../../ui/tokens";

type SizeMode = "preset" | "custom";

function fractionKey(
  hint: Exclude<PackageFractionHint, "NONE" | "CUSTOM">,
): string {
  switch (hint) {
    case "QUARTER":
      return "repair.packaging.fraction.quarter";
    case "THIRD":
      return "repair.packaging.fraction.third";
    case "HALF":
      return "repair.packaging.fraction.half";
    case "TWO_THIRDS":
      return "repair.packaging.fraction.twoThirds";
    case "THREE_QUARTERS":
      return "repair.packaging.fraction.threeQuarters";
  }
}

function usePackagePhrase(
  t: (key: string, opts?: Record<string, string | number>) => string,
) {
  return (
    plan: PackagePlan,
    sizeLabel: string,
    formatAmount: (n: number) => string,
  ) =>
    formatPackagePlanPhrase(plan, sizeLabel, formatAmount, {
      exactFull: (count, size) =>
        t("repair.packaging.phrase.exactFull", { count, size }),
      fullPlusHint: (count, size, hint) =>
        t("repair.packaging.phrase.fullPlusHint", {
          count,
          size,
          fraction: t(fractionKey(hint)),
        }),
      fullPlusAmount: (count, size, amount) =>
        t("repair.packaging.phrase.fullPlusAmount", { count, size, amount }),
      partialOnlyHint: (hint, size) =>
        t("repair.packaging.phrase.partialOnlyHint", {
          fraction: t(fractionKey(hint)),
          size,
        }),
      partialOnlyAmount: (amount, size) =>
        t("repair.packaging.phrase.partialOnlyAmount", { amount, size }),
    });
}

/**
 * Preset chips that morph into an inline custom editor (input + close + accept).
 * Keeps layout height stable — no second row under the segmented control.
 */
function PackageSizePicker({
  label,
  presets,
  formatPreset,
  unit,
  mode,
  presetValue,
  customValue,
  onSelectPreset,
  onCommitCustom,
}: {
  label: string;
  presets: readonly number[];
  formatPreset: (n: number) => string;
  unit: string;
  mode: SizeMode;
  presetValue: number;
  customValue: number;
  onSelectPreset: (n: number) => void;
  onCommitCustom: (n: number) => void;
}) {
  const { t } = useTranslation("common");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const openEditor = () => {
    const seed = mode === "custom" ? customValue : presetValue;
    setDraft(String(seed));
    setEditing(true);
  };

  const closeEditor = () => {
    setEditing(false);
    setDraft("");
  };

  const acceptEditor = () => {
    const n = Number(draft.replace(",", "."));
    if (!Number.isFinite(n) || n < 0.1) return;
    onCommitCustom(Math.round(n * 10) / 10);
    closeEditor();
  };

  const draftOk = (() => {
    const n = Number(draft.replace(",", "."));
    return Number.isFinite(n) && n >= 0.1;
  })();

  useEffect(() => {
    if (!editing) return;
    const id = window.setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    }, 40);
    return () => window.clearTimeout(id);
  }, [editing]);

  return (
    <div className="repair-field">
      <span className="repair-field__label">{label}</span>
      {editing ? (
        <div
          className="repair-size-edit"
          role="group"
          aria-label={t("repair.packaging.customSizeAria", { unit })}
        >
          <input
            ref={inputRef}
            className="repair-size-edit__input"
            type="text"
            inputMode="decimal"
            value={draft}
            aria-label={t("repair.packaging.customSizeAria", { unit })}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                acceptEditor();
              } else if (e.key === "Escape") {
                e.preventDefault();
                closeEditor();
              }
            }}
          />
          <span className="repair-size-edit__unit">{unit}</span>
          <button
            type="button"
            className="repair-size-edit__btn"
            aria-label={t("common.cancel")}
            onClick={closeEditor}
          >
            <CloseIcon size={16} />
          </button>
          <button
            type="button"
            className="repair-size-edit__btn repair-size-edit__btn--accept"
            aria-label={t("common.apply")}
            disabled={!draftOk}
            onClick={acceptEditor}
          >
            <SavedIcon size={16} />
          </button>
        </div>
      ) : (
        <div className="repair-segmented" role="radiogroup" aria-label={label}>
          {presets.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={mode === "preset" && presetValue === n}
              className={`repair-segmented__btn${
                mode === "preset" && presetValue === n ? " is-active" : ""
              }`}
              onClick={() => onSelectPreset(n)}
            >
              {formatPreset(n)}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={mode === "custom"}
            className={`repair-segmented__btn${
              mode === "custom" ? " is-active" : ""
            }`}
            onClick={openEditor}
          >
            {mode === "custom" ? formatPreset(customValue) : t("common.custom")}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Buy-list report: sand bags + each epoxy component (A/B/C) as its own package.
 * Share actions live in the parent stage bottom sheet.
 */
export function RepairPackagingReportView({
  recipe,
  values,
  onReportTextChange,
}: {
  recipe: BlendingRecipe;
  values: number[];
  onReportTextChange?: (text: string) => void;
}) {
  const { t } = useTranslation("common");
  const uiLanguage = useSettingsStore((s) => s.uiLanguage) as AppLanguage;
  const phrase = usePackagePhrase(t);

  const [sandMode, setSandMode] = useState<SizeMode>("preset");
  const [sandPresetKg, setSandPresetKg] = useState<number>(
    SAND_PACKAGE_PRESETS_KG[0],
  );
  const [sandCustomKg, setSandCustomKg] = useState(20);
  const [epoxyMode, setEpoxyMode] = useState<SizeMode>("preset");
  const [epoxyPresetL, setEpoxyPresetL] = useState<number>(
    EPOXY_PACKAGE_PRESETS_L[0] ?? 10,
  );
  const [epoxyCustomL, setEpoxyCustomL] = useState(10);

  const sandPackageKg =
    sandMode === "custom" ? Math.max(0.1, sandCustomKg) : sandPresetKg;
  const epoxyPackageL =
    epoxyMode === "custom" ? Math.max(0.1, epoxyCustomL) : epoxyPresetL;

  const report = useMemo(
    () =>
      buildRepairPackagingReport({
        recipe,
        values,
        sandPackageKg,
        epoxyPackageL,
      }),
    [recipe, values, sandPackageKg, epoxyPackageL],
  );

  const sandSizeLabel = t("repair.packaging.sandKg", {
    kg: report.sand.packageSize,
  });
  const epoxySizeLabel = t("repair.packaging.epoxyL", {
    liters: epoxyPackageL,
  });

  const sandBuyPhrase = phrase(report.sand, sandSizeLabel, (n) =>
    `${n.toFixed(1)} kg`,
  );

  const binderBuyPhrases = useMemo(
    () =>
      report.binders.map((line) => ({
        id: line.id,
        phrase: phrase(line.plan, epoxySizeLabel, (n) => `${n.toFixed(1)} L`),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- phrase/t stable enough
    [report.binders, epoxySizeLabel, t],
  );

  const componentLabel = (id: string) =>
    getIngredientLabel(recipe, id, uiLanguage) ?? id;

  const reportText = useMemo(() => {
    const binderLines = report.binders.flatMap((line) => {
      const buy =
        binderBuyPhrases.find((b) => b.id === line.id)?.phrase ?? "—";
      return [
        `${componentLabel(line.id)}: ${formatRepairMassGrams(line.grams)} · ${line.liters.toFixed(1)} L`,
        `  ${t("repair.packaging.buy")}: ${buy}`,
      ];
    });

    return formatRepairPackagingReportText([
      t("repair.packaging.reportTitle"),
      "",
      t("repair.packaging.componentsHeading"),
      ...report.components.map(
        (c) =>
          `${componentLabel(c.id)}: ${formatRepairMassGrams(c.grams)}`,
      ),
      "",
      `${t("repair.packaging.sandNeed")}: ${formatRepairMassGrams(report.sandKg * 1000)}`,
      `${t("repair.packaging.sandBuy")}: ${sandBuyPhrase}`,
      "",
      t("repair.packaging.bindersHeading"),
      ...binderLines,
      "",
      t("repair.packaging.densityNote", {
        density: report.densityKgPerL.toFixed(2),
      }),
      t("repair.packaging.partialNote"),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- labels via t/recipe
  }, [
    report,
    sandBuyPhrase,
    binderBuyPhrases,
    epoxySizeLabel,
    t,
    uiLanguage,
  ]);

  useEffect(() => {
    onReportTextChange?.(reportText);
  }, [reportText, onReportTextChange]);

  return (
    <div className="repair-packaging">
      <PackageSizePicker
        label={t("repair.packaging.sandBag")}
        presets={SAND_PACKAGE_PRESETS_KG}
        formatPreset={(kg) => t("repair.packaging.sandKg", { kg })}
        unit="kg"
        mode={sandMode}
        presetValue={sandPresetKg}
        customValue={sandCustomKg}
        onSelectPreset={(kg) => {
          setSandMode("preset");
          setSandPresetKg(kg);
        }}
        onCommitCustom={(kg) => {
          setSandCustomKg(kg);
          setSandMode("custom");
        }}
      />

      <PackageSizePicker
        label={t("repair.packaging.epoxyBag")}
        presets={EPOXY_PACKAGE_PRESETS_L}
        formatPreset={(liters) => t("repair.packaging.epoxyL", { liters })}
        unit="L"
        mode={epoxyMode}
        presetValue={epoxyPresetL}
        customValue={epoxyCustomL}
        onSelectPreset={(liters) => {
          setEpoxyMode("preset");
          setEpoxyPresetL(liters);
        }}
        onCommitCustom={(liters) => {
          setEpoxyCustomL(liters);
          setEpoxyMode("custom");
        }}
      />

      <div className="repair-totals">
        <p className="repair-field__label" style={{ margin: 0 }}>
          {t("repair.packaging.componentsHeading")}
        </p>
        {report.components.map((c) => (
          <div key={c.id} className="repair-totals__row">
            <span>{componentLabel(c.id)}</span>
            <span>{formatRepairMassGrams(c.grams)}</span>
          </div>
        ))}
      </div>

      <div className="repair-totals">
        <p className="repair-field__label" style={{ margin: 0 }}>
          {t("repair.packaging.sandSection")}
        </p>
        <div className="repair-totals__row">
          <span>{t("repair.packaging.needed")}</span>
          <span>{formatRepairMassGrams(report.sandKg * 1000)}</span>
        </div>
        <div className="repair-totals__row repair-totals__row--strong">
          <span>{t("repair.packaging.buy")}</span>
          <strong>{sandBuyPhrase}</strong>
        </div>
        {report.sand.partialAmount > 0 ? (
          <p
            className="repair-field__hint"
            style={{ color: cv.text.muted, margin: 0 }}
          >
            {t("repair.packaging.lastPartialHint", {
              amount: `${report.sand.partialAmount.toFixed(1)} kg`,
              size: sandSizeLabel,
            })}
          </p>
        ) : null}
      </div>

      {report.binders.map((line) => {
        const buy =
          binderBuyPhrases.find((b) => b.id === line.id)?.phrase ?? "—";
        return (
          <div key={line.id} className="repair-totals">
            <p className="repair-field__label" style={{ margin: 0 }}>
              {componentLabel(line.id)}
            </p>
            <div className="repair-totals__row">
              <span>{t("repair.packaging.needed")}</span>
              <span>
                {formatRepairMassGrams(line.grams)} · {line.liters.toFixed(1)} L
              </span>
            </div>
            <div className="repair-totals__row repair-totals__row--strong">
              <span>{t("repair.packaging.buy")}</span>
              <strong>{buy}</strong>
            </div>
            {line.plan.partialAmount > 0 ? (
              <p
                className="repair-field__hint"
                style={{ color: cv.text.muted, margin: 0 }}
              >
                {t("repair.packaging.lastPartialHint", {
                  amount: `${line.plan.partialAmount.toFixed(1)} L`,
                  size: epoxySizeLabel,
                })}
              </p>
            ) : null}
          </div>
        );
      })}

      {report.binders.length > 0 ? (
        <p
          className="repair-field__hint"
          style={{ color: cv.text.muted, margin: 0 }}
        >
          {t("repair.packaging.densityNote", {
            density: report.densityKgPerL.toFixed(2),
          })}
        </p>
      ) : null}
    </div>
  );
}
