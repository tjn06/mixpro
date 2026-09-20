import {
  selectionLineKey,
  type ItemAcquisition,
} from "./acquisition";
import { flexSelectQty, type FlexSelectSelection } from "./selection";
import { optionIdsForItem, type FlexSelectItem } from "./types";

/** One UI chip for a dropdown family. Head is always first; clones are linked copies. */
export type DropdownSlot = {
  id: string;
  /** Selected variant id, or null when empty. */
  optionId: string | null;
  /** False for head — clones are not catalog rows / sort participants. */
  isHead: boolean;
  /** Rented line uses `acq:rented:` selection keys; owned uses raw option id. */
  rented: boolean;
};

export function headSlotId(parentId: string): string {
  return `${parentId}__head`;
}

export function newCloneSlotId(parentId: string): string {
  return `${parentId}__clone__${crypto.randomUUID()}`;
}

/** Stable owned catalog copy while any rental exists for the family. */
export function ownedDefaultSlotId(parentId: string): string {
  return `${parentId}__owned_default`;
}

/** Parked owned copy while rent arm is on (one per owned variant). */
export function ownedParkSlotId(parentId: string, optionId: string): string {
  return `${parentId}__owned_park__${optionId}`;
}

export function isOwnedParkSlotId(slotId: string, parentId: string): boolean {
  return slotId.startsWith(`${parentId}__owned_park__`);
}

/**
 * Owned copies that stay visible but muted while rent arm is on — either the
 * stable owned-default badge or a parked owned selection.
 */
export function isOwnedCopySlot(
  slot: Pick<DropdownSlot, "id" | "rented" | "optionId">,
  parentId: string,
): boolean {
  if (slot.rented) return false;
  if (slot.id === ownedDefaultSlotId(parentId)) return true;
  if (isOwnedParkSlotId(slot.id, parentId)) return true;
  return false;
}

export function dropdownSlotLineKey(
  optionId: string,
  rented: boolean,
): string {
  return selectionLineKey(optionId, rented ? "rented" : "owned");
}

export function dropdownSlotLineQty(
  selection: FlexSelectSelection,
  optionId: string,
  rented: boolean,
): number {
  return flexSelectQty(selection, dropdownSlotLineKey(optionId, rented));
}

type SelectedLine = { optionId: string; rented: boolean };

/** Owned + rented selected variants for a dropdown family (rented first per option). */
function selectedLinesForItem(
  parent: FlexSelectItem,
  selection: FlexSelectSelection,
): SelectedLine[] {
  const lines: SelectedLine[] = [];
  for (const optionId of optionIdsForItem(parent)) {
    if (dropdownSlotLineQty(selection, optionId, true) >= 1) {
      lines.push({ optionId, rented: true });
    }
    if (dropdownSlotLineQty(selection, optionId, false) >= 1) {
      lines.push({ optionId, rented: false });
    }
  }
  return lines;
}

function lineSlotId(
  parentId: string,
  optionId: string,
  rented: boolean,
  isHead: boolean,
): string {
  if (isHead) return headSlotId(parentId);
  return rented
    ? `${parentId}__opt__rented__${optionId}`
    : `${parentId}__opt__${optionId}`;
}

function hasLiveRental(slots: readonly DropdownSlot[]): boolean {
  return slots.some((s) => s.rented && s.optionId != null);
}

/**
 * Like simple chips: after a rental exists, keep an owned default badge for
 * normal selecting (empty until the user picks an owned variant).
 */
function ensureOwnedDefaultSlot(
  parentId: string,
  slots: DropdownSlot[],
): DropdownSlot[] {
  if (!hasLiveRental(slots)) {
    return slots.filter(
      (s) =>
        s.id !== ownedDefaultSlotId(parentId) &&
        !isOwnedParkSlotId(s.id, parentId),
    );
  }
  const withoutParks = slots.filter((s) => !isOwnedParkSlotId(s.id, parentId));
  if (withoutParks.some((s) => !s.rented)) return withoutParks;
  return [
    ...withoutParks,
    {
      id: ownedDefaultSlotId(parentId),
      optionId: null,
      isHead: false,
      rented: false,
    },
  ];
}

/**
 * Rent arm on: park every owned selection onto muted copies and leave an empty
 * head free so the same variants can still be picked as rented.
 */
export function parkOwnedSlotsForRentArm(
  parentId: string,
  slots: readonly DropdownSlot[],
): DropdownSlot[] {
  const rented = slots.filter((s) => s.rented && s.optionId != null);
  const ownedSelected = slots.filter((s) => !s.rented && s.optionId != null);
  const seenOwned = new Set<string>();
  const parkedOwned: DropdownSlot[] = [];
  for (const slot of ownedSelected) {
    const optionId = slot.optionId!;
    if (seenOwned.has(optionId)) continue;
    seenOwned.add(optionId);
    parkedOwned.push({
      id: ownedParkSlotId(parentId, optionId),
      optionId,
      isHead: false,
      rented: false,
    });
  }

  const next: DropdownSlot[] = [
    {
      id: headSlotId(parentId),
      optionId: null,
      isHead: true,
      rented: false,
    },
    ...rented.map((slot) => ({
      ...slot,
      isHead: false,
      id:
        slot.isHead && slot.optionId
          ? lineSlotId(parentId, slot.optionId, true, false)
          : slot.id,
    })),
    ...parkedOwned,
  ];

  if (rented.length > 0 && parkedOwned.length === 0) {
    next.push({
      id: ownedDefaultSlotId(parentId),
      optionId: null,
      isHead: false,
      rented: false,
    });
  }

  return next;
}

/** Build initial slots from selection (one chip per selected line, else empty head). */
export function hydrateDropdownSlots(
  parent: FlexSelectItem,
  selection: FlexSelectSelection,
): DropdownSlot[] {
  const selected = selectedLinesForItem(parent, selection);
  if (selected.length === 0) {
    return [
      {
        id: headSlotId(parent.id),
        optionId: null,
        isHead: true,
        rented: false,
      },
    ];
  }
  const slots = selected.map((line, index) => ({
    id: lineSlotId(parent.id, line.optionId, line.rented, index === 0),
    optionId: line.optionId,
    isHead: index === 0,
    rented: line.rented,
  }));
  return ensureOwnedDefaultSlot(parent.id, slots);
}

/**
 * Keep slots aligned with selection: drop cleared options on clones, clear head,
 * append chips for selected lines that have no slot yet.
 * Empty clone slots (from +) are preserved.
 * While any rental exists, an owned default badge is kept (simple-chip parity).
 */
export function reconcileDropdownSlots(
  parent: FlexSelectItem,
  selection: FlexSelectSelection,
  prev: readonly DropdownSlot[] | undefined,
  options?: { rentArm?: boolean },
): DropdownSlot[] {
  const rentArm = Boolean(options?.rentArm);
  const selected = selectedLinesForItem(parent, selection);

  if (!prev?.length) {
    const hydrated = hydrateDropdownSlots(parent, selection);
    return rentArm ? parkOwnedSlotsForRentArm(parent.id, hydrated) : hydrated;
  }

  if (rentArm) {
    // Keep parked layout stable; only sync cleared / new selection lines.
    const parked = parkOwnedSlotsForRentArm(parent.id, prev);
    const covered = new Set(
      parked
        .filter((s) => s.optionId)
        .map(
          (s) =>
            `${s.rented ? "r" : "o"}:${s.optionId}`,
        ),
    );
    const next = [...parked];
    for (const line of selected) {
      const key = `${line.rented ? "r" : "o"}:${line.optionId}`;
      if (covered.has(key)) continue;
      if (line.rented) {
        next.splice(1, 0, {
          id: lineSlotId(parent.id, line.optionId, true, false),
          optionId: line.optionId,
          isHead: false,
          rented: true,
        });
      } else {
        next.push({
          id: ownedParkSlotId(parent.id, line.optionId),
          optionId: line.optionId,
          isHead: false,
          rented: false,
        });
      }
      covered.add(key);
    }
    // Drop parked owned lines no longer in selection.
    return next.filter((slot) => {
      if (!slot.optionId) return true;
      return (
        dropdownSlotLineQty(selection, slot.optionId, Boolean(slot.rented)) >= 1
      );
    });
  }

  const next: DropdownSlot[] = [];
  const covered = new Set<string>();

  const coverKey = (optionId: string, rented: boolean) =>
    `${rented ? "r" : "o"}:${optionId}`;

  for (const slot of prev) {
    // Drop temporary rent-arm parks when arm is off.
    if (isOwnedParkSlotId(slot.id, parent.id)) continue;

    const rented = Boolean(slot.rented);
    if (
      slot.optionId &&
      dropdownSlotLineQty(selection, slot.optionId, rented) < 1
    ) {
      if (slot.isHead) {
        next.push({ ...slot, optionId: null, rented: false });
      } else if (slot.id === ownedDefaultSlotId(parent.id)) {
        next.push({ ...slot, optionId: null, rented: false });
      }
      // Cleared clone → drop (not a catalog row).
      continue;
    }
    if (slot.optionId) covered.add(coverKey(slot.optionId, rented));
    next.push({ ...slot, rented });
  }

  if (next.length === 0 || !next.some((s) => s.isHead)) {
    next.unshift({
      id: headSlotId(parent.id),
      optionId: null,
      isHead: true,
      rented: false,
    });
  }

  for (const line of selected) {
    const key = coverKey(line.optionId, line.rented);
    if (covered.has(key)) continue;
    next.push({
      id: lineSlotId(parent.id, line.optionId, line.rented, false),
      optionId: line.optionId,
      isHead: false,
      rented: line.rented,
    });
    covered.add(key);
  }

  return ensureOwnedDefaultSlot(parent.id, next);
}

export function acquisitionForSlot(slot: Pick<DropdownSlot, "rented">): ItemAcquisition {
  return slot.rented ? "rented" : "owned";
}
