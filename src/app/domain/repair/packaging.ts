/**
 * Commercial package rounding for Repair material buy lists.
 * Sand by bag kg; each epoxy component (A/B/C) by its own can/bucket liters.
 * Partial last package: fullCount + remainder (not a forced full bag).
 */

import { DEFAULT_EPOXY_DENSITY_KG_PER_L } from "../material-volume/constants";
import {
  mixFillerGrams,
  recipeHasIngredient,
} from "../recipe/calc";
import type { BlendingRecipe } from "../recipe/types";

export const SAND_PACKAGE_PRESETS_KG = [20, 25] as const;
export const EPOXY_PACKAGE_PRESETS_L = [10, 15] as const;

export type PackagePlan = {
  /** Amount required in the package unit (kg or L). */
  required: number;
  packageSize: number;
  /** Completely filled packages. */
  fullCount: number;
  /** Remainder after full packages (same unit). 0 if exact. */
  partialAmount: number;
  /** partialAmount / packageSize (0–1). */
  partialFraction: number;
  /** Whole packages if buying only sealed units (ceil). */
  buyWholeCount: number;
  /** buyWholeCount × packageSize. */
  coveredIfWhole: number;
};

export type PackageFractionHint =
  | "NONE"
  | "QUARTER"
  | "THIRD"
  | "HALF"
  | "TWO_THIRDS"
  | "THREE_QUARTERS"
  | "CUSTOM";

/** Snap remainder fraction to a friendly label when close. */
export function packageFractionHint(fraction: number): PackageFractionHint {
  if (!(fraction > 0.02)) return "NONE";
  if (Math.abs(fraction - 0.25) <= 0.07) return "QUARTER";
  if (Math.abs(fraction - 1 / 3) <= 0.07) return "THIRD";
  if (Math.abs(fraction - 0.5) <= 0.08) return "HALF";
  if (Math.abs(fraction - 2 / 3) <= 0.07) return "TWO_THIRDS";
  if (Math.abs(fraction - 0.75) <= 0.07) return "THREE_QUARTERS";
  return "CUSTOM";
}

export function planPackages(
  required: number,
  packageSize: number,
): PackagePlan {
  const req = Number.isFinite(required) && required > 0 ? required : 0;
  const size = Number.isFinite(packageSize) && packageSize > 0 ? packageSize : 0;
  if (!(req > 0) || !(size > 0)) {
    return {
      required: req,
      packageSize: size,
      fullCount: 0,
      partialAmount: 0,
      partialFraction: 0,
      buyWholeCount: 0,
      coveredIfWhole: 0,
    };
  }
  const fullCount = Math.floor(req / size + 1e-9);
  const partialAmount = Math.max(0, req - fullCount * size);
  const almostEmpty = partialAmount < size * 0.02;
  const buyWholeCount = Math.ceil(req / size - 1e-9);
  return {
    required: req,
    packageSize: size,
    fullCount,
    partialAmount: almostEmpty ? 0 : partialAmount,
    partialFraction: almostEmpty ? 0 : partialAmount / size,
    buyWholeCount,
    coveredIfWhole: buyWholeCount * size,
  };
}

/** Component grams → liters at epoxy density. */
export function epoxyLitersFromGrams(
  grams: number,
  densityKgPerL: number = DEFAULT_EPOXY_DENSITY_KG_PER_L,
): number {
  if (!(grams > 0) || !(densityKgPerL > 0)) return 0;
  return grams / 1000 / densityKgPerL;
}

export type PackagingComponent = {
  id: "A" | "B" | "C" | "FILLER";
  /** Grams required for the selected material solve. */
  grams: number;
};

/** One epoxy component sold in its own can/bucket. */
export type BinderPackageLine = {
  id: "A" | "B" | "C";
  grams: number;
  liters: number;
  plan: PackagePlan;
};

export type RepairPackagingReport = {
  sandKg: number;
  densityKgPerL: number;
  components: PackagingComponent[];
  sand: PackagePlan;
  /** A / B / C each planned against the same can size (separate packages). */
  binders: BinderPackageLine[];
};

function binderMasses(
  recipe: BlendingRecipe,
  values: number[],
): { id: "A" | "B" | "C"; grams: number }[] {
  const out: { id: "A" | "B" | "C"; grams: number }[] = [];
  const push = (id: "A" | "B" | "C", grams: number) => {
    if (!(grams > 0)) return;
    out.push({ id, grams });
  };
  if (recipeHasIngredient(recipe, "A")) push("A", values[1] ?? 0);
  if (recipeHasIngredient(recipe, "B")) push("B", values[2] ?? 0);
  if (recipeHasIngredient(recipe, "C")) push("C", values[3] ?? 0);
  return out;
}

export function buildRepairPackagingReport(input: {
  recipe: BlendingRecipe;
  /** Mix vector TOTAL,A,B,C,THICKENER,FILLER (grams). */
  values: number[];
  sandPackageKg: number;
  /** Can/bucket size applied independently to each binder component. */
  epoxyPackageL: number;
  densityKgPerL?: number;
}): RepairPackagingReport {
  const densityKgPerL =
    input.densityKgPerL ?? DEFAULT_EPOXY_DENSITY_KG_PER_L;
  const sandKg = mixFillerGrams(input.recipe, input.values) / 1000;
  const binderMass = binderMasses(input.recipe, input.values);
  const fillerG = mixFillerGrams(input.recipe, input.values);
  const components: PackagingComponent[] = [
    ...binderMass,
    ...(fillerG > 0 ? [{ id: "FILLER" as const, grams: fillerG }] : []),
  ];

  const sand = planPackages(sandKg, input.sandPackageKg);
  const binders: BinderPackageLine[] = binderMass.map((c) => {
    const liters = epoxyLitersFromGrams(c.grams, densityKgPerL);
    return {
      id: c.id,
      grams: c.grams,
      liters,
      plan: planPackages(liters, input.epoxyPackageL),
    };
  });

  return {
    sandKg,
    densityKgPerL,
    components,
    sand,
    binders,
  };
}

export type PackagingPhraseLabels = {
  exactFull: (count: number, sizeLabel: string) => string;
  fullPlusHint: (
    count: number,
    sizeLabel: string,
    hint: Exclude<PackageFractionHint, "NONE" | "CUSTOM">,
  ) => string;
  fullPlusAmount: (
    count: number,
    sizeLabel: string,
    amountLabel: string,
  ) => string;
  partialOnlyHint: (
    hint: Exclude<PackageFractionHint, "NONE" | "CUSTOM">,
    sizeLabel: string,
  ) => string;
  partialOnlyAmount: (amountLabel: string, sizeLabel: string) => string;
};

/** Human buy line: "2 full + half" / "2 × 25 kg + 11 kg (not full)". */
export function formatPackagePlanPhrase(
  plan: PackagePlan,
  sizeLabel: string,
  amountLabel: (amount: number) => string,
  labels: PackagingPhraseLabels,
): string {
  if (!(plan.required > 0) || !(plan.packageSize > 0)) return "—";
  const hint = packageFractionHint(plan.partialFraction);

  if (plan.partialAmount <= 0) {
    const n = plan.fullCount > 0 ? plan.fullCount : plan.buyWholeCount;
    return labels.exactFull(n, sizeLabel);
  }
  if (plan.fullCount <= 0) {
    if (hint !== "NONE" && hint !== "CUSTOM") {
      return labels.partialOnlyHint(hint, sizeLabel);
    }
    return labels.partialOnlyAmount(
      amountLabel(plan.partialAmount),
      sizeLabel,
    );
  }
  if (hint !== "NONE" && hint !== "CUSTOM") {
    return labels.fullPlusHint(plan.fullCount, sizeLabel, hint);
  }
  return labels.fullPlusAmount(
    plan.fullCount,
    sizeLabel,
    amountLabel(plan.partialAmount),
  );
}

/** Plain-text report for copy / share. */
export function formatRepairPackagingReportText(lines: string[]): string {
  return lines.filter((l) => l != null).join("\n");
}
