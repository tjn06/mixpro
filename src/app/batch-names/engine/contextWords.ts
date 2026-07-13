import { pick } from "../context";
import type { BatchContext, BucketFill, RecipeComplexity, RatioProfile } from "../types";
import { CONTEXT_WORDS } from "../vocabulary";

export type ContextWordPoolKey = keyof typeof CONTEXT_WORDS;

const FILL_POOL_KEY: Record<Exclude<BucketFill, "unknown">, ContextWordPoolKey> = {
  light: "lightFill",
  quarter: "quarterFill",
  half: "halfFill",
  "three-quarter": "threeQuarterFill",
  "nearly-full": "nearlyFull",
  full: "full",
  overflow: "overflow",
};

export function fillPoolKey(fill: BucketFill): ContextWordPoolKey | null {
  if (fill === "unknown") return null;
  return FILL_POOL_KEY[fill];
}

export function poolForKey(key: ContextWordPoolKey): readonly string[] {
  return CONTEXT_WORDS[key];
}

export function pickFromPool(
  pool: readonly string[],
  random: () => number,
): string {
  if (pool.length === 0) return "Batch";
  return pick(pool, random);
}

export function pickTimeWord(context: BatchContext, random: () => number): string {
  return pickFromPool(CONTEXT_WORDS[context.timeOfDay], random);
}

export function pickSizeWord(context: BatchContext, random: () => number): string {
  return pickFromPool(CONTEXT_WORDS[context.size], random);
}

export function pickFillWord(context: BatchContext, random: () => number): string {
  const key = fillPoolKey(context.fill);
  if (!key) return pickFromPool(CONTEXT_WORDS.halfFill, random);
  return pickFromPool(CONTEXT_WORDS[key], random);
}

export function pickRecommendationWord(
  context: BatchContext,
  random: () => number,
): string {
  if (context.recommendation === "unknown") {
    return pickFromPool(CONTEXT_WORDS.close, random);
  }
  return pickFromPool(CONTEXT_WORDS[context.recommendation], random);
}

export function pickRecipeWord(context: BatchContext, random: () => number): string {
  const key: ContextWordPoolKey =
    context.recipeComplexity === "simple"
      ? "simpleRecipe"
      : context.recipeComplexity === "complex"
        ? "complexRecipe"
        : "standardRecipe";
  return pickFromPool(CONTEXT_WORDS[key], random);
}

export function pickRatioWord(context: BatchContext, random: () => number): string {
  const key: ContextWordPoolKey =
    context.ratioProfile === "dominant" ? "dominantRatio" : "balancedRatio";
  return pickFromPool(CONTEXT_WORDS[key], random);
}

export function pickDayPhrase(context: BatchContext, random: () => number): string {
  if (context.isFriday && context.isLateShift) {
    return pickFromPool(
      [...CONTEXT_WORDS.friday, ...CONTEXT_WORDS.lateShift],
      random,
    );
  }
  if (context.isFriday) return pickFromPool(CONTEXT_WORDS.friday, random);
  if (context.isWeekend) return pickFromPool(CONTEXT_WORDS.weekend, random);
  if (context.isLateShift) return pickFromPool(CONTEXT_WORDS.lateShift, random);
  return context.weekday;
}

export function pickBatchTimingPhrase(
  context: BatchContext,
  random: () => number,
): string {
  if (context.batchTiming === "first") {
    return pickFromPool(CONTEXT_WORDS.firstBatch, random);
  }
  if (context.batchTiming === "last") {
    return pickFromPool(CONTEXT_WORDS.lastBatch, random);
  }
  return pickTimeWord(context, random);
}

export function collectContextWordPhrases(context: BatchContext): string[] {
  const phrases = new Set<string>();

  for (const word of CONTEXT_WORDS[context.timeOfDay]) phrases.add(word);
  for (const word of CONTEXT_WORDS[context.size]) phrases.add(word);

  const fillKey = fillPoolKey(context.fill);
  if (fillKey) {
    for (const word of CONTEXT_WORDS[fillKey]) phrases.add(word);
  }

  if (context.recommendation !== "unknown") {
    for (const word of CONTEXT_WORDS[context.recommendation]) phrases.add(word);
  }

  if (context.isFriday) {
    for (const word of CONTEXT_WORDS.friday) phrases.add(word);
  }
  if (context.isWeekend) {
    for (const word of CONTEXT_WORDS.weekend) phrases.add(word);
  }
  if (context.isLateShift) {
    for (const word of CONTEXT_WORDS.lateShift) phrases.add(word);
  }
  if (context.batchTiming === "first") {
    for (const word of CONTEXT_WORDS.firstBatch) phrases.add(word);
  }
  if (context.batchTiming === "last") {
    for (const word of CONTEXT_WORDS.lastBatch) phrases.add(word);
  }

  return [...phrases];
}

export function recipeComplexityFromPartCount(partCount: number): RecipeComplexity {
  if (partCount <= 2) return "simple";
  if (partCount <= 4) return "standard";
  return "complex";
}

export function ratioProfileFromParts(
  parts: { ratio: number }[] | undefined,
): RatioProfile {
  if (!parts?.length) return "balanced";
  const maxRatio = Math.max(...parts.map((part) => part.ratio));
  const total = parts.reduce((sum, part) => sum + part.ratio, 0);
  if (total <= 0) return "balanced";
  return maxRatio / total > 0.55 ? "dominant" : "balanced";
}
