import {
  SESSION_STAGE_LABELS,
  SESSION_STAGE_ORDER,
  type MixSession,
  type SessionStageId,
} from "../../sessions/types";
import type { BatchReportLanguage } from "../batch-totals/report";
import { flexSelectSelectionTotal } from "../select/selection";
import { datedEntriesTotal } from "./workDate";

/** What the share payload includes relative to session stages. */
export type SessionShareScope = "current" | "through" | "all";

export const SESSION_SHARE_SCOPE_ORDER: SessionShareScope[] = [
  "current",
  "through",
  "all",
];

const SCOPE_LABELS = {
  sv: {
    current: "detta",
    through: "hit",
    all: "alla",
  },
  en: {
    current: "this",
    through: "from",
    all: "all",
  },
} as const;

const SCOPE_HELPER = {
  sv: {
    current: (stage: SessionStageId) =>
      `Delning inkluderar endast ${SESSION_STAGE_LABELS[stage]}`,
    through: (stages: SessionStageId[]) =>
      `Delning inkluderar ${stages.map((s) => SESSION_STAGE_LABELS[s]).join(" → ")}`,
    all: "Delning inkluderar alla steg med data",
    empty: "Inget att dela för valt omfång ännu",
  },
  en: {
    current: (stage: SessionStageId) =>
      `Share includes ${SESSION_STAGE_LABELS[stage]} only`,
    through: (stages: SessionStageId[]) =>
      `Share includes ${stages.map((s) => SESSION_STAGE_LABELS[s]).join(" → ")}`,
    all: "Share includes all stages with data",
    empty: "Nothing to share for this scope yet",
  },
} as const;

export function defaultShareScope(stage: SessionStageId): SessionShareScope {
  if (stage === "mixes") return "current";
  if (stage === "summary") return "all";
  return "through";
}

/** Stages included in the share payload for the given scope. */
export function stagesForShareScope(
  scope: SessionShareScope,
  activeStage: SessionStageId,
): SessionStageId[] {
  const activeIdx = SESSION_STAGE_ORDER.indexOf(activeStage);
  const safeIdx = activeIdx >= 0 ? activeIdx : 0;
  if (scope === "current") return [SESSION_STAGE_ORDER[safeIdx]];
  if (scope === "through") return SESSION_STAGE_ORDER.slice(0, safeIdx + 1);
  return [...SESSION_STAGE_ORDER];
}

export function shareScopeLabel(
  scope: SessionShareScope,
  language: BatchReportLanguage = "sv",
): string {
  return SCOPE_LABELS[language][scope];
}

export function shareScopeHelperText(
  scope: SessionShareScope,
  activeStage: SessionStageId,
  language: BatchReportLanguage = "sv",
): string {
  const stages = stagesForShareScope(scope, activeStage);
  if (scope === "current") return SCOPE_HELPER[language].current(activeStage);
  if (scope === "through") return SCOPE_HELPER[language].through(stages);
  return SCOPE_HELPER[language].all;
}

/** True when the scoped stages have something worth copying (respects day filter). */
export function sessionShareHasContent(
  session: MixSession,
  stages: readonly SessionStageId[],
  dayFilter: string | "all" = "all",
): boolean {
  return stages.some((stage) => {
    if (stage === "mixes" || stage === "summary") {
      const batches =
        dayFilter === "all"
          ? session.batches
          : session.batches.filter((b) => b.workDate === dayFilter);
      return batches.length > 0;
    }
    if (stage === "consumption-tools") {
      const fromEntries = datedEntriesTotal(session.toolEntries ?? [], dayFilter);
      if ((session.toolEntries?.length ?? 0) > 0) return fromEntries > 0;
      return dayFilter === "all"
        ? flexSelectSelectionTotal(session.selectedToolQtys ?? {}) > 0
        : false;
    }
    if (stage === "consumables") {
      const fromEntries = datedEntriesTotal(
        session.consumableEntries ?? [],
        dayFilter,
      );
      if ((session.consumableEntries?.length ?? 0) > 0) return fromEntries > 0;
      return dayFilter === "all"
        ? flexSelectSelectionTotal(session.selectedConsumableQtys ?? {}) > 0
        : false;
    }
    return false;
  });
}

export function shareScopeEmptyHint(language: BatchReportLanguage = "sv"): string {
  return SCOPE_HELPER[language].empty;
}
