import type { FlexSelectItem } from "./types";

export function cloneFlexSelectItems(
  items: readonly FlexSelectItem[],
): FlexSelectItem[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    requiresWear: item.requiresWear,
    children: item.children ? cloneFlexSelectItems(item.children) : undefined,
  }));
}

/** Flat rows for edit list / search. */
export type CatalogEditRow = {
  id: string;
  label: string;
  parentId: string | null;
  parentLabel: string | null;
  isGroup: boolean;
  optionCount: number;
};

export function flattenCatalogForEdit(
  items: readonly FlexSelectItem[],
  parent: FlexSelectItem | null = null,
): CatalogEditRow[] {
  const rows: CatalogEditRow[] = [];
  for (const item of items) {
    const optionCount = item.children?.length ?? 0;
    rows.push({
      id: item.id,
      label: item.label,
      parentId: parent?.id ?? null,
      parentLabel: parent?.label ?? null,
      isGroup: optionCount > 0,
      optionCount,
    });
    if (item.children?.length) {
      rows.push(...flattenCatalogForEdit(item.children, item));
    }
  }
  return rows;
}

export function updateFlexSelectLabel(
  items: readonly FlexSelectItem[],
  id: string,
  label: string,
): FlexSelectItem[] {
  return items.map((item) => {
    if (item.id === id) return { ...item, label };
    if (!item.children?.length) return item;
    return {
      ...item,
      children: updateFlexSelectLabel(item.children, id, label),
    };
  });
}

export function removeFlexSelectItem(
  items: readonly FlexSelectItem[],
  id: string,
): FlexSelectItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) =>
      item.children?.length
        ? { ...item, children: removeFlexSelectItem(item.children, id) }
        : item,
    );
}

export function addRootFlexSelectItem(
  items: readonly FlexSelectItem[],
  item: FlexSelectItem,
): FlexSelectItem[] {
  return [...items, item];
}

export function buildCatalogSelectionReport(args: {
  title: string;
  labels: readonly string[];
  comment?: string;
}): string {
  const lines: string[] = [];
  const trimmed = args.comment?.trim();
  if (trimmed) lines.push(trimmed, "");
  lines.push(args.title);
  if (args.labels.length === 0) {
    lines.push("No items selected.");
  } else {
    for (const label of args.labels) lines.push(`· ${label}`);
  }
  return lines.join("\n");
}
