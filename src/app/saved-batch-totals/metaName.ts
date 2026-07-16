import {
  createMetaNameRegistry,
  normalizeMetaName,
  type MetaNameRegistry,
} from "../saved-mixes/metaNameRegistry";
import type { SavedBatchTotalsSnapshot } from "./types";

function addTaken(map: Map<string, string>, raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed) return;
  const key = normalizeMetaName(trimmed);
  if (!map.has(key)) map.set(key, trimmed);
}

/** Custom meta names already saved — optionally skip one entry (update/rename). */
export function buildTakenMetaNamesFromBatchTotals(
  entries: readonly SavedBatchTotalsSnapshot[],
  excludeId?: string,
): Map<string, string> {
  const taken = new Map<string, string>();

  for (const entry of entries) {
    if (excludeId != null && entry.id === excludeId) continue;
    const meta = entry.metaName?.trim();
    if (!meta) continue;
    addTaken(taken, meta);
  }

  return taken;
}

export function createMetaNameRegistryFromBatchTotals(
  entries: readonly SavedBatchTotalsSnapshot[],
  excludeId?: string,
): MetaNameRegistry {
  return createMetaNameRegistry({
    taken: buildTakenMetaNamesFromBatchTotals(entries, excludeId),
  });
}
