import type { FlexSelectItem } from "../select/types";

/** Catalog entry — same shape as flex-select nodes (label / expandable / nested). */
export type ToolItem = FlexSelectItem;

/** Selected tool ids on a session (multi-select). */
export type SessionToolSelection = string[];

export function countSelectedTools(selectedIds: readonly string[] | undefined): number {
  return selectedIds?.length ?? 0;
}
