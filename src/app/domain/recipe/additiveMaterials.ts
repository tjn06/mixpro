import type { AppLanguage } from "../../i18n/language";
import { displayLabel, localizedLabel } from "../../i18n/localizedLabel";

/**
 * Filler (FILLER slot) material options.
 * Sand / Water / Custom — Sand is the default.
 */
export type FillerMaterialKind = "sand" | "water" | "custom";

/** Thickener (THICKENER slot) material options — Tix or Custom. */
export type ThickenerMaterialKind = "tix" | "custom";

export const FILLER_MATERIAL_ORDER: FillerMaterialKind[] = [
  "sand",
  "water",
  "custom",
];

export const THICKENER_MATERIAL_ORDER: ThickenerMaterialKind[] = [
  "tix",
  "custom",
];

const FILLER_MATERIAL_LABELS = {
  sand: localizedLabel("Sand", "Sand"),
  water: localizedLabel("Water", "Vatten"),
  custom: localizedLabel("Custom", "Egen"),
} as const;

const THICKENER_MATERIAL_LABELS = {
  tix: localizedLabel("Tix", "Tix"),
  custom: localizedLabel("Custom", "Egen"),
} as const;

/** Role labels that should still localize via slot id (legacy presets). */
const LEGACY_ROLE_LABELS = new Set([
  "filler",
  "fyllnad",
  "thickener",
  "förtjockare",
  "fortjockare",
]);

export function isLegacyRoleLabel(label: string | undefined): boolean {
  if (!label) return true;
  return LEGACY_ROLE_LABELS.has(label.trim().toLowerCase());
}

export function fillerMaterialOptionLabel(
  kind: FillerMaterialKind,
  language: AppLanguage,
): string {
  return displayLabel(FILLER_MATERIAL_LABELS[kind], language);
}

export function thickenerMaterialOptionLabel(
  kind: ThickenerMaterialKind,
  language: AppLanguage,
): string {
  return displayLabel(THICKENER_MATERIAL_LABELS[kind], language);
}

/** Resolved display name stored on the recipe percent entry. */
export function resolveFillerMaterialLabel(
  kind: FillerMaterialKind,
  customName: string,
  language: AppLanguage,
): string {
  if (kind === "custom") {
    const trimmed = customName.trim();
    return trimmed || fillerMaterialOptionLabel("sand", language);
  }
  return fillerMaterialOptionLabel(kind, language);
}

export function resolveThickenerMaterialLabel(
  kind: ThickenerMaterialKind,
  customName: string,
  language: AppLanguage,
): string {
  if (kind === "custom") {
    const trimmed = customName.trim();
    return trimmed || thickenerMaterialOptionLabel("tix", language);
  }
  return thickenerMaterialOptionLabel(kind, language);
}

/** Infer kind from a stored recipe label (legacy recipes without materialKind). */
export function inferFillerMaterialKind(
  label: string | undefined,
): FillerMaterialKind {
  const n = label?.trim().toLowerCase() ?? "";
  if (!n || isLegacyRoleLabel(n) || n === "sand") return "sand";
  if (n === "water" || n === "vatten") return "water";
  return "custom";
}

export function inferThickenerMaterialKind(
  label: string | undefined,
): ThickenerMaterialKind {
  const n = label?.trim().toLowerCase() ?? "";
  if (!n || isLegacyRoleLabel(n) || n === "tix") return "tix";
  return "custom";
}

const FILLER_KINDS = new Set<FillerMaterialKind>(["sand", "water", "custom"]);
const THICKENER_KINDS = new Set<ThickenerMaterialKind>(["tix", "custom"]);

/**
 * Resolve filler kind from the stored material definition.
 * Prefer `materialKind` ID; fall back to label only for legacy recipes.
 */
export function resolveFillerMaterialKind(entry: {
  materialKind?: string;
  label?: string;
} | null | undefined): FillerMaterialKind {
  const kind = entry?.materialKind;
  if (kind && FILLER_KINDS.has(kind as FillerMaterialKind)) {
    return kind as FillerMaterialKind;
  }
  return inferFillerMaterialKind(entry?.label);
}

/**
 * Resolve thickener kind from the stored material definition.
 * Prefer `materialKind` ID; fall back to label only for legacy recipes.
 */
export function resolveThickenerMaterialKind(entry: {
  materialKind?: string;
  label?: string;
} | null | undefined): ThickenerMaterialKind {
  const kind = entry?.materialKind;
  if (kind && THICKENER_KINDS.has(kind as ThickenerMaterialKind)) {
    return kind as ThickenerMaterialKind;
  }
  return inferThickenerMaterialKind(entry?.label);
}

/**
 * Display subname for a filler percent entry (Sand / Water / custom name).
 * Uses materialKind as source of truth; never returns the role word "Filler".
 */
export function fillerMaterialDisplayLabel(
  entry: { materialKind?: string; label?: string } | null | undefined,
  language: AppLanguage,
): string {
  const kind = resolveFillerMaterialKind(entry);
  if (kind === "custom") {
    const raw = entry?.label?.trim();
    if (raw && !isLegacyRoleLabel(raw)) return raw;
  }
  return fillerMaterialOptionLabel(kind === "custom" ? "sand" : kind, language);
}

/**
 * Display subname for a thickener percent entry (Tix / custom name).
 * Uses materialKind as source of truth; never returns the role word "Thickener".
 */
export function thickenerMaterialDisplayLabel(
  entry: { materialKind?: string; label?: string } | null | undefined,
  language: AppLanguage,
): string {
  const kind = resolveThickenerMaterialKind(entry);
  if (kind === "custom") {
    const raw = entry?.label?.trim();
    if (raw && !isLegacyRoleLabel(raw)) return raw;
  }
  return thickenerMaterialOptionLabel(kind === "custom" ? "tix" : kind, language);
}
