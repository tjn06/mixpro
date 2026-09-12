/** How a selected catalog line was acquired for the job. */
export type ItemAcquisition = "owned" | "rented";

/**
 * Map-key encoding for rented lines (owned keeps the raw catalog id).
 * Domain code should prefer `selectionLineKey` / `parseSelectionLineKey`
 * over string checks elsewhere.
 */
export const RENTED_SELECTION_PREFIX = "acq:rented:";

export function selectionLineKey(
  catalogId: string,
  acquisition: ItemAcquisition,
): string {
  if (!catalogId) return catalogId;
  return acquisition === "rented"
    ? `${RENTED_SELECTION_PREFIX}${catalogId}`
    : catalogId;
}

export function parseSelectionLineKey(key: string): {
  catalogId: string;
  acquisition: ItemAcquisition;
} {
  if (key.startsWith(RENTED_SELECTION_PREFIX)) {
    return {
      catalogId: key.slice(RENTED_SELECTION_PREFIX.length),
      acquisition: "rented",
    };
  }
  return { catalogId: key, acquisition: "owned" };
}

export function isRentedSelectionKey(key: string): boolean {
  return key.startsWith(RENTED_SELECTION_PREFIX);
}

/** Owned + rented selection keys for one catalog / custom item id. */
export function catalogSelectionKeys(catalogId: string): [string, string] {
  return [
    selectionLineKey(catalogId, "owned"),
    selectionLineKey(catalogId, "rented"),
  ];
}

/** Drop owned and rented qty lines for a catalog / custom item. */
export function omitCatalogIdFromSelection(
  selection: Readonly<Record<string, number>>,
  catalogId: string,
): Record<string, number> {
  const [owned, rented] = catalogSelectionKeys(catalogId);
  if (!(owned in selection) && !(rented in selection)) {
    return { ...selection };
  }
  const next = { ...selection };
  delete next[owned];
  delete next[rented];
  return next;
}
