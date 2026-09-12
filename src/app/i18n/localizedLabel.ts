import type { AppLanguage } from "./language";
import { DEFAULT_UI_LANGUAGE } from "./language";

/** Admin / seed catalog copy — both languages required. */
export type LocalizedLabel = {
  en: string;
  sv: string;
};

/**
 * Catalog display name:
 * - `LocalizedLabel` for admin/preset data (follows UI language)
 * - `string` for user-entered names (stored exactly as typed)
 */
export type ItemLabel = string | LocalizedLabel;

export function isLocalizedLabel(value: unknown): value is LocalizedLabel {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as LocalizedLabel).en === "string" &&
    typeof (value as LocalizedLabel).sv === "string"
  );
}

/** Resolve a label for display in the given language.
 * If the requested side is empty/missing, falls back to the other language.
 */
export function displayLabel(
  label: ItemLabel | null | undefined,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): string {
  if (label == null) return "";
  if (typeof label === "string") return label;
  const primary = label[language]?.trim();
  if (primary) return primary;
  const other: AppLanguage = language === "sv" ? "en" : "sv";
  return label[other]?.trim() || label.sv?.trim() || label.en?.trim() || "";
}

/** All language variants joined for search matching. */
export function labelSearchText(label: ItemLabel | null | undefined): string {
  if (label == null) return "";
  if (typeof label === "string") return label;
  return `${label.en} ${label.sv}`;
}

/** Character length for layout heuristics (prefer active language). */
export function labelLength(
  label: ItemLabel | null | undefined,
  language: AppLanguage = DEFAULT_UI_LANGUAGE,
): number {
  return displayLabel(label, language).length;
}

export function localizedLabel(
  en: string,
  sv: string,
): LocalizedLabel {
  return { en, sv };
}

/** Same text in both languages (brand / technical names). */
export function sameLabel(text: string): LocalizedLabel {
  return { en: text, sv: text };
}

/**
 * User-scoped catalog ids (session custom or Edit-tab freeform before bilingual).
 * Prefixed ids always store a single free-text `string` label.
 */
export function isUserCatalogId(id: string): boolean {
  return id.startsWith("tool-") || id.startsWith("consumable-");
}

/** Admin-added bilingual catalog entries (Edit tab). */
export function isAdminCatalogId(id: string): boolean {
  return id.startsWith("admin-tool-") || id.startsWith("admin-consumable-");
}

/** True when the row should edit EN+SV (seed or admin-added). */
export function isBilingualCatalogItem(
  id: string,
  label: unknown,
): boolean {
  if (isUserCatalogId(id)) return false;
  if (isAdminCatalogId(id)) return true;
  return isLocalizedLabel(label);
}

/** Normalize persisted label — keep strings; accept {en,sv}; coerce legacy. */
export function normalizeItemLabel(value: unknown): ItemLabel {
  if (typeof value === "string") return value;
  if (isLocalizedLabel(value)) {
    return {
      en: value.en.trim(),
      sv: value.sv.trim(),
    };
  }
  return "";
}

/** Build bilingual label from edit fields (requires at least one side). */
export function bilingualFromFields(
  en: string,
  sv: string,
): LocalizedLabel | null {
  const e = en.trim();
  const s = sv.trim();
  if (!e && !s) return null;
  if (e && s) return { en: e, sv: s };
  const only = e || s;
  return { en: only, sv: only };
}
