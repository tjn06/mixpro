import { formatMixAmount, MIX_PARAMS } from "./mixEntities";
import { getEntityMetaLabel, getIngredientLabel } from "./recipe";
import { recipeMenuLabel } from "./recipeTypes";
import type { BlendingRecipe } from "./recipeTypes";

export type BatchReportLanguage = "sv" | "en";

const REPORT_COPY = {
  sv: {
    heading: "Förbrukning totalt",
    recipe: "Recept",
    totalMeta: "Total epoxymassa",
    commentPlaceholder: "Kommentar / titel",
  },
  en: {
    heading: "Total consumption",
    recipe: "Recipe",
    totalMeta: "Total epoxy mass",
    commentPlaceholder: "Comment / title",
  },
} as const;

/** Common ingredient labels → Swedish for shared reports. */
const INGREDIENT_LABEL_SV: Record<string, string> = {
  Resin: "Bas",
  Hardener: "Härdare",
  Filler: "Fyllmedel",
  Thickener: "Tjockningsmedel",
  Sand: "Sand",
};

function reportMetaLabel(
  recipe: BlendingRecipe,
  id: string,
  language: BatchReportLanguage,
): string | undefined {
  if (id === "TOTAL") {
    return REPORT_COPY[language].totalMeta;
  }

  const label = getIngredientLabel(recipe, id) ?? getEntityMetaLabel(recipe, id);
  if (!label) return undefined;

  if (language === "sv") {
    return INGREDIENT_LABEL_SV[label] ?? label;
  }

  return label;
}

export function buildBatchTotalsReportText(
  recipe: BlendingRecipe,
  values: number[],
  entityIndexes: number[],
  multiplier: number,
  language: BatchReportLanguage = "sv",
  comment?: string,
): string {
  const copy = REPORT_COPY[language];
  const rows = [0, ...entityIndexes.filter((i) => i !== 0)];
  const trimmedComment = comment?.trim();
  const lines: string[] = [];

  if (trimmedComment) {
    lines.push(trimmedComment, "");
  }

  lines.push(copy.heading, `${copy.recipe}: ${recipeMenuLabel(recipe)}`, "");

  for (const pi of rows) {
    const p = MIX_PARAMS[pi];
    const meta = reportMetaLabel(recipe, p.id, language);
    const unit = p.isKg ? "kg" : "g";
    const total = `${formatMixAmount(values[pi] * multiplier, p.isKg)} ${unit}`;
    const name = meta ? `${p.id} (${meta})` : p.id;
    lines.push(`${name}: ${total}`);
  }

  return lines.join("\n");
}

export function batchTotalsReportSubject(
  recipe: BlendingRecipe,
  language: BatchReportLanguage = "sv",
  comment?: string,
): string {
  const trimmedComment = comment?.trim();
  if (trimmedComment) return trimmedComment;

  return `${REPORT_COPY[language].heading} — ${recipeMenuLabel(recipe)}`;
}

export function batchReportCommentPlaceholder(language: BatchReportLanguage): string {
  return REPORT_COPY[language].commentPlaceholder;
}
