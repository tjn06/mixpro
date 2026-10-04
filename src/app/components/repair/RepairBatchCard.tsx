import { useTranslation } from "react-i18next";
import type { FillSafetyState } from "../../domain/bucket/fillSafety";
import type { PlannedRecipeBatch } from "../../domain/mix/batchPlan";
import {
  formatRepairLiters,
  formatRepairMassGrams,
} from "../../domain/repair/format";
import { getIngredientLabel } from "../../domain/recipe/calc";
import type { BlendingRecipe } from "../../domain/recipe/types";
import type { AppLanguage } from "../../i18n/language";
import { cv } from "../../ui/tokens";

function safetyLabelKey(state: FillSafetyState): string | null {
  switch (state) {
    case "APPROACHING_LIMIT":
    case "GRADUAL_AGGREGATE_ADDITION_RECOMMENDED":
    case "AT_LIMIT":
    case "OVER_LIMIT":
      return `mixer.bucket.safety.${state}`;
    case "COMFORTABLE":
      return "repair.batch.comfortable";
    case "NO_BUCKET":
      return "mixer.bucket.noBucket";
    default:
      return null;
  }
}

/** One planned mixing batch — consumes FillSafety assessment, no local safety rules. */
export function RepairBatchCard({
  batch,
  recipe,
  language,
}: {
  batch: PlannedRecipeBatch;
  recipe: BlendingRecipe;
  language: AppLanguage;
}) {
  const { t } = useTranslation("common");
  const { assessment } = batch;
  const safetyKey = safetyLabelKey(assessment.fillSafetyState);
  const safePercent = Math.round(assessment.safety.safeFillFraction * 100);
  const isGradual =
    assessment.fillSafetyState === "GRADUAL_AGGREGATE_ADDITION_RECOMMENDED";

  return (
    <li className="repair-batch-card">
      <div className="repair-batch-card__header">
        <strong>
          {t("repair.batch.of", {
            n: batch.batchNumber,
            count: batch.batchCount,
          })}
        </strong>
        <span>{formatRepairLiters(assessment.volume.expectedRestVolumeL)}</span>
      </div>

      <div className="repair-batch-card__fill" aria-hidden>
        <div
          className="repair-batch-card__fill-bar"
          style={{
            width: `${Math.min(100, assessment.displayFillPercent)}%`,
          }}
        />
        <div
          className="repair-batch-card__safe-mark"
          style={{ left: `${safePercent}%` }}
        />
      </div>

      <ul className="repair-batch-card__masses">
        {batch.values.map((grams, i) => {
          const ids = ["TOTAL", "A", "B", "C", "THICKENER", "FILLER"] as const;
          const id = ids[i]!;
          if (id === "TOTAL" || !(grams > 0)) return null;
          return (
            <li key={id} className="repair-totals__row">
              <span>{getIngredientLabel(recipe, id, language) ?? id}</span>
              <span>{formatRepairMassGrams(grams)}</span>
            </li>
          );
        })}
      </ul>

      {safetyKey ? (
        <p
          className={
            isGradual
              ? "repair-batch-card__cue"
              : "repair-batch-card__safety"
          }
          style={isGradual ? undefined : { color: cv.text.muted }}
        >
          {t(safetyKey, { percent: safePercent })}
        </p>
      ) : null}
    </li>
  );
}
