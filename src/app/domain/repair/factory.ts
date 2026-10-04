/**
 * Factory helpers for RepairHole / RepairSession drafts (raw data only).
 */

import { DEFAULT_BUCKET_SIZE } from "../bucket/types";
import { DEFAULT_WORK_MARGIN_FRACTION } from "./constants";
import { defaultFallAxis, recommendDepthSamples } from "./depthSamples";
import { defaultIrregularOutline } from "./outline";
import type {
  DepthSample,
  EdgeProfileMode,
  FallAxis,
  MeasurementDetail,
  RepairDimensions,
  RepairHole,
  RepairOutline,
  RepairSession,
  RepairShapeType,
} from "./types";

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function createRepairHole(input: {
  name?: string;
  shapeType: RepairShapeType;
  dimensions: RepairDimensions;
  outline?: RepairOutline;
  measurementDetail?: MeasurementDetail;
  slopeEnabled?: boolean;
  fallAxis?: FallAxis;
  flatBottom?: boolean;
  edgeProfile?: EdgeProfileMode;
  edgeInsetMm?: number | null;
  depthSamples?: DepthSample[];
  now?: number;
}): RepairHole {
  const now = input.now ?? Date.now();
  const outline =
    input.outline ??
    (input.shapeType === "IRREGULAR"
      ? defaultIrregularOutline()
      : { points: [] });
  const measurementDetail =
    input.measurementDetail ??
    (input.flatBottom ? "EXACT" : "STANDARD");
  const slopeEnabled = input.slopeEnabled ?? false;
  const flatBottom = measurementDetail === "EXACT" && !slopeEnabled;
  const fallAxis = input.fallAxis ?? defaultFallAxis(input.dimensions);
  const edgeProfile = input.edgeProfile ?? "UNIFORM";
  const edgeInsetMm =
    input.edgeInsetMm === undefined ? null : input.edgeInsetMm;
  const depthSamples =
    input.depthSamples ??
    recommendDepthSamples({
      shapeType: input.shapeType,
      dimensions: input.dimensions,
      outline,
      measurementDetail,
      slopeEnabled,
      fallAxis,
    });

  return {
    id: nextId("hole"),
    name: input.name ?? "Hole",
    shapeType: input.shapeType,
    dimensions: input.dimensions,
    outline,
    depthSamples,
    measurementDetail,
    slopeEnabled,
    fallAxis,
    flatBottom,
    edgeProfile,
    edgeInsetMm,
    createdAt: now,
    updatedAt: now,
  };
}

export function createRepairSession(input?: {
  holes?: RepairHole[];
  workMarginFraction?: number;
  recipeId?: string | null;
  bucketSize?: 5 | 10 | 17;
  now?: number;
}): RepairSession {
  const now = input?.now ?? Date.now();
  return {
    id: nextId("repair"),
    holes: input?.holes ?? [],
    workMarginFraction:
      input?.workMarginFraction ?? DEFAULT_WORK_MARGIN_FRACTION,
    recipeId: input?.recipeId ?? null,
    bucketSize: input?.bucketSize ?? DEFAULT_BUCKET_SIZE,
    createdAt: now,
    updatedAt: now,
  };
}

/** Fill every sample depth with the same value (test / quick path). */
export function withUniformDepth(
  hole: RepairHole,
  depthMm: number,
): RepairHole {
  return {
    ...hole,
    depthSamples: hole.depthSamples.map((s) => ({
      ...s,
      depthMm,
    })),
    updatedAt: Date.now(),
  };
}

/** Replace recommended samples with a single center measurement. */
export function withSingleCenterDepth(
  hole: RepairHole,
  depthMm: number,
): RepairHole {
  const samples = recommendDepthSamples({
    shapeType: hole.shapeType,
    dimensions: hole.dimensions,
    outline: hole.outline,
    measurementDetail: "QUICK",
  });
  return {
    ...hole,
    measurementDetail: "QUICK",
    slopeEnabled: hole.slopeEnabled ?? false,
    fallAxis: hole.fallAxis ?? defaultFallAxis(hole.dimensions),
    depthSamples: samples.map((s) => ({ ...s, depthMm })),
    updatedAt: Date.now(),
  };
}
