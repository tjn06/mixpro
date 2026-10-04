import {
  FILLER_SLOT_ID,
  THICKENER_SLOT_ID,
  isFillerSlotId,
  isThickenerSlotId,
} from "../mix/slotMigration";
import {
  resolveFillerMaterialKind,
  resolveThickenerMaterialKind,
} from "../recipe/additiveMaterials";
import type { BlendingRecipe } from "../recipe/types";
import { MIX_VALUE_ORDER } from "../recipe/calc";
import { estimateMaterialVolume, toLegacyVolumeView } from "./estimate";
import { GENERIC_EPOXY_PROFILE, UNKNOWN_CUSTOM_PROFILE } from "./profiles";
import {
  fillerComponentFromKind,
  thickenerComponentFromKind,
} from "./resolveProfile";
import type {
  LegacyVolumeView,
  MaterialComponentInput,
  MaterialRecipeInput,
  VolumeEstimate,
} from "./types";

type SandGrainType = "fine" | "medium" | "coarse" | "veryCoarse";

function slotGrams(values: number[], id: string): number {
  const idx = MIX_VALUE_ORDER.indexOf(id as (typeof MIX_VALUE_ORDER)[number]);
  if (idx < 0) return 0;
  return Math.max(0, values[idx] ?? 0);
}

/**
 * Build material-volume inputs from live mixer values + recipe material kinds.
 *
 * - A + B → epoxy binder (always)
 * - C → unknown/other unless caller marks binder (V1: not binder)
 * - FILLER by additiveMaterials materialKind (not display label):
 *     sand → GenericGradedQuartz, water → GenericWater,
 *     custom → known properties if registered else unknown + uncertainty
 * - THICKENER → tix solid profile, or custom via resolveProfile
 */
export function materialRecipeFromMix(params: {
  recipe: BlendingRecipe;
  /** Mix vector: TOTAL, A, B, C, THICKENER, FILLER (grams). */
  values: number[];
  sandType?: SandGrainType;
  /** Future: treat C as part of reactive binder system. */
  treatCAsBinder?: boolean;
}): MaterialRecipeInput {
  const { recipe, values, sandType, treatCAsBinder = false } = params;
  const components: MaterialComponentInput[] = [];

  const aG = slotGrams(values, "A");
  const bG = slotGrams(values, "B");
  const cG = slotGrams(values, "C");
  const tixG = slotGrams(values, THICKENER_SLOT_ID);
  const fillerG = slotGrams(values, FILLER_SLOT_ID);

  if (aG > 0) {
    components.push({
      id: "A",
      massKg: aG / 1000,
      role: "BINDER",
      profile: GENERIC_EPOXY_PROFILE,
    });
  }
  if (bG > 0) {
    components.push({
      id: "B",
      massKg: bG / 1000,
      role: "BINDER",
      profile: GENERIC_EPOXY_PROFILE,
    });
  }

  if (cG > 0) {
    if (treatCAsBinder) {
      components.push({
        id: "C",
        massKg: cG / 1000,
        role: "BINDER",
        profile: GENERIC_EPOXY_PROFILE,
      });
    } else {
      components.push({
        id: "C",
        massKg: cG / 1000,
        role: "UNKNOWN",
        profile: UNKNOWN_CUSTOM_PROFILE,
      });
    }
  }

  if (fillerG > 0) {
    const entry = recipe.binderPercents.find((p) => isFillerSlotId(p.id));
    const kind = resolveFillerMaterialKind(entry);
    components.push(
      fillerComponentFromKind(FILLER_SLOT_ID, fillerG / 1000, kind, {
        sandType,
        customKey: entry?.label,
      }),
    );
  }

  if (tixG > 0) {
    const entry = recipe.binderPercents.find((p) => isThickenerSlotId(p.id));
    const kind = resolveThickenerMaterialKind(entry);
    components.push(
      thickenerComponentFromKind(THICKENER_SLOT_ID, tixG / 1000, kind, {
        customKey: entry?.label,
      }),
    );
  }

  return { components, includeExplicitBinderExtras: treatCAsBinder };
}

/** Authoritative estimate from mixer state. */
export function estimateMaterialVolumeFromMix(params: {
  recipe: BlendingRecipe;
  values: number[];
  sandType?: SandGrainType;
  treatCAsBinder?: boolean;
}): VolumeEstimate {
  return estimateMaterialVolume(materialRecipeFromMix(params));
}

/** Legacy-shaped view for MixBucket / limits during migration. */
export function estimateLegacyVolumeFromMix(params: {
  recipe: BlendingRecipe;
  values: number[];
  sandType?: SandGrainType;
  treatCAsBinder?: boolean;
}): LegacyVolumeView {
  return toLegacyVolumeView(estimateMaterialVolumeFromMix(params));
}
