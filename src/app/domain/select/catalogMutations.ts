import { format, parse } from "date-fns";
import { sv } from "date-fns/locale";
import type { AppLanguage } from "../../i18n/language";
import { DEFAULT_UI_LANGUAGE } from "../../i18n/language";
import {
  displayLabel,
  isBilingualCatalogItem,
  isUserCatalogId,
  labelSearchText,
  normalizeItemLabel,
  type ItemLabel,
  type LocalizedLabel,
} from "../../i18n/localizedLabel";
import type { FlexSelectItem } from "./types";

export function cloneFlexSelectItems(
  items: readonly FlexSelectItem[],
): FlexSelectItem[] {
  return items.map((item) => ({
    id: item.id,
    label: cloneLabel(item.label),
    requiresWear: item.requiresWear,
    children: item.children ? cloneFlexSelectItems(item.children) : undefined,
  }));
}

function cloneLabel(label: ItemLabel): ItemLabel {
  if (typeof label === "string") return label;
  return { en: label.en, sv: label.sv };
}

/** Flat rows for edit list / search. */
export type CatalogEditRow = {
  id: string;
  /** Display label in active UI language. */
  label: string;
  /** Raw stored label (string or bilingual). */
  rawLabel: ItemLabel;
  parentId: string | null;
  parentLabel: string | null;
  isGroup: boolean;
  optionCount: number;
  /** True when this row is bilingual admin data (not a user free-text id). */
  bilingual: boolean;
};

export function flattenCatalogForEdit(
  items: readonly FlexSelectItem[],
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
  parent: FlexSelectItem | null = null,
): CatalogEditRow[] {
  const rows: CatalogEditRow[] = [];
  for (const item of items) {
    const optionCount = item.children?.length ?? 0;
    const bilingual = isBilingualCatalogItem(item.id, item.label);
    rows.push({
      id: item.id,
      label: displayLabel(item.label, language),
      rawLabel: item.label,
      parentId: parent?.id ?? null,
      parentLabel: parent
        ? displayLabel(parent.label, language)
        : null,
      isGroup: optionCount > 0,
      optionCount,
      bilingual,
    });
    if (item.children?.length) {
      rows.push(...flattenCatalogForEdit(item.children, language, item));
    }
  }
  return rows;
}

export function catalogRowMatchesQuery(
  row: CatalogEditRow,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${labelSearchText(row.rawLabel)} ${row.parentLabel ?? ""}`.toLowerCase();
  return hay.includes(q);
}

export function updateFlexSelectLabel(
  items: readonly FlexSelectItem[],
  id: string,
  label: ItemLabel,
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

/**
 * Seed catalog (bilingual) + user/admin customs from persisted library.
 * Seed ids always come from code; customs keep their stored labels.
 */
export function mergeSeedCatalogWithUserItems(
  seed: readonly FlexSelectItem[],
  persisted: readonly FlexSelectItem[] | undefined,
): FlexSelectItem[] {
  const customs = (persisted ?? [])
    .filter(
      (item) =>
        isUserCatalogId(item.id) ||
        item.id.startsWith("admin-tool-") ||
        item.id.startsWith("admin-consumable-"),
    )
    .map((item) => ({
      id: item.id,
      label: normalizeItemLabel(item.label),
      requiresWear: item.requiresWear,
      children: item.children
        ? cloneFlexSelectItems(item.children)
        : undefined,
    }));
  return [...cloneFlexSelectItems(seed), ...customs];
}

export function buildCatalogSelectionReport(args: {
  title: string;
  labels: readonly string[];
  comment?: string;
  /** Optional `yyyy-MM-dd` — omitted from the report when unset. */
  workDateId?: string | null;
}): string {
  const lines: string[] = [];
  const trimmed = args.comment?.trim();
  if (trimmed) lines.push(trimmed, "");
  lines.push(args.title);
  const dateId = args.workDateId?.trim();
  if (dateId && /^\d{4}-\d{2}-\d{2}$/.test(dateId)) {
    const parsed = parse(dateId, "yyyy-MM-dd", new Date());
    if (!Number.isNaN(parsed.getTime())) {
      lines.push(`Datum: ${format(parsed, "d MMM yyyy", { locale: sv })}`);
    }
  }
  if (args.labels.length === 0) {
    lines.push("", "No items selected.");
  } else {
    lines.push("");
    for (const label of args.labels) lines.push(`• ${label}`);
  }
  return lines.join("\n");
}

export type { LocalizedLabel };
