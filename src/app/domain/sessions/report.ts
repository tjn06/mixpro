import { format, parse } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import { formatMixAmount, MIX_PARAMS } from "../mix/entities";
import {
  getEntityMetaLabel,
  getIngredientLabel,
  recipeIngredientIndexes,
} from "../recipe/calc";
import { recipeMenuLabel, type BlendingRecipe } from "../recipe/types";
import { gramsFromSlotValues } from "../../saved-batch-totals/batches";
import type { MixSession, SessionBatchItem, SessionStageId } from "../../sessions/types";
import { useConsumablesLibraryStore } from "../../consumables/libraryStore";
import { useToolsLibraryStore } from "../../tools/libraryStore";
import { listSelectedConsumableLabelEntries } from "../consumables/labels";
import { listSelectedToolLabelEntries } from "../tools/catalog";
import type { BatchReportLanguage } from "../batch-totals/report";
import {
  sessionEntityIndexes,
  sessionGrandTotalGrams,
  sessionIngredientTotalsGrams,
  resolveSessionBatchRecipe,
} from "./totals";
import {
  sessionShareHasContent,
  stagesForShareScope,
  type SessionShareScope,
} from "./shareScope";
import {
  datedEntriesTotal,
  qtyMapFromDatedEntries,
  workDateIdFromIso,
  type SessionWorkDateId,
} from "./workDate";

/** `"all"` or a concrete `yyyy-MM-dd` work day. */
export type SessionReportDayFilter = "all" | SessionWorkDateId;

/**
 * Boss-facing share copy — no in-app jargon (session / scope / stages).
 * Keep A & B slot codes with human labels for site familiarity.
 *
 * Active language is Swedish (`SESSION_REPORT_LANGUAGE`). English strings are
 * kept complete for a later language switch — do not mix locales in one report.
 */
export const SESSION_REPORT_LANGUAGE: BatchReportLanguage = "sv";

const REPORT_COPY: Record<
  BatchReportLanguage,
  {
    heading: string;
    batches: string;
    recipe: string;
    overview: string;
    totals: string;
    totalMeta: string;
    tools: string;
    consumables: string;
    dateNote: string;
    periodNote: string;
    batchCount: (n: number) => string;
    toolCount: (n: number) => string;
    consCount: (n: number) => string;
  }
> = {
  sv: {
    heading: "Förbrukningsrapport",
    batches: "Blandningar",
    recipe: "Recept",
    overview: "Översikt",
    totals: "Totalt",
    totalMeta: "Total epoxymassa",
    tools: "Verktyg",
    consumables: "Förbrukningsmaterial",
    dateNote: "Datum",
    periodNote: "Period",
    batchCount: (n) => (n === 1 ? "1 blandning" : `${n} blandningar`),
    toolCount: (n) => (n === 1 ? "1 verktyg" : `${n} verktyg`),
    consCount: (n) =>
      n === 1 ? "1 förbrukningsvara" : `${n} förbrukningsvaror`,
  },
  en: {
    heading: "Consumption report",
    batches: "Batches",
    recipe: "Recipe",
    overview: "Overview",
    totals: "Totals",
    totalMeta: "Total epoxy mass",
    tools: "Tools",
    consumables: "Consumables",
    dateNote: "Date",
    periodNote: "Period",
    batchCount: (n) => (n === 1 ? "1 batch" : `${n} batches`),
    toolCount: (n) => (n === 1 ? "1 tool" : `${n} tools`),
    consCount: (n) =>
      n === 1 ? "1 consumable" : `${n} consumables`,
  },
};

/** Recipe ingredient labels → report language. */
const INGREDIENT_LABEL: Record<BatchReportLanguage, Record<string, string>> = {
  sv: {
    Resin: "Bas",
    Hardener: "Härdare",
    Filler: "Fyllmedel",
    Thickener: "Förtjockningsmedel",
    Tjockningsmedel: "Förtjockningsmedel",
    Sand: "Sand",
  },
  en: {
    Resin: "Resin",
    Hardener: "Hardener",
    Filler: "Filler",
    Thickener: "Thickener",
    Sand: "Sand",
  },
};

/** Slot codes that stay visible in shared reports (site shorthand). */
const KEEP_SLOT_CODE = new Set(["A", "B", "TIX", "SAND"]);

function reportLocale(language: BatchReportLanguage) {
  return language === "sv" ? sv : enUS;
}

function formatWorkDateLabel(
  workDate: string,
  language: BatchReportLanguage,
): string {
  const parsed = parse(workDate, "yyyy-MM-dd", new Date());
  if (Number.isNaN(parsed.getTime())) return workDate;
  return format(parsed, "d MMM yyyy", { locale: reportLocale(language) });
}

/** Work days that actually have mixes / tools / cons (sorted ascending). */
export function sessionContentWorkDates(session: MixSession): string[] {
  const ids = new Set<string>();
  for (const batch of session.batches ?? []) {
    if (batch.workDate) ids.add(batch.workDate);
  }
  for (const entry of session.toolEntries ?? []) {
    if (entry.workDate) ids.add(entry.workDate);
  }
  for (const entry of session.consumableEntries ?? []) {
    if (entry.workDate) ids.add(entry.workDate);
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

export function sessionReportPeriodLine(
  session: MixSession,
  dayFilter: SessionReportDayFilter,
  language: BatchReportLanguage = SESSION_REPORT_LANGUAGE,
): string | null {
  const copy = REPORT_COPY[language];
  if (dayFilter !== "all") {
    return `${copy.dateNote}: ${formatWorkDateLabel(dayFilter, language)}`;
  }
  const dates = sessionContentWorkDates(session);
  if (dates.length === 0) {
    const fallback = workDateIdFromIso(session.createdAt);
    return `${copy.dateNote}: ${formatWorkDateLabel(fallback, language)}`;
  }
  if (dates.length === 1) {
    return `${copy.dateNote}: ${formatWorkDateLabel(dates[0], language)}`;
  }
  return `${copy.periodNote}: ${formatWorkDateLabel(dates[0], language)} – ${formatWorkDateLabel(dates[dates.length - 1], language)}`;
}

function batchesForDayFilter(
  session: MixSession,
  dayFilter: SessionReportDayFilter,
): SessionBatchItem[] {
  if (dayFilter === "all") return session.batches ?? [];
  return (session.batches ?? []).filter((b) => b.workDate === dayFilter);
}

function reportMetaLabel(
  recipe: BlendingRecipe | null,
  id: string,
  language: BatchReportLanguage,
): string | undefined {
  if (id === "TOTAL") return REPORT_COPY[language].totalMeta;
  if (!recipe) return undefined;
  const label = getIngredientLabel(recipe, id) ?? getEntityMetaLabel(recipe, id);
  if (!label) return undefined;
  return INGREDIENT_LABEL[language][label] ?? label;
}

/** Boss-readable amount line — keep A/B (and TIX/SAND); hide TOTAL code. */
function formatAmountLine(
  slotId: string,
  meta: string | undefined,
  amount: string,
  unit: string,
  language: BatchReportLanguage,
): string {
  if (slotId === "TOTAL") {
    return `${meta ?? REPORT_COPY[language].totalMeta}: ${amount} ${unit}`;
  }
  if (KEEP_SLOT_CODE.has(slotId)) {
    return meta ? `${slotId} (${meta}): ${amount} ${unit}` : `${slotId}: ${amount} ${unit}`;
  }
  return meta ? `${meta}: ${amount} ${unit}` : `${slotId}: ${amount} ${unit}`;
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

function appendBatchesSection(
  lines: string[],
  session: MixSession,
  batches: readonly SessionBatchItem[],
  libraryRecipes: BlendingRecipe[],
  language: BatchReportLanguage,
): void {
  if (batches.length === 0) return;

  const copy = REPORT_COPY[language];
  const resolve = (batch: SessionBatchItem) =>
    resolveSessionBatchRecipe(batch, session.sessionRecipes, libraryRecipes);

  lines.push(`— ${copy.batches} —`);

  for (const batch of batches) {
    const recipe = resolve(batch);
    const values = gramsFromSlotValues(batch.values);
    const mult = Math.max(1, batch.multiplier);
    lines.push(batch.name);
    lines.push(`${copy.recipe}: ${batchRecipeLabel(batch, recipe)}`);
    if (batch.comment?.trim()) {
      lines.push(`  ${batch.comment.trim()}`);
    }
    if (recipe) {
      const indexes = [0, ...recipeIngredientIndexes(recipe).filter((i) => i !== 0)];
      for (const pi of indexes) {
        const p = MIX_PARAMS[pi];
        const meta = reportMetaLabel(recipe, p.id, language);
        const unit = p.isKg ? "kg" : "g";
        const grams = (values[pi] ?? 0) * mult;
        lines.push(
          `  ${formatAmountLine(p.id, meta, formatMixAmount(grams, p.isKg), unit, language)}`,
        );
      }
    }
    lines.push("");
  }
}

function appendToolsSection(
  lines: string[],
  session: MixSession,
  dayFilter: SessionReportDayFilter,
  language: BatchReportLanguage,
): void {
  const qtys = qtyMapFromDatedEntries(session.toolEntries ?? [], dayFilter);
  const labels = listSelectedToolLabelEntries(
    qtys,
    useToolsLibraryStore.getState().items,
    session.customTools ?? [],
  );
  if (labels.length === 0) return;

  lines.push(`— ${REPORT_COPY[language].tools} —`);
  for (const label of labels) lines.push(`· ${label}`);
  lines.push("");
}

function appendConsumablesSection(
  lines: string[],
  session: MixSession,
  dayFilter: SessionReportDayFilter,
  language: BatchReportLanguage,
): void {
  const qtys = qtyMapFromDatedEntries(session.consumableEntries ?? [], dayFilter);
  const labels = listSelectedConsumableLabelEntries(
    qtys,
    useConsumablesLibraryStore.getState().items,
    session.customConsumables ?? [],
    session.consumableWearByOptionId ?? {},
  );
  if (labels.length === 0) return;

  lines.push(`— ${REPORT_COPY[language].consumables} —`);
  for (const label of labels) lines.push(`· ${label}`);
  lines.push("");
}

/**
 * Overview + combined totals. Tools/cons only when not already listed.
 */
function appendSummarySection(
  lines: string[],
  session: MixSession,
  batches: readonly SessionBatchItem[],
  dayFilter: SessionReportDayFilter,
  libraryRecipes: BlendingRecipe[],
  language: BatchReportLanguage,
  stagesIncluded: readonly SessionStageId[],
): void {
  const copy = REPORT_COPY[language];
  const toolTotal = datedEntriesTotal(session.toolEntries ?? [], dayFilter);
  const consTotal = datedEntriesTotal(session.consumableEntries ?? [], dayFilter);
  const grand = sessionGrandTotalGrams(batches);
  const hasAnything =
    batches.length > 0 || toolTotal > 0 || consTotal > 0;
  if (!hasAnything) return;

  lines.push(`— ${copy.overview} —`);
  lines.push(
    `${copy.batchCount(batches.length)} · ${copy.toolCount(toolTotal)} · ${copy.consCount(consTotal)}`,
  );
  if (grand > 0) {
    lines.push(`${copy.totalMeta}: ${formatMixAmount(grand, true)} kg`);
  }
  lines.push("");

  if (batches.length > 0) {
    const resolve = (batch: SessionBatchItem) =>
      resolveSessionBatchRecipe(batch, session.sessionRecipes, libraryRecipes);
    const entityIndexes = sessionEntityIndexes(batches, resolve);
    const totals = sessionIngredientTotalsGrams(batches);

    lines.push(copy.totals);
    for (const pi of entityIndexes) {
      const p = MIX_PARAMS[pi];
      const unit = p.isKg ? "kg" : "g";
      const label =
        pi === 0
          ? copy.totalMeta
          : reportMetaLabel(firstRecipeForSlot(batches, resolve, pi), p.id, language);
      lines.push(
        `  ${formatAmountLine(p.id, label, formatMixAmount(totals[pi] ?? 0, p.isKg), unit, language)}`,
      );
    }
    lines.push("");
  }

  if (!stagesIncluded.includes("consumption-tools")) {
    appendToolsSection(lines, session, dayFilter, language);
  }
  if (!stagesIncluded.includes("consumables")) {
    appendConsumablesSection(lines, session, dayFilter, language);
  }
}

function appendStageSection(
  stage: SessionStageId,
  lines: string[],
  session: MixSession,
  batches: readonly SessionBatchItem[],
  dayFilter: SessionReportDayFilter,
  libraryRecipes: BlendingRecipe[],
  language: BatchReportLanguage,
  stagesIncluded: readonly SessionStageId[],
): void {
  switch (stage) {
    case "mixes":
      appendBatchesSection(lines, session, batches, libraryRecipes, language);
      break;
    case "consumption-tools":
      appendToolsSection(lines, session, dayFilter, language);
      break;
    case "consumables":
      appendConsumablesSection(lines, session, dayFilter, language);
      break;
    case "summary":
      appendSummarySection(
        lines,
        session,
        batches,
        dayFilter,
        libraryRecipes,
        language,
        stagesIncluded,
      );
      break;
  }
}

export function buildSessionReportText(
  session: MixSession,
  libraryRecipes: BlendingRecipe[],
  language: BatchReportLanguage = SESSION_REPORT_LANGUAGE,
  comment?: string,
  scope: SessionShareScope = "all",
  activeStage: SessionStageId = session.activeStage,
  dayFilter: SessionReportDayFilter = "all",
): string {
  const copy = REPORT_COPY[language];
  const lines: string[] = [];
  const trimmedComment = comment?.trim();
  const title =
    trimmedComment || session.name.trim() || copy.heading;

  const stages = stagesForShareScope(scope, activeStage);
  const period = sessionReportPeriodLine(session, dayFilter, language);
  const batches = batchesForDayFilter(session, dayFilter);

  lines.push(copy.heading);
  lines.push(title);
  if (period) lines.push(period);
  lines.push("");

  for (const stage of stages) {
    appendStageSection(
      stage,
      lines,
      session,
      batches,
      dayFilter,
      libraryRecipes,
      language,
      stages,
    );
  }

  if (!sessionShareHasContent(session, stages, dayFilter)) {
    if (lines[lines.length - 1] === "") lines.pop();
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function sessionReportSubject(
  session: MixSession,
  language: BatchReportLanguage = SESSION_REPORT_LANGUAGE,
  comment?: string,
  _scope: SessionShareScope = "all",
  _activeStage: SessionStageId = session.activeStage,
  dayFilter: SessionReportDayFilter = "all",
): string {
  const trimmed = comment?.trim();
  if (trimmed) return trimmed;
  const name = session.name.trim() || REPORT_COPY[language].heading;
  const period = sessionReportPeriodLine(session, dayFilter, language);
  return period ? `${name} — ${period}` : name;
}
