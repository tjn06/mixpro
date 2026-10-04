/**
 * Material-profile resolution layer.
 *
 * Maps recipe additive material kinds → VolumeEngine profiles.
 * Future custom materials register density / grading here without
 * changing the core packing / rest-volume engine.
 */

import type {
  FillerMaterialKind,
  ThickenerMaterialKind,
} from "../recipe/additiveMaterials";
import type { MaterialComponentInput, MaterialProfile } from "./types";
import {
  GENERIC_TIX_PROFILE,
  GENERIC_WATER_PROFILE,
  UNKNOWN_CUSTOM_PROFILE,
  aggregateProfileForSandType,
} from "./profiles";

/** Matches mixer sand grain picker — kept local to avoid volume↔profile cycles. */
type SandGrainType = "fine" | "medium" | "coarse" | "veryCoarse";

/**
 * Optional registry of known custom materials keyed by stable id or
 * normalized display name. Empty in V1 — plug in product-specific
 * density / grading without touching estimateMaterialVolume.
 */
const KNOWN_CUSTOM_MATERIAL_PROFILES: Record<string, MaterialProfile> = {
  // e.g. "company-quartz-0.1-0.5": { id: "...", category: "AGGREGATE", ... }
};

function normalizeCustomKey(raw: string | undefined): string | null {
  const t = raw?.trim().toLowerCase();
  return t ? t : null;
}

/** Look up a known custom profile by id or name; undefined if unknown. */
export function lookupKnownCustomMaterialProfile(
  customIdOrName: string | undefined,
): MaterialProfile | undefined {
  const key = normalizeCustomKey(customIdOrName);
  if (!key) return undefined;
  return KNOWN_CUSTOM_MATERIAL_PROFILES[key];
}

/** Register or replace a custom material profile (tests / future catalog). */
export function registerKnownCustomMaterialProfile(
  customIdOrName: string,
  profile: MaterialProfile,
): void {
  const key = normalizeCustomKey(customIdOrName);
  if (!key) return;
  KNOWN_CUSTOM_MATERIAL_PROFILES[key] = profile;
}

export function unregisterKnownCustomMaterialProfile(
  customIdOrName: string,
): void {
  const key = normalizeCustomKey(customIdOrName);
  if (!key) return;
  delete KNOWN_CUSTOM_MATERIAL_PROFILES[key];
}

/**
 * Resolve filler kind → profile.
 * SAND → graded quartz (sandType selects grading metadata).
 * WATER → generic water.
 * CUSTOM → known physical properties if registered; else unknown/custom
 *   (no quartz / water / epoxy assumptions).
 */
export function profileForFillerKind(
  kind: FillerMaterialKind,
  options?: {
    sandType?: SandGrainType;
    /** Custom material id or stored display label for registry lookup. */
    customKey?: string;
  },
): MaterialProfile {
  switch (kind) {
    case "sand":
      return aggregateProfileForSandType(options?.sandType);
    case "water":
      return GENERIC_WATER_PROFILE;
    case "custom": {
      const known = lookupKnownCustomMaterialProfile(options?.customKey);
      return known ?? UNKNOWN_CUSTOM_PROFILE;
    }
    default:
      return UNKNOWN_CUSTOM_PROFILE;
  }
}

export function profileForThickenerKind(
  kind: ThickenerMaterialKind,
  options?: { customKey?: string },
): MaterialProfile {
  switch (kind) {
    case "tix":
      return GENERIC_TIX_PROFILE;
    case "custom": {
      const known = lookupKnownCustomMaterialProfile(options?.customKey);
      return known ?? UNKNOWN_CUSTOM_PROFILE;
    }
    default:
      return UNKNOWN_CUSTOM_PROFILE;
  }
}

/** Role + profile for a filler mass line. */
export function fillerComponentFromKind(
  id: string,
  massKg: number,
  kind: FillerMaterialKind,
  options?: { sandType?: SandGrainType; customKey?: string },
): MaterialComponentInput {
  const profile = profileForFillerKind(kind, options);
  if (kind === "sand") {
    return { id, massKg, role: "AGGREGATE", profile };
  }
  if (kind === "water") {
    return { id, massKg, role: "WATER", profile };
  }
  // CUSTOM: use known properties when present; otherwise unknown + uncertainty.
  if (profile.category === "UNKNOWN_CUSTOM" || profile.id === "unknown-custom") {
    return { id, massKg, role: "UNKNOWN", profile };
  }
  if (profile.category === "AGGREGATE") {
    return { id, massKg, role: "AGGREGATE", profile };
  }
  if (profile.category === "WATER") {
    return { id, massKg, role: "WATER", profile };
  }
  if (profile.category === "TIX") {
    return { id, massKg, role: "TIX", profile };
  }
  return { id, massKg, role: "OTHER", profile };
}

/** Role + profile for a thickener mass line. */
export function thickenerComponentFromKind(
  id: string,
  massKg: number,
  kind: ThickenerMaterialKind,
  options?: { customKey?: string },
): MaterialComponentInput {
  const profile = profileForThickenerKind(kind, options);
  if (kind === "tix") {
    return { id, massKg, role: "TIX", profile };
  }
  if (profile.category === "UNKNOWN_CUSTOM" || profile.id === "unknown-custom") {
    return { id, massKg, role: "UNKNOWN", profile };
  }
  if (profile.category === "TIX") {
    return { id, massKg, role: "TIX", profile };
  }
  return { id, massKg, role: "OTHER", profile };
}
