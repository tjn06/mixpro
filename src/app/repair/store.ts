/**
 * Persisted Repair session draft (geometry + work margin + recipe id).
 * Derived volumes are recomputed, not stored.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_BUCKET_SIZE, isBucketSize } from "../domain/bucket/types";
import {
  DEFAULT_WORK_MARGIN_FRACTION,
  LEGACY_DEFAULT_WORK_MARGIN_FRACTION,
} from "../domain/repair/constants";
import {
  defaultFallAxis,
  recommendDepthSamples,
} from "../domain/repair/depthSamples";
import {
  createRepairHole,
  createRepairSession,
} from "../domain/repair/factory";
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
} from "../domain/repair/types";

function mergeMeasuredDepths(
  recommended: DepthSample[],
  previous: DepthSample[],
): DepthSample[] {
  return recommended.map((s) => {
    const nearest = previous
      .filter((p) => p.depthMm != null)
      .map((p) => ({
        p,
        d: Math.hypot(p.xMm - s.xMm, p.yMm - s.yMm),
      }))
      .sort((a, b) => a.d - b.d)[0];
    if (nearest && nearest.d < 80) {
      return { ...s, depthMm: nearest.p.depthMm };
    }
    return s;
  });
}

function normalizeHole(hole: RepairHole): RepairHole {
  const legacySlope = (hole.measurementDetail as string) === "SLOPE";
  // Migrate legacy flatBottom flag → EXACT detail.
  const measurementDetail: MeasurementDetail = legacySlope
    ? "STANDARD"
    : hole.measurementDetail === "EXACT" || hole.flatBottom === true
      ? "EXACT"
      : hole.measurementDetail === "QUICK" ||
          hole.measurementDetail === "DETAILED"
        ? hole.measurementDetail
        : "STANDARD";
  const slopeEnabled = hole.slopeEnabled === true || legacySlope;
  // Exact + no slope = flat homogeneous floor; Exact + slope = two edge depths.
  const flatBottom = measurementDetail === "EXACT" && !slopeEnabled;
  const edgeInsetMm =
    hole.edgeInsetMm != null && Number.isFinite(hole.edgeInsetMm)
      ? Math.max(0, hole.edgeInsetMm)
      : null;
  return {
    ...hole,
    measurementDetail,
    flatBottom,
    slopeEnabled,
    fallAxis: hole.fallAxis ?? defaultFallAxis(hole.dimensions),
    edgeProfile: flatBottom ? "UNIFORM" : (hole.edgeProfile === "SLOPED" ? "SLOPED" : "UNIFORM"),
    edgeInsetMm,
  };
}
const STORAGE_KEY = "mixmate-repair-session";
const HOT_STORE_KEY = "__mixmate_repair_session_store__";

type RepairStoreState = {
  session: RepairSession;
  replaceSession: (session: RepairSession) => void;
  resetSession: () => void;
  setWorkMarginFraction: (fraction: number) => void;
  setRecipeId: (recipeId: string | null) => void;
  setBucketSize: (bucketSize: 5 | 10 | 17) => void;
  addHole: (input?: {
    shapeType?: RepairShapeType;
    dimensions?: RepairDimensions;
    name?: string;
  }) => RepairHole;
  updateHole: (holeId: string, patch: Partial<RepairHole>) => void;
  replaceHole: (hole: RepairHole) => void;
  removeHole: (holeId: string) => void;
  setHoleShape: (holeId: string, shapeType: RepairShapeType) => void;
  setHoleDimensions: (holeId: string, dimensions: RepairDimensions) => void;
  setHoleOutline: (holeId: string, outline: RepairOutline) => void;
  setHoleDepthSamples: (holeId: string, depthSamples: DepthSample[]) => void;
  setHoleMeasurementDetail: (
    holeId: string,
    measurementDetail: MeasurementDetail,
  ) => void;
  setHoleSlopeEnabled: (holeId: string, slopeEnabled: boolean) => void;
  setHoleFallAxis: (holeId: string, fallAxis: FallAxis) => void;
  setHoleEdgeProfile: (holeId: string, edgeProfile: EdgeProfileMode) => void;
  setHoleEdgeInsetMm: (holeId: string, edgeInsetMm: number | null) => void;
  setDepthValue: (
    holeId: string,
    sampleId: string,
    depthMm: number | null,
  ) => void;
  moveDepthSample: (
    holeId: string,
    sampleId: string,
    xMm: number,
    yMm: number,
  ) => void;
};

function touch(session: RepairSession): RepairSession {
  return { ...session, updatedAt: Date.now() };
}

function patchHole(
  session: RepairSession,
  holeId: string,
  fn: (hole: RepairHole) => RepairHole,
): RepairSession {
  let found = false;
  const holes = session.holes.map((h) => {
    if (h.id !== holeId) return h;
    found = true;
    return { ...fn(h), updatedAt: Date.now() };
  });
  if (!found) return session;
  return touch({ ...session, holes });
}

function createRepairStore() {
  return create<RepairStoreState>()(
    persist(
      (set, get) => ({
        session: createRepairSession(),

        replaceSession: (session) => set({ session: touch(session) }),

        resetSession: () => set({ session: createRepairSession() }),

        setWorkMarginFraction: (fraction) => {
          const f = Number.isFinite(fraction)
            ? Math.max(0, Math.min(1, fraction))
            : DEFAULT_WORK_MARGIN_FRACTION;
          set({
            session: touch({ ...get().session, workMarginFraction: f }),
          });
        },

        setRecipeId: (recipeId) => {
          set({
            session: touch({ ...get().session, recipeId }),
          });
        },

        setBucketSize: (bucketSize) => {
          const size = isBucketSize(bucketSize)
            ? bucketSize
            : DEFAULT_BUCKET_SIZE;
          set({
            session: touch({ ...get().session, bucketSize: size }),
          });
        },

        addHole: (input) => {
          const index = get().session.holes.length + 1;
          const hole = createRepairHole({
            name: input?.name ?? `Hole ${index}`,
            shapeType: input?.shapeType ?? "RECTANGLE",
            dimensions: input?.dimensions ?? {
              lengthMm: 1000,
              widthMm: 1000,
            },
            measurementDetail: "STANDARD",
            edgeProfile: "UNIFORM",
          });
          set({
            session: touch({
              ...get().session,
              holes: [...get().session.holes, hole],
            }),
          });
          return hole;
        },

        updateHole: (holeId, patch) => {
          set({
            session: patchHole(get().session, holeId, (h) => ({
              ...h,
              ...patch,
              id: h.id,
            })),
          });
        },

        replaceHole: (hole) => {
          set({
            session: patchHole(get().session, hole.id, () => hole),
          });
        },

        removeHole: (holeId) => {
          set({
            session: touch({
              ...get().session,
              holes: get().session.holes.filter((h) => h.id !== holeId),
            }),
          });
        },

        setHoleShape: (holeId, shapeType) => {
          set({
            session: patchHole(get().session, holeId, (h) => {
              const hole = normalizeHole(h);
              const outline =
                shapeType === "IRREGULAR"
                  ? hole.outline.points.length >= 4
                    ? hole.outline
                    : createRepairHole({
                        shapeType: "IRREGULAR",
                        dimensions: hole.dimensions,
                      }).outline
                  : { points: [] };
              const depthSamples = mergeMeasuredDepths(
                recommendDepthSamples({
                  shapeType,
                  dimensions: hole.dimensions,
                  outline,
                  measurementDetail: hole.measurementDetail,
                  slopeEnabled: hole.slopeEnabled,
                  fallAxis: hole.fallAxis,
                }),
                hole.depthSamples,
              );
              return { ...hole, shapeType, outline, depthSamples };
            }),
          });
        },

        setHoleDimensions: (holeId, dimensions) => {
          set({
            session: patchHole(get().session, holeId, (h) => {
              const hole = normalizeHole(h);
              const lengthMm = Math.max(1, dimensions.lengthMm);
              const widthMm = Math.max(1, dimensions.widthMm);
              const nextDims = { lengthMm, widthMm };
              const depthSamples = mergeMeasuredDepths(
                recommendDepthSamples({
                  shapeType: hole.shapeType,
                  dimensions: nextDims,
                  outline: hole.outline,
                  measurementDetail: hole.measurementDetail,
                  slopeEnabled: hole.slopeEnabled,
                  fallAxis: hole.fallAxis,
                }),
                hole.depthSamples,
              );
              return { ...hole, dimensions: nextDims, depthSamples };
            }),
          });
        },

        setHoleOutline: (holeId, outline) => {
          set({
            session: patchHole(get().session, holeId, (h) => {
              const hole = normalizeHole(h);
              const depthSamples = mergeMeasuredDepths(
                recommendDepthSamples({
                  shapeType: hole.shapeType,
                  dimensions: hole.dimensions,
                  outline,
                  measurementDetail: hole.measurementDetail,
                  slopeEnabled: hole.slopeEnabled,
                  fallAxis: hole.fallAxis,
                }),
                hole.depthSamples,
              );
              return { ...hole, outline, depthSamples };
            }),
          });
        },

        setHoleDepthSamples: (holeId, depthSamples) => {
          set({
            session: patchHole(get().session, holeId, (h) => ({
              ...h,
              depthSamples,
            })),
          });
        },

        setHoleMeasurementDetail: (holeId, measurementDetail) => {
          set({
            session: patchHole(get().session, holeId, (h) => {
              const hole = normalizeHole(h);
              const slopeEnabled = hole.slopeEnabled;
              const flatBottom =
                measurementDetail === "EXACT" && !slopeEnabled;
              const depthSamples = mergeMeasuredDepths(
                recommendDepthSamples({
                  shapeType: hole.shapeType,
                  dimensions: hole.dimensions,
                  outline: hole.outline,
                  measurementDetail,
                  slopeEnabled,
                  fallAxis: hole.fallAxis,
                }),
                hole.depthSamples,
              );
              return {
                ...hole,
                measurementDetail,
                flatBottom,
                slopeEnabled,
                edgeProfile: flatBottom ? "UNIFORM" : hole.edgeProfile,
                depthSamples,
              };
            }),
          });
        },

        setHoleSlopeEnabled: (holeId, slopeEnabled) => {
          set({
            session: patchHole(get().session, holeId, (h) => {
              const hole = normalizeHole(h);
              const measurementDetail = hole.measurementDetail;
              const flatBottom =
                measurementDetail === "EXACT" && !slopeEnabled;
              const depthSamples = mergeMeasuredDepths(
                recommendDepthSamples({
                  shapeType: hole.shapeType,
                  dimensions: hole.dimensions,
                  outline: hole.outline,
                  measurementDetail,
                  slopeEnabled,
                  fallAxis: hole.fallAxis,
                }),
                hole.depthSamples,
              );
              return {
                ...hole,
                measurementDetail,
                slopeEnabled,
                flatBottom,
                edgeProfile: flatBottom ? "UNIFORM" : hole.edgeProfile,
                depthSamples,
              };
            }),
          });
        },

        setHoleFallAxis: (holeId, fallAxis) => {
          set({
            session: patchHole(get().session, holeId, (h) => {
              const hole = normalizeHole(h);
              const depthSamples = mergeMeasuredDepths(
                recommendDepthSamples({
                  shapeType: hole.shapeType,
                  dimensions: hole.dimensions,
                  outline: hole.outline,
                  measurementDetail: hole.measurementDetail,
                  slopeEnabled: hole.slopeEnabled,
                  fallAxis,
                }),
                hole.depthSamples,
              );
              return { ...hole, fallAxis, depthSamples };
            }),
          });
        },

        setHoleEdgeProfile: (holeId, edgeProfile) => {
          set({
            session: patchHole(get().session, holeId, (h) => {
              const hole = normalizeHole(h);
              if (hole.flatBottom) {
                return { ...hole, edgeProfile: "UNIFORM" };
              }
              return { ...hole, edgeProfile };
            }),
          });
        },

        setHoleEdgeInsetMm: (holeId, edgeInsetMm) => {
          set({
            session: patchHole(get().session, holeId, (h) => {
              const hole = normalizeHole(h);
              const next =
                edgeInsetMm == null || !Number.isFinite(edgeInsetMm)
                  ? null
                  : Math.max(0, Math.round(edgeInsetMm));
              return {
                ...hole,
                edgeInsetMm: next,
                // Setting a cover distance implies a sloped edge cover.
                edgeProfile:
                  next != null && next > 0
                    ? "SLOPED"
                    : hole.edgeProfile === "SLOPED"
                      ? "UNIFORM"
                      : hole.edgeProfile,
              };
            }),
          });
        },

        setDepthValue: (holeId, sampleId, depthMm) => {
          set({
            session: patchHole(get().session, holeId, (h) => {
              const hole = normalizeHole(h);
              const nextDepth =
                depthMm == null || !Number.isFinite(depthMm)
                  ? null
                  : Math.max(0, depthMm);
              // Flat bottom: one depth applies to every station.
              if (hole.flatBottom && nextDepth != null) {
                return {
                  ...hole,
                  depthSamples: hole.depthSamples.map((s) => ({
                    ...s,
                    depthMm: nextDepth,
                  })),
                };
              }
              return {
                ...hole,
                depthSamples: hole.depthSamples.map((s) =>
                  s.id === sampleId ? { ...s, depthMm: nextDepth } : s,
                ),
              };
            }),
          });
        },

        moveDepthSample: (holeId, sampleId, xMm, yMm) => {
          set({
            session: patchHole(get().session, holeId, (h) => ({
              ...h,
              depthSamples: h.depthSamples.map((s) =>
                s.id === sampleId
                  ? {
                      ...s,
                      xMm: Math.max(0, Math.min(h.dimensions.lengthMm, xMm)),
                      yMm: Math.max(0, Math.min(h.dimensions.widthMm, yMm)),
                      source: "USER" as const,
                    }
                  : s,
              ),
            })),
          });
        },
      }),
      {
        name: STORAGE_KEY,
        version: 6,
        partialize: (state) => ({ session: state.session }),
        merge: (persisted, current) => {
          const p = persisted as { session?: RepairSession } | undefined;
          if (!p?.session) return current;
          return {
            ...current,
            session: {
              ...p.session,
              holes: (p.session.holes ?? []).map((h) => normalizeHole(h)),
            },
          };
        },
        migrate: (persisted, fromVersion) => {
          const data = persisted as { session?: RepairSession } | undefined;
          if (data?.session?.holes) {
            const bucketRaw = (data.session as { bucketSize?: unknown })
              .bucketSize;
            let workMarginFraction =
              data.session.workMarginFraction ?? DEFAULT_WORK_MARGIN_FRACTION;
            // v5: ship 0% as the new default; migrate untouched legacy 10%.
            if (
              fromVersion < 5 &&
              Math.abs(workMarginFraction - LEGACY_DEFAULT_WORK_MARGIN_FRACTION) <
                1e-9
            ) {
              workMarginFraction = DEFAULT_WORK_MARGIN_FRACTION;
            }
            return {
              session: {
                ...data.session,
                workMarginFraction,
                recipeId: data.session.recipeId ?? null,
                bucketSize: isBucketSize(Number(bucketRaw))
                  ? (Number(bucketRaw) as 5 | 10 | 17)
                  : DEFAULT_BUCKET_SIZE,
                holes: data.session.holes.map((h) => normalizeHole(h)),
              },
            };
          }
          return { session: createRepairSession() };
        },
      },
    ),
  );
}

type Hot = typeof globalThis & {
  [HOT_STORE_KEY]?: ReturnType<typeof createRepairStore>;
};

export const useRepairStore =
  (globalThis as Hot)[HOT_STORE_KEY] ??
  ((globalThis as Hot)[HOT_STORE_KEY] = createRepairStore());
