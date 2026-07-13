import type { BatchNameInput } from "../batch-names";
import { generateBatchName } from "../batch-names";
import {
  createMetaNameRegistry,
  ensureMetaNameRegistry,
  isMetaNameBlockedForGeneration,
  metaNameDisplayLabel,
  metaNameLookupKind,
  withRecentSkipped,
  type MetaNameRegistry,
} from "./metaNameRegistry";

export {
  appendRecentSkipped,
  buildRecentMetaNamesFromList,
  buildTakenMetaNamesFromMixes,
  createMetaNameRegistry,
  createMetaNameRegistryFromMixes,
  getReservedMetaNames,
  isMetaNameBlockedForGeneration,
  isMetaNameUnavailable,
  MAX_RECENT_SKIPPED,
  metaNameLookupKind,
  normalizeMetaName,
  type MetaNameKind,
  type MetaNameRegistry,
} from "./metaNameRegistry";

function resolveRegistry(
  registryOrReserved?: MetaNameRegistry | Iterable<string>,
): MetaNameRegistry {
  if (
    registryOrReserved != null &&
    typeof registryOrReserved === "object" &&
    "reserved" in registryOrReserved &&
    "taken" in registryOrReserved
  ) {
    return ensureMetaNameRegistry(registryOrReserved as MetaNameRegistry);
  }

  return createMetaNameRegistry({
    reservedNames: registryOrReserved as Iterable<string> | undefined,
  });
}

/** Empty input is allowed (no custom label). Non-empty must not match reserved or taken names. */
export function validateMetaName(
  input: string,
  registryOrReserved: MetaNameRegistry | Iterable<string> = createMetaNameRegistry(),
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const registry = resolveRegistry(registryOrReserved);
  const kind = metaNameLookupKind(trimmed, registry);
  if (kind == null) return null;

  const label = metaNameDisplayLabel(trimmed, registry, kind);
  if (kind === "reserved") {
    return `Cannot use a recipe or admin name (“${label}”)`;
  }

  return `That name is already used by another saved mix (“${label}”)`;
}

const MAX_GENERATION_ATTEMPTS = 64;
const MAX_SUFFIX = 999;

/**
 * Context-aware batch label from the pure batch-names algorithm.
 * Retries when reserved, taken, or recently skipped names are hit.
 */
export function generateMixMetaName(
  input: BatchNameInput,
  variation = 0,
  registryOrReserved: MetaNameRegistry | Iterable<string> = createMetaNameRegistry(),
  recentlySkipped?: Iterable<string>,
): string {
  const registry = withRecentSkipped(
    resolveRegistry(registryOrReserved),
    recentlySkipped,
  );

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateBatchName(input, variation + attempt);
    if (!isMetaNameBlockedForGeneration(candidate, registry)) return candidate;
  }

  const base = generateBatchName(input, variation);
  for (let suffix = 2; suffix <= MAX_SUFFIX; suffix += 1) {
    const candidate = `${base} ${suffix}`;
    if (!isMetaNameBlockedForGeneration(candidate, registry)) return candidate;
  }

  return `${base} ${variation + MAX_SUFFIX}`;
}
