import contextualFamiliesData from "../data/contextual-families.json";
import { collectContextWordPhrases, fillPoolKey } from "./contextWords";
import { CONTEXT_WORDS } from "../vocabulary";
import type {
  BatchContext,
  BatchNameTone,
  BucketFill,
  ContextFamily,
  ContextualFamiliesData,
  NamingStyle,
  StyleWeights,
} from "../types";

export const CONTEXTUAL_FAMILIES = contextualFamiliesData as ContextualFamiliesData;

export const ALL_NAMING_STYLES: readonly NamingStyle[] = [
  "contextual",
  "craft",
  "culinary",
  "playful",
  "exclusive",
  "minimal",
];

const BASE_STYLE_WEIGHTS: StyleWeights = {
  contextual: 1.2,
  craft: 1.0,
  culinary: 0.65,
  playful: 0.85,
  exclusive: 0.55,
  minimal: 0.45,
};

const BASE_SPECIAL_CHANCE = 0.12;
const MAX_SPECIAL_CHANCE = 0.85;

export type ActiveFamilies = {
  size: ContextFamily;
  time: ContextFamily;
  fill?: ContextFamily;
  recommendation?: ContextFamily;
  compounds: ContextFamily[];
  weekdayNamed?: ContextFamily;
};

function compoundKeysForContext(context: BatchContext): string[] {
  const keys: string[] = [];

  if (context.isFriday && context.isLateShift) {
    keys.push("fridayLateShift");
  } else if (context.isLateShift) {
    keys.push("lateShift");
  }

  if (context.timeOfDay === "night" && context.hour < 5) {
    keys.push("deepNight");
  } else if (context.timeOfDay === "early") {
    keys.push("earlyMorning");
  } else if (context.timeOfDay === "night") {
    keys.push("lateNight");
  }

  if (context.isWeekend) {
    keys.push("weekend");
  }

  if (!context.isWeekend && !context.isFriday) {
    keys.push("weekdayNamed");
  }

  return keys;
}

function mergeContextWords(
  family: ContextFamily | undefined,
  poolKey: keyof typeof CONTEXT_WORDS,
): ContextFamily {
  const words = CONTEXT_WORDS[poolKey];
  return {
    ...family,
    adjectives: words,
    nouns: family?.nouns ?? CONTEXT_WORDS.batchNouns,
    phrases: [...new Set([...(family?.phrases ?? []), ...words])],
    templates: family?.templates,
    styleBoost: family?.styleBoost,
    specialChance: family?.specialChance,
  };
}

function resolveFillFamily(fill: BucketFill): ContextFamily | undefined {
  if (fill === "unknown") return undefined;
  const poolKey = fillPoolKey(fill);
  if (!poolKey) return undefined;

  const jsonFamily =
    fill in CONTEXTUAL_FAMILIES.fill
      ? CONTEXTUAL_FAMILIES.fill[fill as Exclude<BucketFill, "unknown">]
      : undefined;

  return mergeContextWords(jsonFamily, poolKey);
}

export function getActiveFamilies(context: BatchContext): ActiveFamilies {
  const compounds = compoundKeysForContext(context)
    .map((key) => CONTEXTUAL_FAMILIES.compound[key])
    .filter((family): family is ContextFamily => family != null);

  return {
    size: mergeContextWords(CONTEXTUAL_FAMILIES.size[context.size], context.size),
    time: mergeContextWords(
      CONTEXTUAL_FAMILIES.timeOfDay[context.timeOfDay],
      context.timeOfDay,
    ),
    fill: resolveFillFamily(context.fill),
    recommendation:
      context.recommendation !== "unknown"
        ? mergeContextWords(
            CONTEXTUAL_FAMILIES.recommendation[context.recommendation],
            context.recommendation,
          )
        : undefined,
    compounds,
    weekdayNamed: CONTEXTUAL_FAMILIES.compound.weekdayNamed,
  };
}

function applyFamilyBoosts(weights: StyleWeights, family: ContextFamily | undefined): void {
  if (!family?.styleBoost) return;
  for (const style of ALL_NAMING_STYLES) {
    const boost = family.styleBoost[style];
    if (boost != null) weights[style] *= boost;
  }
}

export function computeStyleWeights(
  context: BatchContext,
  tone: BatchNameTone,
  variation = 0,
): StyleWeights {
  const weights: StyleWeights = { ...BASE_STYLE_WEIGHTS };
  const active = getActiveFamilies(context);

  applyFamilyBoosts(weights, active.size);
  applyFamilyBoosts(weights, active.time);
  applyFamilyBoosts(weights, active.fill);
  applyFamilyBoosts(weights, active.recommendation);
  for (const compound of active.compounds) {
    applyFamilyBoosts(weights, compound);
  }

  switch (tone) {
    case "professional":
      weights.minimal *= 3.2;
      weights.playful *= 0.25;
      weights.culinary *= 0.5;
      weights.contextual *= 0.7;
      break;
    case "craft":
      weights.craft *= 2.4;
      weights.exclusive *= 1.4;
      weights.culinary *= 0.8;
      break;
    case "playful":
      weights.playful *= 2.6;
      weights.culinary *= 1.3;
      weights.contextual *= 0.9;
      break;
    case "balanced":
    default:
      break;
  }

  const styleIndex = variation % ALL_NAMING_STYLES.length;
  const rotatedStyle = ALL_NAMING_STYLES[styleIndex]!;
  weights[rotatedStyle] *= 1.35;

  return weights;
}

export function computeSpecialChance(context: BatchContext): number {
  const active = getActiveFamilies(context);
  let chance = BASE_SPECIAL_CHANCE;

  for (const family of [active.size, active.time, active.fill, ...active.compounds]) {
    if (family?.specialChance != null) {
      chance = Math.max(chance, family.specialChance);
    }
  }

  if (context.isLateShift) {
    chance = Math.max(chance, 0.45);
  }

  return Math.min(chance, MAX_SPECIAL_CHANCE);
}

export function collectSpecialPhrases(context: BatchContext): string[] {
  const phrases = new Set<string>(collectContextWordPhrases(context));
  const active = getActiveFamilies(context);

  for (const compound of active.compounds) {
    for (const phrase of compound.phrases ?? []) {
      phrases.add(phrase);
    }
  }

  for (const family of [
    active.time,
    active.size,
    active.fill,
    active.recommendation,
  ]) {
    for (const phrase of family?.phrases ?? []) {
      phrases.add(phrase);
    }
  }

  return [...phrases];
}

export function collectContextualTemplates(context: BatchContext): string[] {
  const active = getActiveFamilies(context);
  const templates = new Set<string>();

  for (const family of [
    active.size,
    active.time,
    active.fill,
    active.recommendation,
    active.weekdayNamed,
    ...active.compounds,
  ]) {
    for (const template of family?.templates ?? []) {
      templates.add(template);
    }
  }

  return [...templates];
}

export function pickWeightedStyle(
  weights: StyleWeights,
  random: () => number,
): NamingStyle {
  const entries = ALL_NAMING_STYLES.map((style) => [style, weights[style]] as const);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;

  for (const [style, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return style;
  }

  return entries[entries.length - 1]![0];
}
