import type {
  BatchContext,
  BatchNameInput,
  BatchTiming,
  RecipePart,
  RecommendationStatus,
  TimeOfDay,
  WeightSize,
} from "./types";
import {
  ratioProfileFromParts,
  recipeComplexityFromPartCount,
} from "./engine/contextWords";

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

export function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  // After midnight through 04:59 — night, not “before coffee”.
  if (hour < 5 || hour >= 22) return "night";
  if (hour < 7) return "early";
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function getWeightSize(
  targetWeightKg: number,
  recommendedWeightKg?: number,
): WeightSize {
  if (!recommendedWeightKg || recommendedWeightKg <= 0) {
    if (targetWeightKg < 2) return "tiny";
    if (targetWeightKg < 8) return "small";
    if (targetWeightKg < 20) return "medium";
    if (targetWeightKg < 50) return "large";
    return "huge";
  }

  const ratio = targetWeightKg / recommendedWeightKg;
  if (ratio < 0.35) return "tiny";
  if (ratio < 0.75) return "small";
  if (ratio <= 1.2) return "medium";
  if (ratio <= 2) return "large";
  return "huge";
}

export function getRecommendationStatus(
  targetWeightKg: number,
  recommendedWeightKg?: number,
): RecommendationStatus {
  if (!recommendedWeightKg || recommendedWeightKg <= 0) return "unknown";
  const ratio = targetWeightKg / recommendedWeightKg;
  if (ratio < 0.9) return "under";
  if (ratio <= 1.1) return "close";
  return "over";
}

export function getBucketFillFromRatio(fillRatio?: number): BucketFill {
  if (fillRatio == null || !Number.isFinite(fillRatio)) return "unknown";
  if (fillRatio > 1.02) return "overflow";
  if (fillRatio >= 0.98) return "full";
  if (fillRatio >= 0.85) return "nearly-full";
  if (fillRatio >= 0.65) return "three-quarter";
  if (fillRatio >= 0.4) return "half";
  if (fillRatio >= 0.25) return "quarter";
  return "light";
}

export function getDominantPart(parts?: RecipePart[]): string | undefined {
  if (!parts?.length) return undefined;
  return [...parts].sort((a, b) => b.ratio - a.ratio)[0]?.name;
}

function getBatchTiming(hour: number, timeOfDay: TimeOfDay, isLateShift: boolean): BatchTiming {
  if (hour < 8 || timeOfDay === "early") return "first";
  if (isLateShift || hour >= 21) return "last";
  return "neutral";
}

export function buildBatchContext(input: BatchNameInput): BatchContext {
  const createdAt = new Date(input.createdAt);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "long" }).format(createdAt);
  const day = createdAt.getDay();
  const hour = createdAt.getHours();
  const timeOfDay = getTimeOfDay(createdAt);
  const isLateShift = hour >= 17 && hour <= 23;
  const parts = input.parts ?? [];
  const partCount = parts.length;

  return {
    timeOfDay,
    hour,
    size: getWeightSize(input.targetWeightKg, input.recommendedWeightKg),
    fill: getBucketFillFromRatio(input.estimatedFillRatio),
    recommendation: getRecommendationStatus(
      input.targetWeightKg,
      input.recommendedWeightKg,
    ),
    weekday,
    isFriday: day === 5,
    isWeekend: day === 0 || day === 6,
    isLateShift,
    dominantPart: getDominantPart(parts),
    recipeName: input.recipeName,
    recipeComplexity: recipeComplexityFromPartCount(partCount),
    ratioProfile: ratioProfileFromParts(parts),
    batchTiming: getBatchTiming(hour, timeOfDay, isLateShift),
    partCount,
  };
}

export function buildBatchNameSeed(
  input: BatchNameInput,
  variation: number,
): string {
  const createdAt = new Date(input.createdAt);
  return [
    input.id ?? "",
    input.recipeName,
    input.targetWeightKg,
    input.recommendedWeightKg ?? "",
    input.bucketSizeLiters ?? "",
    input.estimatedFillRatio ?? "",
    createdAt.toISOString(),
    variation,
  ].join("|");
}
