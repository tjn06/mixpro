import {
  SESSION_STAGE_ORDER,
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
