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
 *
 * `createdAt` = when the mix row was created (immutable audit).
 * `workDate` = editable calendar day for day-filter / planning (yyyy-MM-dd).
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
  /** Local calendar day this mix belongs to (`yyyy-MM-dd`). */
  workDate: string;
  /** Optional note on this mix (session save). */
  comment?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Tool / consumable quantity scoped to a work day.
 * Same catalog id may appear on multiple days as separate rows.
 */
export type SessionDatedQtyEntry = {
  optionId: string;
  qty: number;
  /** Local calendar day (`yyyy-MM-dd`). */
  workDate: string;
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
   * Derived aggregate of `toolEntries` (all days) — kept for older readers.
   */
  selectedToolQtys: Record<string, number>;
  /** Per-day tool quantities — source of truth for day filtering. */
  toolEntries: SessionDatedQtyEntry[];
  /** @deprecated Migrated into selectedToolQtys — kept optional for old saves. */
  selectedToolIds?: string[];
  /** User-defined simple tools (no dropdown) for this session. */
  customTools: { id: string; label: string }[];
  /**
   * Selected consumables with quantities (id → qty ≥ 1).
   * Derived aggregate of `consumableEntries` (all days).
   */
  selectedConsumableQtys: Record<string, number>;
  /** Per-day consumable quantities — source of truth for day filtering. */
  consumableEntries: SessionDatedQtyEntry[];
  /** @deprecated Migrated into selectedConsumableQtys — kept optional for old saves. */
  selectedConsumableIds?: string[];
  /**
   * Slitage (wear) per selected consumable option id — Låg / Medel / Hög.
   * Only used for abrasive families (diamantsegment, slipskål, …).
   */
  consumableWearByOptionId: Record<string, "lag" | "medel" | "hog">;
  /** User-defined simple consumables (no dropdown). */
  customConsumables: { id: string; label: string }[];
  /**
   * Last concrete day used for new mixes / tool-cons edits (`yyyy-MM-dd`).
   * Day filter "All" does not clear this.
   */
  activeWorkDate: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSessionInput = {
  name?: string;
};
