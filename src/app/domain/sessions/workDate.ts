import { format, parse } from "date-fns";
import { catalogSelectionKeys } from "../select/acquisition";
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
    const commentRaw = (row as { comment?: unknown }).comment;
    const comment =
      typeof commentRaw === "string" ? commentRaw.trim() : "";
    out.push(
      comment
        ? { optionId, workDate, qty: Math.floor(qty), comment }
        : { optionId, workDate, qty: Math.floor(qty) },
    );
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
 * Other days are left untouched. Preserves comments for matching option ids.
 */
export function replaceDatedQtyMapForDay(
  entries: readonly SessionDatedQtyEntry[],
  workDate: SessionWorkDateId,
  nextMap: Record<string, number>,
): SessionDatedQtyEntry[] {
  const prevComments = new Map<string, string>();
  for (const entry of entries) {
    if (entry.workDate !== workDate) continue;
    const comment = entry.comment?.trim();
    if (comment) prevComments.set(entry.optionId, comment);
  }
  const kept = entries.filter((e) => e.workDate !== workDate);
  const next: SessionDatedQtyEntry[] = [];
  for (const [optionId, qty] of Object.entries(nextMap)) {
    if (!optionId || qty < 1) continue;
    const comment = prevComments.get(optionId);
    next.push(
      comment
        ? { optionId, workDate, qty: Math.floor(qty), comment }
        : { optionId, workDate, qty: Math.floor(qty) },
    );
  }
  return [...kept, ...next];
}

/** Comments for lines on a day (or any day when filter is `all`). */
export function commentMapFromDatedEntries(
  entries: readonly SessionDatedQtyEntry[],
  dayFilter: SessionWorkDateId | "all",
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const entry of entries) {
    if (dayFilter !== "all" && entry.workDate !== dayFilter) continue;
    const comment = entry.comment?.trim();
    if (!comment) continue;
    out[entry.optionId] = comment;
  }
  return out;
}

/** Remove owned + rented lines for a catalog / custom item across all days. */
export function omitCatalogIdFromDatedEntries(
  entries: readonly SessionDatedQtyEntry[],
  catalogId: string,
): SessionDatedQtyEntry[] {
  const keys = new Set(catalogSelectionKeys(catalogId));
  return entries.filter((entry) => !keys.has(entry.optionId));
}

/** Set or clear a comment on one day-scoped line. */
export function setDatedEntryComment(
  entries: readonly SessionDatedQtyEntry[],
  workDate: SessionWorkDateId,
  optionId: string,
  comment: string | null,
): SessionDatedQtyEntry[] {
  const trimmed = comment?.trim() ?? "";
  return entries.map((entry) => {
    if (entry.workDate !== workDate || entry.optionId !== optionId) return entry;
    if (!trimmed) {
      if (entry.comment == null) return entry;
      return { optionId: entry.optionId, qty: entry.qty, workDate: entry.workDate };
    }
    if (entry.comment === trimmed) return entry;
    return { ...entry, comment: trimmed };
  });
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
      const comment =
        prev.comment?.trim() || entry.comment?.trim() || undefined;
      map.set(key, {
        optionId: prev.optionId,
        workDate,
        qty: prev.qty + entry.qty,
        ...(comment ? { comment } : {}),
      });
    } else {
      map.set(key, { ...entry, workDate });
    }
  }
  return [...map.values()];
}

/**
 * When the day filter is "all", pickers show aggregated qty.
 * Apply per-id deltas onto `focusDay` first; leftover removals drain
 * other days so the user can clear a selection completely.
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
    const delta =
      (nextAggregate[optionId] ?? 0) - (prevAggregate[optionId] ?? 0);
    if (delta === 0) continue;

    if (delta > 0) {
      const idx = next.findIndex(
        (e) => e.optionId === optionId && e.workDate === focusDay,
      );
      if (idx >= 0) {
        next[idx] = { ...next[idx], qty: next[idx].qty + delta };
      } else {
        next.push({ optionId, qty: delta, workDate: focusDay });
      }
      continue;
    }

    let remaining = -delta;
    const focusIdx = next.findIndex(
      (e) => e.optionId === optionId && e.workDate === focusDay,
    );
    if (focusIdx >= 0) {
      const qty = next[focusIdx].qty;
      if (qty <= remaining) {
        remaining -= qty;
        next = next.filter((_, i) => i !== focusIdx);
      } else {
        next[focusIdx] = { ...next[focusIdx], qty: qty - remaining };
        remaining = 0;
      }
    }

    while (remaining > 0) {
      const idx = next.findIndex((e) => e.optionId === optionId);
      if (idx < 0) break;
      const qty = next[idx].qty;
      if (qty <= remaining) {
        remaining -= qty;
        next = next.filter((_, i) => i !== idx);
      } else {
        next[idx] = { ...next[idx], qty: qty - remaining };
        remaining = 0;
      }
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
