/**
 * Phase 1 self-checks: packing/rest volume + adapter kinds + legacy dual-run.
 * Run: npx --yes tsx src/app/domain/material-volume/verify.ts
 */

import { assessBucketFill } from "../bucket/assess";
import { assessFillSafety } from "../bucket/fillSafety";
import { estimateBucketGeometry } from "../bucket/geometry";
import { estimateMixVolume, estimateMixVolumeLegacy } from "../mix/volume";
import type { BlendingRecipe } from "../recipe/types";
import {
  sampleWaveSurface,
  wavedFillPath,
  waveBandScale,
} from "../../presentation/bucketWave";
import { estimateMaterialVolume } from "./estimate";
import { materialRecipeFromMix } from "./adapter";
import { interpolatePackingCalibration } from "./packing";
import {
  GENERIC_EPOXY_PROFILE,
  GENERIC_GRADED_QUARTZ_PROFILE,
  GENERIC_TIX_PROFILE,
  GENERIC_WATER_PROFILE,
  UNKNOWN_CUSTOM_PROFILE,
} from "./profiles";
import {
  registerKnownCustomMaterialProfile,
  unregisterKnownCustomMaterialProfile,
} from "./resolveProfile";
import type { MaterialComponentInput } from "./types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function approx(a: number, b: number, tol: number, msg: string) {
  assert(Math.abs(a - b) <= tol, `${msg} (got ${a}, expected ~${b} ±${tol})`);
}

function run() {
  // Spec example: 2 kg epoxy + 15 kg sand + 0.1 kg tix
  const components: MaterialComponentInput[] = [
    {
      id: "A",
      massKg: 1.333,
      role: "BINDER",
      profile: GENERIC_EPOXY_PROFILE,
    },
    {
      id: "B",
      massKg: 0.667,
      role: "BINDER",
      profile: GENERIC_EPOXY_PROFILE,
    },
    {
      id: "FILLER",
      massKg: 15,
      role: "AGGREGATE",
      profile: GENERIC_GRADED_QUARTZ_PROFILE,
    },
    {
      id: "THICKENER",
      massKg: 0.1,
      role: "TIX",
      profile: GENERIC_TIX_PROFILE,
    },
  ];

  const est = estimateMaterialVolume({ components });

  approx(est.epoxyMassKg, 2, 0.01, "epoxyMass A+B");
  approx(est.sandToEpoxyRatio, 7.5, 0.05, "R");
  approx(est.tixPercentOfBinder, 5, 0.05, "tix %");
  approx(est.compactPhysicalVolumeL, 7.523, 0.05, "V_compact");
  // Dense mortar region ~8.1 L center
  approx(est.expectedRestVolumeL, 8.1, 0.35, "expected rest ~8.1 L");
  assert(est.restVolumeLowL < est.expectedRestVolumeL, "low < expected");
  assert(est.restVolumeHighL > est.expectedRestVolumeL, "high > expected");
  approx(est.initialPotentialVolumeL, 11.818, 0.15, "initial potential");
  assert(
    est.initialPotentialVolumeL > est.expectedRestVolumeL,
    "initial potential > rest",
  );

  // Pure epoxy: volume ≈ mass / 1.10
  const pure = estimateMaterialVolume({
    components: [
      {
        id: "A",
        massKg: 2,
        role: "BINDER",
        profile: GENERIC_EPOXY_PROFILE,
      },
    ],
  });
  approx(pure.expectedRestVolumeL, 2 / 1.1, 0.02, "pure epoxy volume");
  assert(pure.packingCorrection === 0, "no packing without sand");

  // Water filler — not quartz
  const water = estimateMaterialVolume({
    components: [
      {
        id: "A",
        massKg: 2,
        role: "BINDER",
        profile: GENERIC_EPOXY_PROFILE,
      },
      {
        id: "FILLER",
        massKg: 1,
        role: "WATER",
        profile: GENERIC_WATER_PROFILE,
      },
    ],
  });
  approx(water.expectedRestVolumeL, 2 / 1.1 + 1, 0.05, "epoxy + water volumes");
  assert(water.aggregateMassKg === 0, "water is not aggregate");

  // Custom filler — unknown, no quartz assumption
  const custom = estimateMaterialVolume({
    components: [
      {
        id: "A",
        massKg: 2,
        role: "BINDER",
        profile: GENERIC_EPOXY_PROFILE,
      },
      {
        id: "FILLER",
        massKg: 5,
        role: "UNKNOWN",
        profile: UNKNOWN_CUSTOM_PROFILE,
      },
    ],
  });
  approx(custom.expectedRestVolumeL, 2 / 1.1, 0.05, "custom does not add quartz volume");
  assert(
    custom.confidence === "LOW" || custom.confidence === "EXPERIMENTAL",
    "custom raises uncertainty",
  );

  // Adapter: materialKind is source of truth over misleading display label
  const customLabeledSand: BlendingRecipe = {
    id: "test-custom",
    binderParts: [
      { id: "A", parts: 2 },
      { id: "B", parts: 1 },
    ],
    binderPercents: [
      {
        id: "FILLER",
        percent: 250,
        label: "Sand", // display looks like sand
        materialKind: "custom", // identity says custom
      },
    ],
  };
  // values: TOTAL, A, B, C, THICKENER, FILLER
  const customMix = materialRecipeFromMix({
    recipe: customLabeledSand,
    values: [7000, 1333, 667, 0, 0, 5000],
  });
  const fillerComp = customMix.components.find((c) => c.id === "FILLER");
  assert(fillerComp?.role === "UNKNOWN", "CUSTOM kind ignores Sand label");
  assert(
    fillerComp?.profile.id === "unknown-custom",
    "CUSTOM maps to unknown profile",
  );

  const waterRecipe: BlendingRecipe = {
    id: "test-water",
    binderParts: [
      { id: "A", parts: 2 },
      { id: "B", parts: 1 },
    ],
    binderPercents: [
      { id: "FILLER", percent: 50, label: "Vatten", materialKind: "water" },
    ],
  };
  const waterMix = materialRecipeFromMix({
    recipe: waterRecipe,
    values: [3000, 1333, 667, 0, 0, 1000],
  });
  assert(
    waterMix.components.find((c) => c.id === "FILLER")?.role === "WATER",
    "WATER kind → WATER role",
  );
  assert(
    waterMix.components.find((c) => c.id === "FILLER")?.profile.id ===
      "generic-water",
    "WATER → GenericWater profile",
  );

  const sandRecipe: BlendingRecipe = {
    id: "test-sand",
    binderParts: [
      { id: "A", parts: 2 },
      { id: "B", parts: 1 },
    ],
    binderPercents: [
      { id: "FILLER", percent: 500, label: "Filler", materialKind: "sand" },
    ],
  };
  const sandMix = materialRecipeFromMix({
    recipe: sandRecipe,
    values: [12000, 1333, 667, 0, 0, 10000],
    sandType: "medium",
  });
  assert(
    sandMix.components.find((c) => c.id === "FILLER")?.role === "AGGREGATE",
    "SAND kind → AGGREGATE",
  );
  assert(
    sandMix.components.find((c) => c.id === "FILLER")?.profile.id ===
      "generic-graded-quartz",
    "SAND → GenericGradedQuartz",
  );

  // Known custom registry — uses physical properties without assuming quartz defaults
  registerKnownCustomMaterialProfile("basalt grit", {
    id: "basalt-grit",
    category: "AGGREGATE",
    sourceType: "COMPANY_CALIBRATED",
    particleDensityKgPerL: 2.9,
    bulkDensityKgPerL: 1.6,
    packingModifier: 1.02,
    uncertaintyModifier: 1.1,
  });
  try {
    const knownCustomRecipe: BlendingRecipe = {
      id: "test-known-custom",
      binderParts: [
        { id: "A", parts: 2 },
        { id: "B", parts: 1 },
      ],
      binderPercents: [
        {
          id: "FILLER",
          percent: 200,
          label: "Basalt Grit",
          materialKind: "custom",
        },
      ],
    };
    const knownMix = materialRecipeFromMix({
      recipe: knownCustomRecipe,
      values: [6000, 1333, 667, 0, 0, 4000],
    });
    const knownFiller = knownMix.components.find((c) => c.id === "FILLER");
    assert(knownFiller?.role === "AGGREGATE", "known custom uses AGGREGATE role");
    assert(knownFiller?.profile.id === "basalt-grit", "known custom profile id");
    assert(
      knownFiller?.profile.particleDensityKgPerL === 2.9,
      "known custom density",
    );
  } finally {
    unregisterKnownCustomMaterialProfile("basalt grit");
  }

  // Packing curve smooth-ish midpoints
  approx(interpolatePackingCalibration(0), 0, 0.005, "R0");
  approx(interpolatePackingCalibration(3), 0.04, 0.015, "R3 ~4%");
  approx(interpolatePackingCalibration(7.5), 0.08, 0.02, "R7.5 ~8%");

  // Dual-run: new vs legacy for same epoxy+sand (expect material difference)
  const neo = estimateMixVolume({
    epoxyGrams: 2000,
    sandGrams: 15000,
    sandType: "medium",
  });
  const legacy = estimateMixVolumeLegacy({
    epoxyGrams: 2000,
    sandGrams: 15000,
    sandType: "medium",
  });
  assert(neo.estimatedLiters > 0, "new estimate > 0");
  assert(legacy.estimatedLiters > 0, "legacy estimate > 0");
  // Legacy was loose-bulk * packing factor (~10 L scale); new is compact+correction (~8 L).
  assert(
    Math.abs(neo.estimatedLiters - legacy.estimatedLiters) > 0.5,
    "new model differs from legacy (expected physics change)",
  );
  assert(
    neo.estimatedLiters < legacy.estimatedLiters,
    "new rest volume < legacy loose-bulk heuristic",
  );

  // Phase 2 — geometry + SafeFill
  const geom = estimateBucketGeometry({
    expectedRestVolumeL: 8.1,
    restVolumeLowL: 7.5,
    restVolumeHighL: 8.8,
    initialPotentialVolumeL: 11.8,
    capacityL: 17,
  });
  approx(geom.expectedFillFraction, 8.1 / 17, 0.001, "linear fill fraction");
  assert(geom.initialPotentialFillFraction > geom.expectedFillFraction, "potential > rest");

  // Comfortable in large bucket
  const comfort = assessFillSafety({ estimate: est, capacityL: 17 });
  assert(
    comfort.state === "COMFORTABLE" ||
      comfort.state === "GRADUAL_AGGREGATE_ADDITION_RECOMMENDED",
    `17 L should not be over limit (got ${comfort.state})`,
  );
  assert(comfort.profileKind === "SAND_MIX", "sand mix SafeFill profile");
  approx(comfort.safeFillLimitL, 17 * 0.8, 0.01, "SafeFill 80% of 17 L (sand)");

  // Initial potential over SafeFill but rest under → gradual add (not failure)
  const gradualEst = {
    ...est,
    expectedRestVolumeL: 12,
    restVolumeLowL: 11,
    restVolumeHighL: 13,
    initialPotentialVolumeL: 16,
  };
  const gradual = assessFillSafety({ estimate: gradualEst, capacityL: 17 });
  assert(
    gradual.state === "GRADUAL_AGGREGATE_ADDITION_RECOMMENDED",
    `gradual sand add (got ${gradual.state})`,
  );

  // Rest high at/over SafeFill → AT_LIMIT or OVER_LIMIT
  const tight = assessFillSafety({
    estimate: {
      ...est,
      expectedRestVolumeL: 13.8,
      restVolumeLowL: 13.2,
      restVolumeHighL: 14.2,
      initialPotentialVolumeL: 18,
    },
    capacityL: 17,
  });
  assert(
    tight.state === "AT_LIMIT" || tight.state === "OVER_LIMIT",
    `tight fill state (got ${tight.state})`,
  );

  const fill = assessBucketFill({
    estimate: est,
    bucketSelection: 17,
  });
  assert(fill.geometry != null, "geometry present");
  assert(fill.displayFillRatio <= 0.8 + 1e-9, "display clamped to sand SafeFill");
  assert(fill.fillSafetyState !== "NO_BUCKET", "has bucket");
  assert(
    fill.displayFillRatioLow <= fill.displayFillRatioHigh + 1e-9,
    "low <= high band",
  );
  assert(fill.safeFillDisplayRatio === 0.8, "sand SafeFill display ratio");
  assert(
    fill.initialPotentialDisplayRatio >= fill.displayFillRatio - 1e-9,
    "initial potential >= expected fill fraction",
  );

  // Pure epoxy / tix use 75%
  const pureSafety = assessFillSafety({
    estimate: {
      ...est,
      aggregateMassKg: 0,
      tixMassKg: 0,
      expectedRestVolumeL: 10,
      restVolumeLowL: 9.5,
      restVolumeHighL: 10.5,
      initialPotentialVolumeL: 10,
    },
    capacityL: 17,
  });
  assert(pureSafety.profileKind === "PURE_EPOXY", "pure epoxy profile");
  approx(pureSafety.safeFillLimitL, 17 * 0.75, 0.01, "SafeFill 75% pure epoxy");

  const tixSafety = assessFillSafety({
    estimate: {
      ...est,
      aggregateMassKg: 0,
      tixMassKg: 0.1,
      expectedRestVolumeL: 10,
      restVolumeLowL: 9.5,
      restVolumeHighL: 10.5,
      initialPotentialVolumeL: 10,
    },
    capacityL: 17,
  });
  assert(tixSafety.profileKind === "TIX_EPOXY", "tix epoxy profile");
  approx(tixSafety.safeFillLimitL, 17 * 0.75, 0.01, "SafeFill 75% tix epoxy");

  // Phase 3 — wave helpers
  assert(waveBandScale("HIGH") < waveBandScale("LOW"), "wave grows with uncertainty");
  const surf = sampleWaveSurface({
    leftX: 0,
    rightX: 100,
    centerY: 50,
    amplitudePx: 8,
    phaseRad: 0,
    samples: 8,
  });
  assert(surf.length === 9, "wave samples");
  const path = wavedFillPath({
    wallLeftBottomX: 0,
    wallRightBottomX: 100,
    bottomY: 100,
    surface: surf,
  });
  assert(path.includes("Z"), "closed wave fill");

  console.log("material-volume verify: all checks passed");
  console.log(
    JSON.stringify(
      {
        exampleRestL: +est.expectedRestVolumeL.toFixed(3),
        exampleLowL: +est.restVolumeLowL.toFixed(3),
        exampleHighL: +est.restVolumeHighL.toFixed(3),
        exampleInitialL: +est.initialPotentialVolumeL.toFixed(3),
        confidence: est.confidence,
        neoVsLegacy: {
          neo: +neo.estimatedLiters.toFixed(3),
          legacy: +legacy.estimatedLiters.toFixed(3),
        },
        phase2: {
          fillState: fill.fillSafetyState,
          safeFillL: +fill.safety.safeFillLimitL.toFixed(3),
          fillFraction: +((fill.geometry?.expectedFillFraction ?? 0).toFixed(3)),
          gradualState: gradual.state,
        },
      },
      null,
      2,
    ),
  );
}

run();
