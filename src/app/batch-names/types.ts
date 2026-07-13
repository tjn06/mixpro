export type RecipePart = {
  name: string;
  ratio: number;
};

/** Pure input for the batch-name algorithm — no React types. */
export type BatchNameInput = {
  id?: string;
  recipeName: string;
  /** Current batch total weight in kg. */
  targetWeightKg: number;
  recommendedWeightKg?: number;
  bucketSizeLiters?: number;
  /** 0–1 fill vs bucket cap; when omitted, derived from weights if possible. */
  estimatedFillRatio?: number;
  parts?: RecipePart[];
  createdAt: Date | string;
};

export type BatchNameTone = "professional" | "craft" | "playful" | "balanced";

export type NamingStyle =
  | "contextual"
  | "craft"
  | "culinary"
  | "playful"
  | "exclusive"
  | "minimal";

export type StyleWeights = Record<NamingStyle, number>;

export type ContextFamily = {
  adjectives?: readonly string[];
  nouns?: readonly string[];
  phrases?: readonly string[];
  templates?: readonly string[];
  styleBoost?: Partial<Record<NamingStyle, number>>;
  specialChance?: number;
};

export type ContextualFamiliesData = {
  size: Record<WeightSize, ContextFamily>;
  timeOfDay: Record<TimeOfDay, ContextFamily>;
  fill: Record<Exclude<BucketFill, "unknown">, ContextFamily>;
  recommendation: Record<Exclude<RecommendationStatus, "unknown">, ContextFamily>;
  compound: Record<string, ContextFamily>;
  batchNouns: readonly string[];
};

export type TimeOfDay =
  | "early"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night";

export type WeightSize = "tiny" | "small" | "medium" | "large" | "huge";

export type BucketFill =
  | "light"
  | "quarter"
  | "half"
  | "three-quarter"
  | "nearly-full"
  | "full"
  | "overflow"
  | "unknown";

export type RecommendationStatus = "under" | "close" | "over" | "unknown";

export type RecipeComplexity = "simple" | "standard" | "complex";

export type RatioProfile = "balanced" | "dominant";

export type BatchTiming = "first" | "last" | "neutral";

export type BatchContext = {
  timeOfDay: TimeOfDay;
  /** Local hour 0–23 — used for shift / night vs closing rules. */
  hour: number;
  size: WeightSize;
  fill: BucketFill;
  recommendation: RecommendationStatus;
  weekday: string;
  isFriday: boolean;
  isWeekend: boolean;
  /** Roughly end-of-day (17:00–23:59) — not after midnight. */
  isLateShift: boolean;
  dominantPart?: string;
  recipeName: string;
  recipeComplexity: RecipeComplexity;
  ratioProfile: RatioProfile;
  batchTiming: BatchTiming;
  partCount: number;
};
