import { flexSelectQty, type FlexSelectSelection } from "./selection";
import { optionIdsForItem, type FlexSelectItem } from "./types";

/** One UI chip for a dropdown family. Head is always first; clones are linked copies. */
export type DropdownSlot = {
  id: string;
  /** Selected variant id, or null when empty. */
  optionId: string | null;
  /** False for head — clones are not catalog rows / sort participants. */
  isHead: boolean;
};

export function headSlotId(parentId: string): string {
  return `${parentId}__head`;
}

export function newCloneSlotId(parentId: string): string {
  return `${parentId}__clone__${crypto.randomUUID()}`;
}

/** Build initial slots from selection (one chip per selected variant, else empty head). */
export function hydrateDropdownSlots(
  parent: FlexSelectItem,
  selection: FlexSelectSelection,
): DropdownSlot[] {
  const selectedIds = optionIdsForItem(parent).filter(
    (id) => flexSelectQty(selection, id) >= 1,
  );
  if (selectedIds.length === 0) {
    return [{ id: headSlotId(parent.id), optionId: null, isHead: true }];
  }
  return selectedIds.map((optionId, index) => ({
    id: index === 0 ? headSlotId(parent.id) : `${parent.id}__opt__${optionId}`,
    optionId,
    isHead: index === 0,
  }));
}

/**
 * Keep slots aligned with selection: drop cleared options on clones, clear head,
 * append chips for selected variants that have no slot yet.
 * Empty clone slots (from +) are preserved.
 */
export function reconcileDropdownSlots(
  parent: FlexSelectItem,
  selection: FlexSelectSelection,
  prev: readonly DropdownSlot[] | undefined,
): DropdownSlot[] {
  const optionIds = optionIdsForItem(parent);
  const selectedIds = optionIds.filter(
    (id) => flexSelectQty(selection, id) >= 1,
  );

  if (!prev?.length) return hydrateDropdownSlots(parent, selection);

  const next: DropdownSlot[] = [];
  const covered = new Set<string>();

  for (const slot of prev) {
    if (slot.optionId && flexSelectQty(selection, slot.optionId) < 1) {
      if (slot.isHead) {
        next.push({ ...slot, optionId: null });
      }
      // Cleared clone → drop (not a catalog row).
      continue;
    }
    if (slot.optionId) covered.add(slot.optionId);
    next.push(slot);
  }

  if (next.length === 0 || !next.some((s) => s.isHead)) {
    next.unshift({
      id: headSlotId(parent.id),
      optionId: null,
      isHead: true,
    });
  }

  for (const optionId of selectedIds) {
    if (covered.has(optionId)) continue;
    next.push({
      id: `${parent.id}__opt__${optionId}`,
      optionId,
      isHead: false,
    });
    covered.add(optionId);
  }

  return next;
}
