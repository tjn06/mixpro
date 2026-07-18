import { flexSelectSelectionTotal } from "../select/selection";
import {
  SESSION_STAGE_ORDER,
  type MixSession,
  type SessionStageId,
} from "../../sessions/types";

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

/** Compact stage labels for session list cards and overview stage strip. */
export const SESSION_STAGE_CARD_LABELS: Record<SessionStageId, string> = {
  mixes: "Mixes",
  "consumption-tools": "Tools",
  consumables: "Cons.",
  summary: "Sum.",
};

const DEFAULT_SESSION_NAME = "Untitled session";

/** Card title — avoid showing the placeholder untitled name for now. */
export function sessionCardTitle(session: MixSession): string {
  const name = session.name.trim();
  if (!name || name === DEFAULT_SESSION_NAME) {
    return session.status === "saved" ? "Saved session" : "Draft session";
  }
  return name;
}

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
      return flexSelectSelectionTotal(session.selectedToolQtys ?? {});
    case "consumables":
      return flexSelectSelectionTotal(session.selectedConsumableQtys ?? {});
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

/** List-card amount: item count, em dash, or Saved / Draft under Summary. */
export function sessionStageAmountLabel(
  session: MixSession,
  stage: SessionStageId,
): string {
  if (stage === "summary") {
    return session.status === "saved" ? "Saved" : "Draft";
  }
  const count = sessionStageItemCount(session, stage) ?? 0;
  return count > 0 ? String(count) : "—";
}
