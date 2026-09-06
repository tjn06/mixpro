import { format, parse } from "date-fns";
import type { SessionDatedQtyEntry } from "../../sessions/types";

/** Calendar day key used for session filtering (local timezone). */
export type SessionWorkDateId = string; // yyyy-MM-dd

export function localWorkDateId(date = new Date()): SessionWorkDateId {
  return format(date, "yyyy-MM-dd");
}

/** Slice an ISO timestamp to a local calendar day. */
export function workDateIdFromIso(iso: string, fallback = new Date()): SessionWorkDateId {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return localWorkDateId(fallback);
  return localWorkDateId(d);
}

export function parseWorkDateId(
  id: SessionWorkDateId,
  fallback = new Date(),
): Date {
  const parsed = parse(id, "yyyy-MM-dd", fallback);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function normalizeDatedQtyEntries(raw: unknown): SessionDatedQtyEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: SessionDatedQtyEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const optionId =
      typeof (row as { optionId?: unknown }).optionId === "string"
        ? (row as { optionId: string }).optionId
        : "";
    const workDate =
      typeof (row as { workDate?: unknown }).workDate === "string"
        ? (row as { workDate: string }).workDate
        : "";
    const qtyRaw = (row as { qty?: unknown }).qty;
    const qty = typeof qtyRaw === "number" ? qtyRaw : Number(qtyRaw);
    if (!optionId || !workDate || !Number.isFinite(qty) || qty < 1) continue;
    out.push({ optionId, workDate, qty: Math.floor(qty) });
  }
  return out;
}

/** Legacy flat qty map → one entry per id on `workDate`. */
export function datedEntriesFromQtyMap(
  qtys: Record<string, number>,
  workDate: SessionWorkDateId,
): SessionDatedQtyEntry[] {
  const out: SessionDatedQtyEntry[] = [];
  for (const [optionId, qty] of Object.entries(qtys)) {
    if (!optionId || qty < 1) continue;
    out.push({ optionId, workDate, qty: Math.floor(qty) });
  }
  return out;
}

export function qtyMapFromDatedEntries(
  entries: readonly SessionDatedQtyEntry[],
  dayFilter: SessionWorkDateId | "all",
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.qty < 1) continue;
    if (dayFilter !== "all" && entry.workDate !== dayFilter) continue;
    out[entry.optionId] = (out[entry.optionId] ?? 0) + entry.qty;
  }
  return out;
}

export function datedEntriesTotal(
  entries: readonly SessionDatedQtyEntry[],
  dayFilter: SessionWorkDateId | "all" = "all",
): number {
  let total = 0;
  for (const entry of entries) {
    if (entry.qty < 1) continue;
    if (dayFilter !== "all" && entry.workDate !== dayFilter) continue;
    total += entry.qty;
  }
  return total;
}

/**
 * Replace all entries for `workDate` with `nextMap`.
 * Other days are left untouched.
 */
export function replaceDatedQtyMapForDay(
  entries: readonly SessionDatedQtyEntry[],
  workDate: SessionWorkDateId,
  nextMap: Record<string, number>,
): SessionDatedQtyEntry[] {
  const kept = entries.filter((e) => e.workDate !== workDate);
  return [...kept, ...datedEntriesFromQtyMap(nextMap, workDate)];
}

/** Move every entry from `fromDay` → `toDay` (merge qty on collision). */
export function moveDatedEntriesDay(
  entries: readonly SessionDatedQtyEntry[],
  fromDay: SessionWorkDateId,
  toDay: SessionWorkDateId,
): SessionDatedQtyEntry[] {
  if (fromDay === toDay) return [...entries];
  const map = new Map<string, SessionDatedQtyEntry>();
  for (const entry of entries) {
    const workDate = entry.workDate === fromDay ? toDay : entry.workDate;
    const key = `${workDate}::${entry.optionId}`;
    const prev = map.get(key);
    if (prev) {
      map.set(key, { ...prev, qty: prev.qty + entry.qty });
    } else {
      map.set(key, { ...entry, workDate });
    }
  }
  return [...map.values()];
}

/**
 * When the day filter is "all", pickers show aggregated qty.
 * Apply per-id deltas onto `focusDay` so other days stay intact.
 */
export function applyDatedQtyAggregateDelta(
  entries: readonly SessionDatedQtyEntry[],
  focusDay: SessionWorkDateId,
  prevAggregate: Record<string, number>,
  nextAggregate: Record<string, number>,
): SessionDatedQtyEntry[] {
  const ids = new Set([
    ...Object.keys(prevAggregate),
    ...Object.keys(nextAggregate),
  ]);
  let next = [...entries];
  for (const optionId of ids) {
    const delta = (nextAggregate[optionId] ?? 0) - (prevAggregate[optionId] ?? 0);
    if (delta === 0) continue;
    const idx = next.findIndex(
      (e) => e.optionId === optionId && e.workDate === focusDay,
    );
    if (idx >= 0) {
      const qty = next[idx].qty + delta;
      if (qty < 1) next = next.filter((_, i) => i !== idx);
      else next[idx] = { ...next[idx], qty };
    } else if (delta > 0) {
      next.push({ optionId, qty: delta, workDate: focusDay });
    }
  }
  return next;
}

export function collectSessionWorkDateIds(input: {
  batches?: readonly { workDate?: string }[];
  toolEntries?: readonly SessionDatedQtyEntry[];
  consumableEntries?: readonly SessionDatedQtyEntry[];
  activeWorkDate?: string;
  extraDayIds?: readonly string[];
}): SessionWorkDateId[] {
  const ids = new Set<string>();
  for (const batch of input.batches ?? []) {
    if (batch.workDate) ids.add(batch.workDate);
  }
  for (const entry of input.toolEntries ?? []) {
    if (entry.workDate) ids.add(entry.workDate);
  }
  for (const entry of input.consumableEntries ?? []) {
    if (entry.workDate) ids.add(entry.workDate);
  }
  if (input.activeWorkDate) ids.add(input.activeWorkDate);
  for (const id of input.extraDayIds ?? []) {
    if (id) ids.add(id);
  }
  return [...ids];
}
