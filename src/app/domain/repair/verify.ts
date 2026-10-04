/**
 * Phase A–D self-checks: geometry, edge, uncertainty, planning, multi-hole.
 * Run: npx --yes tsx src/app/domain/repair/verify.ts
 */

import { estimateMaterialVolumeFromMix } from "../material-volume/adapter";
import { planRecipeBatches } from "../mix/batchPlan";
import { DEFAULT_RECIPE } from "../recipe/types";
import type { BlendingRecipe } from "../recipe/types";
import { DEFAULT_WORK_MARGIN_FRACTION } from "./constants";
import { recommendDepthSamples } from "./depthSamples";
import { resolveEdgeProfile } from "./edge";
import {
  estimateRepairHoleVolume,
  estimateRepairSessionTotals,
} from "./estimate";
import {
  createRepairHole,
  createRepairSession,
  withSingleCenterDepth,
  withUniformDepth,
} from "./factory";
import {
  solveMaterialRequirement,
  validateRecipeForMaterialSolve,
} from "./materialRequirement";
import { planRepairVolume } from "./planning";
import type { RepairHole, RepairOutline } from "./types";
import { validateRepairHole } from "./validation";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function approx(a: number, b: number, tol: number, msg: string) {
  assert(Math.abs(a - b) <= tol, `${msg} (got ${a}, expected ~${b} ±${tol})`);
}

function rectHole(
  lengthMm: number,
  widthMm: number,
  depthMm: number,
  edge: RepairHole["edgeProfile"] = "UNIFORM",
): RepairHole {
  const hole = createRepairHole({
    shapeType: "RECTANGLE",
    dimensions: { lengthMm, widthMm },
    measurementDetail: "STANDARD",
    edgeProfile: edge,
  });
  return withUniformDepth(hole, depthMm);
}

function run() {
  // --- TEST 1: 1 m × 1 m × 10 mm ≈ 10 L ---
  {
    const est = estimateRepairHoleVolume(rectHole(1000, 1000, 10));
    assert(est != null, "T1 estimate");
    approx(est!.expectedLiters, 10, 0.05, "T1 1×1×10mm → 10 L");
    approx(est!.assumptions.planAreaMm2, 1_000_000, 1, "T1 area 1 m²");
  }

  // --- TEST 2: 2 m × 1 m × 50 mm ≈ 100 L ---
  {
    const est = estimateRepairHoleVolume(rectHole(2000, 1000, 50));
    assert(est != null, "T2 estimate");
    approx(est!.expectedLiters, 100, 0.2, "T2 2×1×50mm → 100 L");
  }

  // --- TEST 3: Circle Ø1 m × 10 mm ≈ 7.854 L ---
  {
    const hole = withUniformDepth(
      createRepairHole({
        shapeType: "OVAL",
        dimensions: { lengthMm: 1000, widthMm: 1000 },
        measurementDetail: "STANDARD",
        edgeProfile: "UNIFORM",
      }),
      10,
    );
    const est = estimateRepairHoleVolume(hole);
    assert(est != null, "T3 estimate");
    approx(est!.expectedLiters, Math.PI * 0.5 * 0.5 * 10, 0.05, "T3 circle ~7.854 L");
  }

  // --- TEST 4: Irregular rectangle-equivalent ≈ same as rectangle ---
  {
    const outline: RepairOutline = {
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    };
    const irregular = withUniformDepth(
      createRepairHole({
        shapeType: "IRREGULAR",
        dimensions: { lengthMm: 1000, widthMm: 1000 },
        outline,
        measurementDetail: "STANDARD",
        edgeProfile: "UNIFORM",
      }),
      10,
    );
    const rect = rectHole(1000, 1000, 10);
    const a = estimateRepairHoleVolume(irregular);
    const b = estimateRepairHoleVolume(rect);
    assert(!!(a && b), "T4 estimates");
    approx(a!.expectedLiters, b!.expectedLiters, 0.35, "T4 irregular ≈ rectangle");
  }

  // --- TEST 5: identical depths → ≈ area × depth ---
  {
    const est = estimateRepairHoleVolume(rectHole(1500, 800, 25));
    assert(est != null, "T5 estimate");
    const expected = (1500 * 800 * 25) / 1_000_000;
    approx(est!.expectedLiters, expected, 0.05, "T5 area×depth");
  }

  // --- TEST 6: Sloped edge < Uniform depth ---
  {
    // Large enough for meaningful inset
    const base = createRepairHole({
      shapeType: "RECTANGLE",
      dimensions: { lengthMm: 2000, widthMm: 1500 },
      measurementDetail: "STANDARD",
      edgeProfile: "UNIFORM",
    });
    const uniform = estimateRepairHoleVolume(withUniformDepth(base, 40));
    const sloped = estimateRepairHoleVolume(
      withUniformDepth({ ...base, edgeProfile: "SLOPED" }, 40),
    );
    assert(!!(uniform && sloped), "T6 estimates");
    assert(
      sloped!.expectedLiters < uniform!.expectedLiters - 0.5,
      `T6 sloped (${sloped!.expectedLiters}) < uniform (${uniform!.expectedLiters})`,
    );
  }

  // --- TEST 7: increase one depth → volume must not decrease ---
  {
    const hole = createRepairHole({
      shapeType: "RECTANGLE",
      dimensions: { lengthMm: 1200, widthMm: 900 },
      measurementDetail: "STANDARD",
      edgeProfile: "UNIFORM",
    });
    const samples = hole.depthSamples.map((s, i) => ({
      ...s,
      depthMm: i === 0 ? 20 : 30,
    }));
    const low = estimateRepairHoleVolume({ ...hole, depthSamples: samples });
    const samples2 = samples.map((s, i) =>
      i === 0 ? { ...s, depthMm: 50 } : s,
    );
    const high = estimateRepairHoleVolume({ ...hole, depthSamples: samples2 });
    assert(!!(low && high), "T7 estimates");
    assert(
      high!.expectedLiters >= low!.expectedLiters - 1e-9,
      `T7 deeper sample must not shrink volume (${high!.expectedLiters} vs ${low!.expectedLiters})`,
    );
  }

  // --- TEST 8: add identical samples → no material change ---
  {
    const base = withUniformDepth(
      createRepairHole({
        shapeType: "RECTANGLE",
        dimensions: { lengthMm: 1000, widthMm: 1000 },
        measurementDetail: "QUICK",
        edgeProfile: "UNIFORM",
      }),
      10,
    );
    const a = estimateRepairHoleVolume(base)!;
    const extra = recommendDepthSamples({
      shapeType: "RECTANGLE",
      dimensions: base.dimensions,
      outline: base.outline,
      measurementDetail: "DETAILED",
      idPrefix: "extra",
    }).map((s) => ({ ...s, depthMm: 10 }));
    const b = estimateRepairHoleVolume({
      ...base,
      depthSamples: [...base.depthSamples, ...extra],
    })!;
    approx(a.expectedLiters, b.expectedLiters, 0.05, "T8 extra identical samples");
  }

  // --- TEST 9: multiple holes sum ---
  {
    const h1 = rectHole(1000, 1000, 10);
    const h2 = rectHole(2000, 1000, 50);
    const session = createRepairSession({
      holes: [h1, h2],
      workMarginFraction: DEFAULT_WORK_MARGIN_FRACTION,
    });
    const totals = estimateRepairSessionTotals(session);
    assert(totals != null, "T9 totals");
    approx(totals!.expectedLiters, 110, 0.3, "T9 10+100 L");
    assert(totals!.holeCount === 2, "T9 holeCount");
  }

  // --- TEST 10: physical result independent of "SVG size" (dims are model mm) ---
  {
    // Same physical hole measured twice — model coords only.
    const a = estimateRepairHoleVolume(rectHole(1000, 1000, 10))!;
    const b = estimateRepairHoleVolume(rectHole(1000, 1000, 10))!;
    approx(a.expectedLiters, b.expectedLiters, 1e-9, "T10 deterministic");
  }

  // --- Uncertainty: 1 sample wider than 5 well-distributed ---
  {
    const one = estimateRepairHoleVolume(
      withSingleCenterDepth(
        createRepairHole({
          shapeType: "RECTANGLE",
          dimensions: { lengthMm: 1500, widthMm: 1000 },
          edgeProfile: "UNIFORM",
        }),
        30,
      ),
    )!;
    const five = estimateRepairHoleVolume(
      withUniformDepth(
        createRepairHole({
          shapeType: "RECTANGLE",
          dimensions: { lengthMm: 1500, widthMm: 1000 },
          measurementDetail: "STANDARD",
          edgeProfile: "UNIFORM",
        }),
        30,
      ),
    )!;
    const halfOne = one.upperLiters - one.expectedLiters;
    const halfFive = five.upperLiters - five.expectedLiters;
    assert(
      halfOne > halfFive,
      `U1 one-sample half-range (${halfOne}) > five (${halfFive})`,
    );
  }

  // --- Uncertainty: high depth variation wider than low ---
  {
    const hole = createRepairHole({
      shapeType: "RECTANGLE",
      dimensions: { lengthMm: 1600, widthMm: 1200 },
      measurementDetail: "STANDARD",
      edgeProfile: "UNIFORM",
    });
    const lowVar = estimateRepairHoleVolume(
      withUniformDepth(hole, 40),
    )!;
    const highVarSamples = hole.depthSamples.map((s, i) => ({
      ...s,
      depthMm: i % 2 === 0 ? 10 : 70,
    }));
    const highVar = estimateRepairHoleVolume({
      ...hole,
      depthSamples: highVarSamples,
    })!;
    const halfLow = lowVar.upperLiters - lowVar.expectedLiters;
    const halfHigh = highVar.upperLiters - highVar.expectedLiters;
    assert(
      halfHigh > halfLow,
      `U2 high variation (${halfHigh}) > low (${halfLow})`,
    );
  }

  // --- Uncertainty: irregular generally higher relative than rectangle ---
  {
    const outline: RepairOutline = {
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
    };
    const rect = estimateRepairHoleVolume(rectHole(1000, 1000, 20))!;
    const irregular = estimateRepairHoleVolume(
      withUniformDepth(
        createRepairHole({
          shapeType: "IRREGULAR",
          dimensions: { lengthMm: 1000, widthMm: 1000 },
          outline,
          measurementDetail: "STANDARD",
          edgeProfile: "UNIFORM",
        }),
        20,
      ),
    )!;
    const relR =
      (rect.upperLiters - rect.expectedLiters) / Math.max(rect.expectedLiters, 1e-9);
    const relI =
      (irregular.upperLiters - irregular.expectedLiters) /
      Math.max(irregular.expectedLiters, 1e-9);
    assert(
      relI >= relR - 1e-9,
      `U3 irregular relative (${relI}) >= rect (${relR})`,
    );
  }

  // --- Auto may carry more uncertainty than explicit Uniform ---
  {
    const dims = { lengthMm: 2000, widthMm: 1500 };
    const auto = estimateRepairHoleVolume(
      withUniformDepth(
        createRepairHole({
          shapeType: "RECTANGLE",
          dimensions: dims,
          measurementDetail: "STANDARD",
          edgeProfile: "AUTO",
        }),
        35,
      ),
    )!;
    const uniform = estimateRepairHoleVolume(
      withUniformDepth(
        createRepairHole({
          shapeType: "RECTANGLE",
          dimensions: dims,
          measurementDetail: "STANDARD",
          edgeProfile: "UNIFORM",
        }),
        35,
      ),
    )!;
    const halfA = auto.upperLiters - auto.expectedLiters;
    const halfU = uniform.upperLiters - uniform.expectedLiters;
    assert(
      halfA >= halfU - 1e-9,
      `U4 Auto half-range (${halfA}) >= Uniform (${halfU})`,
    );
    // Auto on large hole should resolve to SLOPED
    assert(
      auto.assumptions.edgeModeResolved === "SLOPED",
      "U4 Auto resolves SLOPED on large hole",
    );
  }

  // --- Detailed preset with only one measured → not HIGH ---
  {
    const hole = createRepairHole({
      shapeType: "RECTANGLE",
      dimensions: { lengthMm: 1200, widthMm: 900 },
      measurementDetail: "DETAILED",
      edgeProfile: "UNIFORM",
    });
    const oneMeasured = {
      ...hole,
      depthSamples: hole.depthSamples.map((s, i) => ({
        ...s,
        depthMm: i === 0 ? 25 : null,
      })),
    };
    const est = estimateRepairHoleVolume(oneMeasured)!;
    assert(
      est.confidence !== "HIGH",
      `U5 detailed+1 measured must not be HIGH (got ${est.confidence})`,
    );
  }

  // --- Exact (flat bottom) + one measured depth → HIGH ---
  {
    const hole = createRepairHole({
      shapeType: "RECTANGLE",
      dimensions: { lengthMm: 1000, widthMm: 1000 },
      measurementDetail: "EXACT",
    });
    assert(hole.flatBottom === true, "U6 EXACT implies flatBottom");
    assert(hole.depthSamples.length === 1, "U6 EXACT → one depth station");
    const measured = withUniformDepth(hole, 40);
    const est = estimateRepairHoleVolume(measured)!;
    assert(est.confidence === "HIGH", `U6 EXACT → HIGH (got ${est.confidence})`);
    assert(est.assumptions.flatBottom === true, "U6 assumptions.flatBottom");
    // 1 m² × 40 mm = 40 L expected; ~2% half-range
    approx(est.expectedLiters, 40, 1e-6, "U6 EXACT volume");
    approx(est.upperLiters - est.expectedLiters, 0.8, 1e-6, "U6 EXACT ~2% band");
  }

  // --- Exact + slope → start/end only (2 points), HIGH when both measured ---
  {
    const hole = createRepairHole({
      shapeType: "RECTANGLE",
      dimensions: { lengthMm: 1000, widthMm: 1000 },
      measurementDetail: "EXACT",
      slopeEnabled: true,
      fallAxis: "LENGTH",
    });
    assert(hole.flatBottom === false, "U7 EXACT+slope is not flatBottom");
    assert(hole.depthSamples.length === 2, `U7 EXACT+slope → 2 points (got ${hole.depthSamples.length})`);
    const both = {
      ...hole,
      depthSamples: hole.depthSamples.map((s, i) => ({
        ...s,
        depthMm: i === 0 ? 10 : 50,
      })),
    };
    const est = estimateRepairHoleVolume(both)!;
    assert(est.confidence === "HIGH", `U7 EXACT+slope → HIGH (got ${est.confidence})`);
  }

  // --- Planning: upper × (1 + margin) ---
  {
    const est = estimateRepairHoleVolume(rectHole(1000, 1000, 10))!;
    const plan = planRepairVolume({
      geometry: est,
      workMarginFraction: 0.1,
    });
    approx(
      plan.planningTargetLiters,
      est.upperLiters * 1.1,
      1e-9,
      "P1 planning = upper×1.1",
    );
    // Geometry bands unchanged by margin conceptually
    assert(plan.geometryExpectedLiters === est.expectedLiters, "P1 expected intact");
    assert(plan.geometryUpperLiters === est.upperLiters, "P1 upper intact");
  }

  // --- Session planning applies margin once on summed uppers ---
  {
    const session = createRepairSession({
      holes: [rectHole(1000, 1000, 10), rectHole(2000, 1000, 50)],
      workMarginFraction: 0.1,
    });
    const totals = estimateRepairSessionTotals(session)!;
    approx(
      totals.planning.planningTargetLiters,
      totals.upperLiters * 1.1,
      1e-9,
      "P2 session margin once",
    );
  }

  // --- Auto small hole → UNIFORM ---
  {
    const edge = resolveEdgeProfile("AUTO", {
      lengthMm: 180,
      widthMm: 120,
    });
    assert(edge.resolved === "UNIFORM", "E1 small Auto → UNIFORM");
  }

  // --- Validation: no depth → fail ---
  {
    const hole = createRepairHole({
      shapeType: "RECTANGLE",
      dimensions: { lengthMm: 1000, widthMm: 1000 },
    });
    // leave depths null
    const v = validateRepairHole(hole);
    assert(!v.ok && v.issues.includes("NO_DEPTH_SAMPLES"), "V1 no depth");
    assert(estimateRepairHoleVolume(hole) == null, "V1 estimate null");
  }

  // --- Validation: self-intersecting irregular ---
  {
    const hole = withUniformDepth(
      createRepairHole({
        shapeType: "IRREGULAR",
        dimensions: { lengthMm: 1000, widthMm: 1000 },
        outline: {
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
          ],
        },
      }),
      10,
    );
    const v = validateRepairHole(hole);
    assert(
      v.issues.includes("SELF_INTERSECTING_OUTLINE"),
      "V2 self-intersection",
    );
  }

  // --- Material requirement: round-trip DEFAULT_RECIPE → 10 L ---
  {
    const solved = solveMaterialRequirement({
      recipe: DEFAULT_RECIPE,
      planningTargetLiters: 10,
    });
    assert(solved.ok, "M1 solve ok");
    if (solved.ok) {
      assert(
        solved.material.expectedRestVolumeL + 1e-6 >= 10,
        `M1 expectedRest ${solved.material.expectedRestVolumeL} >= 10`,
      );
      const again = estimateMaterialVolumeFromMix({
        recipe: DEFAULT_RECIPE,
        values: solved.values,
      });
      approx(
        again.expectedRestVolumeL,
        solved.material.expectedRestVolumeL,
        0.05,
        "M1 forward matches solved",
      );
      assert(solved.values[0]! > 0, "M1 total > 0");
    }
  }

  // --- Material requirement: larger target needs more mass ---
  {
    const small = solveMaterialRequirement({
      recipe: DEFAULT_RECIPE,
      planningTargetLiters: 10,
    });
    const large = solveMaterialRequirement({
      recipe: DEFAULT_RECIPE,
      planningTargetLiters: 100,
    });
    assert(small.ok && large.ok, "M2 both ok");
    if (small.ok && large.ok) {
      assert(
        large.values[0]! > small.values[0]!,
        `M2 larger target more mass (${large.values[0]} > ${small.values[0]})`,
      );
    }
  }

  // --- Unknown CUSTOM filler blocks solve ---
  {
    const bad: BlendingRecipe = {
      id: "unknown-custom-filler",
      binderParts: [
        { id: "A", parts: 2, label: "Resin" },
        { id: "B", parts: 1, label: "Hardener" },
      ],
      binderPercents: [
        {
          id: "FILLER",
          percent: 500,
          label: "Mystery powder",
          materialKind: "custom",
        },
      ],
    };
    const v = validateRecipeForMaterialSolve(bad);
    assert(!v.ok, "M3 validation fails");
    const solved = solveMaterialRequirement({
      recipe: bad,
      planningTargetLiters: 10,
    });
    assert(
      !solved.ok && solved.reason === "UNKNOWN_CUSTOM_VOLUME",
      "M3 solve fails UNKNOWN_CUSTOM_VOLUME",
    );
  }

  // --- Invalid target ---
  {
    const solved = solveMaterialRequirement({
      recipe: DEFAULT_RECIPE,
      planningTargetLiters: 0,
    });
    assert(!solved.ok && solved.reason === "INVALID_TARGET", "M4 invalid target");
  }

  // --- Batch plan: large requirement splits into multiple SafeFill batches ---
  {
    const solved = solveMaterialRequirement({
      recipe: DEFAULT_RECIPE,
      planningTargetLiters: 100,
    });
    assert(solved.ok, "B1 solve for 100 L");
    if (solved.ok) {
      const plan = planRecipeBatches({
        recipe: DEFAULT_RECIPE,
        requiredValues: solved.values,
        bucket: 17,
      });
      assert(plan.ok, "B1 plan ok");
      if (plan.ok) {
        assert(plan.batches.length >= 2, "B1 multiple batches for 100 L / 17 L");
        const sum = plan.batches.reduce((s, b) => s + (b.values[0] ?? 0), 0);
        approx(sum, plan.requiredTotalGrams, 0, "B1 totals sum to requirement");
        for (const b of plan.batches) {
          assert(
            b.assessment.fillSafetyState !== "OVER_LIMIT",
            `B1 batch ${b.batchNumber} not OVER_LIMIT`,
          );
          assert(
            b.assessment.volume.expectedRestVolumeL <=
              b.assessment.safety.safeFillLimitL + 0.05,
            `B1 batch ${b.batchNumber} within SafeFill`,
          );
        }
      }
    }
  }

  // --- Batch plan: small requirement → single batch ---
  {
    const solved = solveMaterialRequirement({
      recipe: DEFAULT_RECIPE,
      planningTargetLiters: 5,
    });
    assert(solved.ok, "B2 solve");
    if (solved.ok) {
      const plan = planRecipeBatches({
        recipe: DEFAULT_RECIPE,
        requiredValues: solved.values,
        bucket: 17,
      });
      assert(plan.ok && plan.batches.length === 1, "B2 single batch");
    }
  }

  // --- Slope attribute: aligned fall lines (edges + interiors share across) ---
  {
    const hole = createRepairHole({
      shapeType: "RECTANGLE",
      dimensions: { lengthMm: 2000, widthMm: 1000 },
      measurementDetail: "STANDARD",
      slopeEnabled: true,
      fallAxis: "LENGTH",
      edgeProfile: "UNIFORM",
    });
    // Standard slope: across 0.25/0.75 × along 0/0.5/1 → 6 points
    assert(hole.depthSamples.length === 6, "S1 aligned 6 samples");
    const ys = [...new Set(hole.depthSamples.map((s) => Math.round(s.yMm)))].sort(
      (a, b) => a - b,
    );
    assert(ys.length === 2, "S1 two fall lines (across stations)");
    for (const y of ys) {
      const line = hole.depthSamples.filter((s) => Math.round(s.yMm) === y);
      assert(line.length === 3, "S1 each fall line has start/mid/end");
      const xs = line.map((s) => s.xMm).sort((a, b) => a - b);
      approx(xs[0]!, 0, 2, "S1 line starts at edge");
      approx(xs[2]!, 2000, 2, "S1 line ends at edge");
      approx(xs[1]!, 1000, 2, "S1 mid aligned on same line");
    }
    assert(hole.edgeProfile === "UNIFORM", "S1 slope uses Uniform edge");

    const depths = hole.depthSamples.map((s) => {
      if (Math.abs(s.xMm) < 2) return { ...s, depthMm: 0 };
      if (Math.abs(s.xMm - 2000) < 2) return { ...s, depthMm: 40 };
      return { ...s, depthMm: 20 };
    });
    const est = estimateRepairHoleVolume({
      ...hole,
      depthSamples: depths,
    });
    assert(est != null, "S2 slope estimate");
    approx(est!.expectedLiters, 40, 12, "S2 slope ~ wedge volume");
  }

  console.log("repair verify: all checks passed");
}

run();
