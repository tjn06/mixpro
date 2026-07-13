import type { SavedMixSnapshot } from "./types";
import { PRESET_RECIPES, recipeMenuLabel } from "../domain/recipe/types";
import { BASE_CONFIG_DISPLAY_NAME } from "./display";

export type MetaNameKind = "reserved" | "taken";

export const MAX_RECENT_SKIPPED = 10;

/** Normalized lookup maps — O(1) membership checks with display labels for errors. */
export type MetaNameRegistry = {
  readonly reserved: ReadonlyMap<string, string>;
  readonly taken: ReadonlyMap<string, string>;
  /** Session-only skips — blocks generation, not manual save validation. */
  readonly recent: ReadonlyMap<string, string>;
};

export function normalizeMetaName(value: string): string {
  return value.trim().toLowerCase();
}

export function getReservedMetaNames(): string[] {
  const recipeLabels = PRESET_RECIPES.map(recipeMenuLabel);
  return [...new Set([...recipeLabels, BASE_CONFIG_DISPLAY_NAME])];
}

function addToMap(map: Map<string, string>, raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed) return;
  const key = normalizeMetaName(trimmed);
  if (!map.has(key)) map.set(key, trimmed);
}

export function buildRecentMetaNamesFromList(
  names: Iterable<string>,
  max = MAX_RECENT_SKIPPED,
): Map<string, string> {
  const recent = new Map<string, string>();

  for (const name of names) {
    addToMap(recent, name);
    if (recent.size >= max) break;
  }

  return recent;
}

/** Ring buffer of recently skipped suggestions (newest first). */
export function appendRecentSkipped(
  current: readonly string[],
  skipped: string,
  max = MAX_RECENT_SKIPPED,
): string[] {
  const trimmed = skipped.trim();
  if (!trimmed) return [...current];

  const skippedKey = normalizeMetaName(trimmed);
  const rest = current.filter((name) => normalizeMetaName(name) !== skippedKey);
  return [trimmed, ...rest].slice(0, max);
}

export function createMetaNameRegistry(options?: {
  reservedNames?: Iterable<string>;
  taken?: ReadonlyMap<string, string>;
  takenNames?: Iterable<string>;
  recent?: ReadonlyMap<string, string>;
  recentlySkipped?: Iterable<string>;
}): MetaNameRegistry {
  const reserved = new Map<string, string>();
  const taken = new Map<string, string>();
  let recent = new Map<string, string>();

  for (const name of options?.reservedNames ?? getReservedMetaNames()) {
    addToMap(reserved, name);
  }

  if (options?.taken) {
    for (const [key, label] of options.taken) {
      if (key) taken.set(key, label);
    }
  }

  for (const name of options?.takenNames ?? []) {
    addToMap(taken, name);
  }

  if (options?.recent) {
    recent = new Map(options.recent);
  } else if (options?.recentlySkipped) {
    recent = buildRecentMetaNamesFromList(options.recentlySkipped);
  }

  return { reserved, taken, recent };
}

/** Custom meta names already saved — optionally skip one mix (update/rename). */
export function buildTakenMetaNamesFromMixes(
  mixes: readonly SavedMixSnapshot[],
  excludeMixId?: string,
): Map<string, string> {
  const taken = new Map<string, string>();

  for (const mix of mixes) {
    if (excludeMixId != null && mix.id === excludeMixId) continue;
    const meta = mix.metaName?.trim();
    if (!meta) continue;
    addToMap(taken, meta);
  }

  return taken;
}

export function createMetaNameRegistryFromMixes(
  mixes: readonly SavedMixSnapshot[],
  excludeMixId?: string,
): MetaNameRegistry {
  return createMetaNameRegistry({
    taken: buildTakenMetaNamesFromMixes(mixes, excludeMixId),
  });
}

export function withRecentSkipped(
  registry: MetaNameRegistry,
  recentlySkipped?: Iterable<string>,
): MetaNameRegistry {
  if (recentlySkipped == null) return registry;

  const recent = buildRecentMetaNamesFromList(recentlySkipped);
  if (recent.size === 0 && registry.recent.size === 0) return registry;

  return { ...registry, recent };
}

export function metaNameLookupKind(
  name: string,
  registry: MetaNameRegistry,
): MetaNameKind | null {
  const key = normalizeMetaName(name);
  if (!key) return null;
  if (registry.reserved.has(key)) return "reserved";
  if (registry.taken.has(key)) return "taken";
  return null;
}

/** Reserved + taken — used for save validation. */
export function isMetaNameUnavailable(
  name: string,
  registry: MetaNameRegistry,
): boolean {
  return metaNameLookupKind(name, registry) != null;
}

/** Reserved + taken + recent — used when generating suggestions. */
export function isMetaNameBlockedForGeneration(
  name: string,
  registry: MetaNameRegistry,
): boolean {
  const key = normalizeMetaName(name);
  if (!key) return true;
  return (
    registry.reserved.has(key) ||
    registry.taken.has(key) ||
    registry.recent.has(key)
  );
}

export function metaNameDisplayLabel(
  name: string,
  registry: MetaNameRegistry,
  kind: MetaNameKind,
): string {
  const key = normalizeMetaName(name);
  return registry[kind].get(key) ?? name.trim();
}

export function ensureMetaNameRegistry(
  registry: Partial<MetaNameRegistry> & Pick<MetaNameRegistry, "reserved" | "taken">,
): MetaNameRegistry {
  return {
    reserved: registry.reserved,
    taken: registry.taken,
    recent: registry.recent ?? new Map(),
  };
}
