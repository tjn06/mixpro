import {
  SESSION_STAGE_LABELS,
  SESSION_STAGE_ORDER,
  type SessionStageId,
} from "../../sessions/types";
import type { MixSession } from "../../sessions/types";
import type { BatchReportLanguage } from "../batch-totals/report";

/** What the share payload includes relative to session stages. */
export type SessionShareScope = "current" | "through" | "all";

export const SESSION_SHARE_SCOPE_ORDER: SessionShareScope[] = [
  "current",
  "through",
  "all",
];

const SCOPE_LABELS = {
  sv: {
    current: "Detta steg",
    through: "Hit",
    all: "Alla",
  },
  en: {
    current: "This step",
    through: "Up to here",
    all: "All steps",
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
  language: BatchReportLanguage = "en",
): string {
  return SCOPE_LABELS[language][scope];
}

export function shareScopeHelperText(
  scope: SessionShareScope,
  activeStage: SessionStageId,
  language: BatchReportLanguage = "en",
): string {
  const stages = stagesForShareScope(scope, activeStage);
  if (scope === "current") return SCOPE_HELPER[language].current(activeStage);
  if (scope === "through") return SCOPE_HELPER[language].through(stages);
  return SCOPE_HELPER[language].all;
}

/** True when the scoped stages have something worth copying (mixes/summary with batches). */
export function sessionShareHasContent(
  session: MixSession,
  stages: readonly SessionStageId[],
): boolean {
  return stages.some((stage) => {
    if (stage === "mixes" || stage === "summary") {
      return session.batches.length > 0;
    }
    // Tools / Consumables — no data model yet.
    return false;
  });
}

export function shareScopeEmptyHint(language: BatchReportLanguage = "en"): string {
  return SCOPE_HELPER[language].empty;
}
