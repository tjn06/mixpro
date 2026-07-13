import { pick } from "../context";
import affixVocabulary from "../data/affix-vocabulary.json";
import culinaryVocabulary from "../data/culinary-vocabulary.json";
import type { BatchContext, NamingStyle } from "../types";
import {
  CONTEXT_WORDS,
  CRAFT_VOCABULARY,
  PROFESSIONAL_VOCABULARY,
} from "../vocabulary";
import {
  pickBatchTimingPhrase,
  pickDayPhrase,
  pickFillWord,
  pickFromPool,
  pickRatioWord,
  pickRecipeWord,
  pickRecommendationWord,
  pickSizeWord,
  pickTimeWord,
} from "./contextWords";
import { getActiveFamilies } from "./modifiers";

export type ActiveFamilies = ReturnType<typeof getActiveFamilies>;

export type TemplateContext = {
  batchContext: BatchContext;
  families: ActiveFamilies;
  style: NamingStyle;
  random: () => number;
  batchNumber: string;
};

function recipeLead(recipeName: string): string {
  return recipeName.split(/[\s—-]+/)[0]?.trim() ?? recipeName;
}

function pickCraftAdjective(context: BatchContext, random: () => number): string {
  const anchor = (context.dominantPart ?? recipeLead(context.recipeName))[0]?.toLowerCase();
  const pool = CRAFT_VOCABULARY.adjectives;
  if (anchor) {
    const matching = pool.filter((word) => word[0]?.toLowerCase() === anchor);
    if (matching.length >= 3 && random() < 0.55) {
      return pick(matching, random);
    }
  }
  return pick(pool, random);
}

function pickCraftNoun(context: BatchContext, random: () => number): string {
  return random() < 0.45
    ? pick(CRAFT_VOCABULARY.nouns, random)
    : pickFromPool(CONTEXT_WORDS.craftNouns, random);
}

function pickPlayfulContent(context: BatchContext, random: () => number): string {
  if (context.batchTiming === "last" && random() < 0.35) {
    return pickFromPool(CONTEXT_WORDS.humorousNouns, random);
  }
  if (random() < 0.4) {
    return pickFromPool(CONTEXT_WORDS.playful, random);
  }
  return random() < 0.5
    ? pick(CRAFT_VOCABULARY.whimsical, random)
    : pick(CRAFT_VOCABULARY.phrases, random);
}

export function resolveSlot(slot: string, ctx: TemplateContext): string {
  const { batchContext: context, random, batchNumber } = ctx;

  switch (slot) {
    case "size.adjective":
      return pickSizeWord(context, random);
    case "size.noun":
      return pickSizeWord(context, random);
    case "time.adjective":
      return pickTimeWord(context, random);
    case "time.noun":
      return pickTimeWord(context, random);
    case "fill.adjective":
      return pickFillWord(context, random);
    case "fill.phrase":
      return pickFillWord(context, random);
    case "rec.adjective":
      return pickRecommendationWord(context, random);
    case "rec.phrase":
      return pickRecommendationWord(context, random);
    case "recipe.adjective":
      return pickRecipeWord(context, random);
    case "ratio.adjective":
      return pickRatioWord(context, random);
    case "day.phrase":
      return pickDayPhrase(context, random);
    case "timing.phrase":
      return pickBatchTimingPhrase(context, random);
    case "batchNoun":
      return pickFromPool(CONTEXT_WORDS.batchNouns, random);
    case "weekday":
      return context.weekday;
    case "dominantPart":
      return context.dominantPart ?? pickCraftNoun(context, random);
    case "recipe.lead":
      return recipeLead(context.recipeName);
    case "craft.adjective":
      return pickCraftAdjective(context, random);
    case "craft.noun":
      return pickCraftNoun(context, random);
    case "craft.title":
      return pick(CRAFT_VOCABULARY.titles, random);
    case "culinary.noun":
      return pickFromPool(CONTEXT_WORDS.culinaryNouns, random);
    case "humorous.noun":
      return pickFromPool(CONTEXT_WORDS.humorousNouns, random);
    case "precise.adjective":
      return pickFromPool(CONTEXT_WORDS.precise, random);
    case "playful.adjective":
      return pickFromPool(CONTEXT_WORDS.playful, random);
    case "batchNumber":
      return batchNumber;
    case "prefix":
      return pick(culinaryVocabulary.prefixes, random);
    case "descriptor":
      return pick(culinaryVocabulary.descriptors, random);
    case "exclusive":
      return pick(CRAFT_VOCABULARY.exclusive, random);
    case "professional":
      return pick(PROFESSIONAL_VOCABULARY, random);
    case "leading":
      return pick(affixVocabulary.leading, random);
    case "playful":
      return pickPlayfulContent(context, random);
    case "trailing": {
      const suffix = pick(affixVocabulary.trailing, random);
      if (!suffix.includes("{")) return suffix;
      return suffix.replace(/\{([^}]+)\}/g, (_, inner: string) =>
        resolveSlot(inner.trim(), ctx),
      );
    }
    default:
      return slot;
  }
}

export function renderTemplate(pattern: string, ctx: TemplateContext): string {
  const rendered = pattern.replace(/\{([^}]+)\}/g, (_, slot: string) =>
    resolveSlot(slot.trim(), ctx),
  );
  return rendered.replace(/\s{2,}/g, " ").trim();
}

export function randomBatchNumber(random: () => number, max = 99): string {
  return String(Math.floor(random() * max) + 1);
}

export function buildTemplateContext(
  context: BatchContext,
  families: ActiveFamilies,
  style: NamingStyle,
  random: () => number,
  batchNumber = randomBatchNumber(random),
): TemplateContext {
  return {
    batchContext: context,
    families,
    style,
    random,
    batchNumber,
  };
}
