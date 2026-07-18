/** Selected flex-select ids mapped to quantity (≥ 1). */
export type FlexSelectSelection = Readonly<Record<string, number>>;

export function emptyFlexSelectSelection(): Record<string, number> {
  return {};
}

/** Unique selected ids (qty ≥ 1). */
export function flexSelectSelectionIds(
  selection: FlexSelectSelection,
): string[] {
  return Object.keys(selection).filter((id) => (selection[id] ?? 0) >= 1);
}

/** Sum of all quantities. */
export function flexSelectSelectionTotal(
  selection: FlexSelectSelection,
): number {
  let total = 0;
  for (const qty of Object.values(selection)) {
    if (qty >= 1) total += qty;
  }
  return total;
}

export function flexSelectQty(
  selection: FlexSelectSelection,
  id: string,
): number {
  const qty = selection[id] ?? 0;
  return qty >= 1 ? qty : 0;
}

/** Migrate legacy id arrays (and optional qty maps) into a clean selection. */
export function normalizeFlexSelectSelection(
  qtys: unknown,
  legacyIds?: unknown,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (qtys && typeof qtys === "object" && !Array.isArray(qtys)) {
    for (const [id, value] of Object.entries(qtys as Record<string, unknown>)) {
      if (!id) continue;
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(n) && n >= 1) out[id] = Math.floor(n);
    }
    return out;
  }
  if (Array.isArray(legacyIds)) {
    for (const id of legacyIds) {
      if (typeof id !== "string" || !id) continue;
      out[id] = (out[id] ?? 0) + 1;
    }
  }
  return out;
}

export function setFlexSelectQty(
  selection: FlexSelectSelection,
  id: string,
  qty: number,
): Record<string, number> {
  const next = { ...selection };
  if (qty < 1) {
    delete next[id];
    return next;
  }
  next[id] = Math.floor(qty);
  return next;
}

export function bumpFlexSelectQty(
  selection: FlexSelectSelection,
  id: string,
  delta: number,
): Record<string, number> {
  const current = flexSelectQty(selection, id);
  return setFlexSelectQty(selection, id, current + delta);
}

/** Select id at qty 1 if missing; leave existing qty untouched. */
export function ensureFlexSelectSelected(
  selection: FlexSelectSelection,
  id: string,
): Record<string, number> {
  if (flexSelectQty(selection, id) >= 1) return { ...selection };
  return setFlexSelectQty(selection, id, 1);
}
