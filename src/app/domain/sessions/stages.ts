import { formatMixAmount } from "../mix/entities";
import {
  SESSION_STAGE_ORDER,
  type MixSession,
  type SessionStageId,
} from "../../sessions/types";
import { sessionGrandTotalGrams } from "./totals";

/** Index in `SESSION_STAGE_ORDER`, or -1 if unknown. */
export function sessionStageIndex(stage: SessionStageId): number {
  return SESSION_STAGE_ORDER.indexOf(stage);
}

/**
 * Stage strip navigation (step flow, not free tabs):
 * - Jump among stages already visited (`touchedStages`)
 * - Advance one step forward (same as header Next)
 * - Cannot skip into untouched future stages
 */
export function canNavigateToSessionStage(
  target: SessionStageId,
  active: SessionStageId,
  touched: readonly SessionStageId[],
): boolean {
  if (target === active) return false;
  if (touched.includes(target)) return true;
  const activeIdx = sessionStageIndex(active);
  const targetIdx = sessionStageIndex(target);
  if (activeIdx < 0 || targetIdx < 0) return false;
  return targetIdx === activeIdx + 1;
}

export function nextSessionStage(
  active: SessionStageId,
): SessionStageId | null {
  const idx = sessionStageIndex(active);
  if (idx < 0 || idx >= SESSION_STAGE_ORDER.length - 1) return null;
  return SESSION_STAGE_ORDER[idx + 1] ?? null;
}

/** Compact labels for dense session list cards and the overview stage strip. */
export const SESSION_STAGE_CARD_LABELS: Record<SessionStageId, string> = {
  mixes: "Mixes",
  "consumption-tools": "Tools",
  consumables: "Cons.",
  summary: "Summary",
};

/**
 * Count of items recorded in a stage.
 * `null` = stage is not an inventory count (Summary).
 */
export function sessionStageItemCount(
  session: MixSession,
  stage: SessionStageId,
): number | null {
  switch (stage) {
    case "mixes":
      return session.batches.length;
    case "consumption-tools":
      // Tools inventory not modeled yet.
      return 0;
    case "consumables":
      // Consumables inventory not modeled yet.
      return 0;
    case "summary":
      return null;
  }
}

/**
 * Stage is “complete” only when it has real content / outcome —
 * not merely because the user opened (touched) it.
 */
export function isSessionStageComplete(
  session: MixSession,
  stage: SessionStageId,
): boolean {
  switch (stage) {
    case "mixes":
      return session.batches.length > 0;
    case "consumption-tools":
    case "consumables":
      return (sessionStageItemCount(session, stage) ?? 0) > 0;
    case "summary":
      // Summary’s outcome is a confirmed save, not an item count.
      return session.status === "saved";
  }
}

/** List-card amount cell: item count, "-", or session total (kg) under Summary. */
export function sessionStageAmountLabel(
  session: MixSession,
  stage: SessionStageId,
): string {
  if (stage === "summary") {
    const totalGrams = sessionGrandTotalGrams(session.batches);
    if (totalGrams <= 0) return "-";
    return `${formatMixAmount(totalGrams, true)} kg`;
  }
  const count = sessionStageItemCount(session, stage) ?? 0;
  return count > 0 ? String(count) : "-";
}
