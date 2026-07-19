import { formatMixAmount, MIX_PARAMS } from "../mix/entities";
import {
  getEntityMetaLabel,
  getIngredientLabel,
  recipeIngredientIndexes,
} from "../recipe/calc";
import { recipeMenuLabel, type BlendingRecipe } from "../recipe/types";
import { gramsFromSlotValues } from "../../saved-batch-totals/batches";
import type { MixSession, SessionBatchItem, SessionStageId } from "../../sessions/types";
import { SESSION_STAGE_LABELS } from "../../sessions/types";
import { useConsumablesLibraryStore } from "../../consumables/libraryStore";
import { useToolsLibraryStore } from "../../tools/libraryStore";
import { listSelectedConsumableLabelEntries } from "../consumables/labels";
import { listSelectedToolLabelEntries } from "../tools/catalog";
import type { BatchReportLanguage } from "../batch-totals/report";
import {
  sessionEntityIndexes,
  sessionIngredientTotalsGrams,
  resolveSessionBatchRecipe,
} from "./totals";
import {
  sessionShareHasContent,
  stagesForShareScope,
  type SessionShareScope,
} from "./shareScope";

const REPORT_COPY = {
  sv: {
    heading: "Session — förbrukning",
    mixes: "Mixar",
    mix: "Mix",
    recipe: "Recept",
    summary: "Summering",
    totalMeta: "Total epoxymassa",
    emptyMixes: "Inga mixar ännu",
    tools: "Verktyg",
    toolsEmpty: "Inga verktyg ännu",
    consumables: "Förbrukningsmaterial",
    consumablesEmpty: "Inget förbrukningsmaterial ännu",
    scopeNote: "Omfång",
  },
  en: {
    heading: "Session — consumption",
    mixes: "Mixes",
    mix: "Mix",
    recipe: "Recipe",
    summary: "Summary",
    totalMeta: "Total epoxy mass",
    emptyMixes: "No mixes yet",
    tools: "Tools",
    toolsEmpty: "No tools yet",
    consumables: "Consumables",
    consumablesEmpty: "No consumables yet",
    scopeNote: "Scope",
  },
} as const;

const INGREDIENT_LABEL_SV: Record<string, string> = {
  Resin: "Bas",
  Hardener: "Härdare",
  Filler: "Fyllmedel",
  Thickener: "Tjockningsmedel",
  Sand: "Sand",
};

function reportMetaLabel(
  recipe: BlendingRecipe | null,
  id: string,
  language: BatchReportLanguage,
): string | undefined {
  if (id === "TOTAL") return REPORT_COPY[language].totalMeta;
  if (!recipe) return undefined;
  const label = getIngredientLabel(recipe, id) ?? getEntityMetaLabel(recipe, id);
  if (!label) return undefined;
  if (language === "sv") return INGREDIENT_LABEL_SV[label] ?? label;
  return label;
}

function firstRecipeForSlot(
  batches: readonly SessionBatchItem[],
  resolve: (batch: SessionBatchItem) => BlendingRecipe | null,
  slotIndex: number,
): BlendingRecipe | null {
  for (const batch of batches) {
    const recipe = resolve(batch);
    if (!recipe) continue;
    if (slotIndex === 0) return recipe;
    if (recipeIngredientIndexes(recipe).includes(slotIndex)) return recipe;
  }
  return null;
}

function batchRecipeLabel(batch: SessionBatchItem, recipe: BlendingRecipe | null): string {
  const fromBatch = batch.recipeName?.trim();
  if (fromBatch) return fromBatch;
  if (recipe) return recipeMenuLabel(recipe);
  return batch.recipeId;
}

function appendMixesSection(
  lines: string[],
  session: MixSession,
  libraryRecipes: BlendingRecipe[],
  language: BatchReportLanguage,
): void {
  const copy = REPORT_COPY[language];
  lines.push(`— ${copy.mixes} —`, `${copy.mixes}: ${session.batches.length}`, "");

  if (session.batches.length === 0) {
    lines.push(copy.emptyMixes, "");
    return;
  }

  const resolve = (batch: SessionBatchItem) =>
    resolveSessionBatchRecipe(batch, session.sessionRecipes, libraryRecipes);

  for (const batch of session.batches) {
    const recipe = resolve(batch);
    const values = gramsFromSlotValues(batch.values);
    const mult = Math.max(1, batch.multiplier);
    lines.push(`${copy.mix}: ${batch.name} ×${mult}`);
    lines.push(`${copy.recipe}: ${batchRecipeLabel(batch, recipe)}`);
    if (recipe) {
      const indexes = [0, ...recipeIngredientIndexes(recipe).filter((i) => i !== 0)];
      for (const pi of indexes) {
        const p = MIX_PARAMS[pi];
        const meta = reportMetaLabel(recipe, p.id, language);
        const unit = p.isKg ? "kg" : "g";
        const grams = (values[pi] ?? 0) * mult;
        const name = meta ? `${p.id} (${meta})` : p.id;
        lines.push(`  ${name}: ${formatMixAmount(grams, p.isKg)} ${unit}`);
      }
    }
    lines.push("");
  }
}

function appendSummarySection(
  lines: string[],
  session: MixSession,
  libraryRecipes: BlendingRecipe[],
  language: BatchReportLanguage,
): void {
  const copy = REPORT_COPY[language];
  if (session.batches.length === 0) {
    lines.push(`— ${copy.summary} —`, copy.emptyMixes, "");
    return;
  }

  const resolve = (batch: SessionBatchItem) =>
    resolveSessionBatchRecipe(batch, session.sessionRecipes, libraryRecipes);
  const entityIndexes = sessionEntityIndexes(session.batches, resolve);
  const totals = sessionIngredientTotalsGrams(session.batches);

  lines.push(`— ${copy.summary} —`);
  for (const pi of entityIndexes) {
    const p = MIX_PARAMS[pi];
    const unit = p.isKg ? "kg" : "g";
    const label =
      pi === 0
        ? copy.totalMeta
        : reportMetaLabel(firstRecipeForSlot(session.batches, resolve, pi), p.id, language);
    const name = label ? `${p.id} (${label})` : p.id;
    lines.push(`${name}: ${formatMixAmount(totals[pi] ?? 0, p.isKg)} ${unit}`);
  }
  lines.push("");
}

function appendPlaceholderStage(
  lines: string[],
  title: string,
  emptyLine: string,
): void {
  lines.push(`— ${title} —`, emptyLine, "");
}

function appendStageSection(
  stage: SessionStageId,
  lines: string[],
  session: MixSession,
  libraryRecipes: BlendingRecipe[],
  language: BatchReportLanguage,
): void {
  const copy = REPORT_COPY[language];
  switch (stage) {
    case "mixes":
      appendMixesSection(lines, session, libraryRecipes, language);
      break;
    case "consumption-tools": {
      const labels = listSelectedToolLabelEntries(
        session.selectedToolQtys ?? {},
        useToolsLibraryStore.getState().items,
        session.customTools ?? [],
      );
      if (labels.length === 0) {
        appendPlaceholderStage(lines, copy.tools, copy.toolsEmpty);
        break;
      }
      lines.push(`— ${copy.tools} —`);
      for (const label of labels) lines.push(`· ${label}`);
      lines.push("");
      break;
    }
    case "consumables": {
      const labels = listSelectedConsumableLabelEntries(
        session.selectedConsumableQtys ?? {},
        useConsumablesLibraryStore.getState().items,
        session.customConsumables ?? [],
        session.consumableWearByOptionId ?? {},
      );
      if (labels.length === 0) {
        appendPlaceholderStage(lines, copy.consumables, copy.consumablesEmpty);
        break;
      }
      lines.push(`— ${copy.consumables} —`);
      for (const label of labels) lines.push(`· ${label}`);
      lines.push("");
      break;
    }
    case "summary":
      appendSummarySection(lines, session, libraryRecipes, language);
      break;
  }
}

export function buildSessionReportText(
  session: MixSession,
  libraryRecipes: BlendingRecipe[],
  language: BatchReportLanguage = "sv",
  comment?: string,
  scope: SessionShareScope = "all",
  activeStage: SessionStageId = session.activeStage,
): string {
  const copy = REPORT_COPY[language];
  const lines: string[] = [];
  const trimmed = comment?.trim();
  if (trimmed) lines.push(trimmed, "");

  const stages = stagesForShareScope(scope, activeStage);
  const scopeLabels = stages.map((s) => SESSION_STAGE_LABELS[s]).join(" → ");

  lines.push(copy.heading, session.name, `${copy.scopeNote}: ${scopeLabels}`, "");

  for (const stage of stages) {
    appendStageSection(stage, lines, session, libraryRecipes, language);
  }

  if (!sessionShareHasContent(session, stages)) {
    // Ensure body isn't only headers when everything is empty.
    if (lines[lines.length - 1] === "") lines.pop();
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function sessionReportSubject(
  session: MixSession,
  language: BatchReportLanguage = "sv",
  comment?: string,
  scope: SessionShareScope = "all",
  activeStage: SessionStageId = session.activeStage,
): string {
  const trimmed = comment?.trim();
  if (trimmed) return trimmed;
  const stages = stagesForShareScope(scope, activeStage);
  const scopeBit =
    scope === "all"
      ? SESSION_STAGE_LABELS.summary
      : stages.map((s) => SESSION_STAGE_LABELS[s]).join(" · ");
  return `${REPORT_COPY[language].heading} — ${session.name} — ${scopeBit}`;
}
