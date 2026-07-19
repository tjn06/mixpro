import type { BlendingRecipe } from "../domain/recipe/types";
import type { MixSlotValues } from "../saved-batch-totals/types";

/** Session workflow stages — Mixes interactive; Tools/Consumables/Summary later. */
export type SessionStageId =
  | "mixes"
  | "consumption-tools"
  | "consumables"
  | "summary";

export const SESSION_STAGE_ORDER: SessionStageId[] = [
  "mixes",
  "consumption-tools",
  "consumables",
  "summary",
];

export const SESSION_STAGE_LABELS: Record<SessionStageId, string> = {
  mixes: "Mixes",
  "consumption-tools": "Tools",
  consumables: "Consumables",
  summary: "Summary",
};

/**
 * One calculated mix in a session — unique item (no extras merge).
 * Phase 3 fills calculator fields; Phase 1 keeps the shape ready.
 */
export type SessionBatchItem = {
  id: string;
  name: string;
  recipeId: string;
  recipeName: string;
  /** Optional session-only recipe snapshot (not in library). */
  recipe?: BlendingRecipe;
  values: MixSlotValues;
  multiplier: number;
  createdAt: string;
  updatedAt: string;
};

/** Project container — multiple unique batch items + future stages. */
export type MixSession = {
  id: string;
  name: string;
  /** Silent draft vs user-confirmed save from session dock. */
  status: "draft" | "saved";
  activeStage: SessionStageId;
  /** Stages the user has opened at least once (progress indicator). */
  touchedStages: SessionStageId[];
  batches: SessionBatchItem[];
  /** Recipes saved only into this session (not Recipe Library). */
  sessionRecipes: BlendingRecipe[];
  /**
   * Selected tools with quantities (id → qty ≥ 1).
   * Legacy persisted `selectedToolIds` arrays are migrated on load.
   */
  selectedToolQtys: Record<string, number>;
  /** @deprecated Migrated into selectedToolQtys — kept optional for old saves. */
  selectedToolIds?: string[];
  /** User-defined simple tools (no dropdown) for this session. */
  customTools: { id: string; label: string }[];
  /**
   * Selected consumables with quantities (id → qty ≥ 1).
   * Legacy persisted `selectedConsumableIds` arrays are migrated on load.
   */
  selectedConsumableQtys: Record<string, number>;
  /** @deprecated Migrated into selectedConsumableQtys — kept optional for old saves. */
  selectedConsumableIds?: string[];
  /**
   * Slitage (wear) per selected consumable option id — Låg / Medel / Hög.
   * Only used for abrasive families (diamantsegment, slipskål, …).
   */
  consumableWearByOptionId: Record<string, "lag" | "medel" | "hog">;
  /** User-defined simple consumables (no dropdown). */
  customConsumables: { id: string; label: string }[];
  createdAt: string;
  updatedAt: string;
};

export type CreateSessionInput = {
  name?: string;
};
