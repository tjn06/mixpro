import {
  buildBatchContext,
  buildBatchNameSeed,
  createSeededRandom,
  hashString,
  pick,
} from "./context";
import { ALL_NAMING_STYLES, collectSpecialPhrases, computeSpecialChance } from "./engine/modifiers";
import { cyclicStyleAtVariation, resolveVariationIndices } from "./engine/templateGrammar";
import { pickBestCandidate } from "./engine/polish";
import { generateCandidatesForStyle, templatesForStyle } from "./styles";
import type { BatchNameInput, BatchNameTone, NamingStyle } from "./types";

function maxTemplateCount(context: ReturnType<typeof buildBatchContext>): number {
  return Math.max(
    1,
    ...ALL_NAMING_STYLES.map((style) => templatesForStyle(style, context).length),
  );
}

function resolveStyleFromVariation(
  variation: number,
  context: ReturnType<typeof buildBatchContext>,
  tone: BatchNameTone,
): NamingStyle {
  const templateCount = maxTemplateCount(context);
  const { styleIndex } = resolveVariationIndices(
    variation,
    templateCount,
    ALL_NAMING_STYLES.length,
  );

  if (tone === "professional") return "minimal";
  if (tone === "craft") {
    const order: NamingStyle[] = [
      "craft",
      "exclusive",
      "contextual",
      "culinary",
      "minimal",
      "playful",
    ];
    return order[styleIndex % order.length]!;
  }
  if (tone === "playful") {
    const order: NamingStyle[] = [
      "playful",
      "contextual",
      "culinary",
      "craft",
      "exclusive",
      "minimal",
    ];
    return order[styleIndex % order.length]!;
  }

  return cyclicStyleAtVariation(styleIndex, ALL_NAMING_STYLES);
}

/**
 * Deterministic batch name from properties + variation index.
 * Same input + variation always yields the same name.
 */
export function generateBatchName(
  input: BatchNameInput,
  variation = 0,
  tone: BatchNameTone = "balanced",
): string {
  const random = createSeededRandom(hashString(buildBatchNameSeed(input, variation)));
  const context = buildBatchContext(input);

  if (tone !== "professional") {
    const specialChance = computeSpecialChance(context);
    if (random() < specialChance) {
      const phrases = collectSpecialPhrases(context);
      if (phrases.length) {
        return pick(phrases, random);
      }
    }
  }

  const style = resolveStyleFromVariation(variation, context, tone);
  const candidates = generateCandidatesForStyle(style, context, random, variation);

  if (candidates.length === 0) {
    return generateFallbackName(context, random, style, variation, tone);
  }

  return pickBestCandidate(candidates, context, random);
}

function generateFallbackName(
  context: ReturnType<typeof buildBatchContext>,
  random: () => number,
  style: NamingStyle,
  variation: number,
  tone: BatchNameTone,
): string {
  const secondaryStyle: NamingStyle = style === "contextual" ? "craft" : "contextual";
  const fallbackCandidates = generateCandidatesForStyle(
    secondaryStyle,
    context,
    random,
    variation + 1,
  );
  if (fallbackCandidates.length) {
    return pickBestCandidate(fallbackCandidates, context, random);
  }

  const tertiaryStyle = resolveStyleFromVariation(variation + 2, context, tone);
  const tertiaryCandidates = generateCandidatesForStyle(
    tertiaryStyle,
    context,
    random,
    variation + 2,
  );
  if (tertiaryCandidates.length) {
    return pickBestCandidate(tertiaryCandidates, context, random);
  }

  return "Standard Mix";
}

/** Several unique proposals — increase variation until count is met. */
export function generateBatchNameProposals(
  input: BatchNameInput,
  count = 5,
  tone: BatchNameTone = "balanced",
): string[] {
  const proposals = new Set<string>();
  let variation = 0;
  const maximumAttempts = count * 12;

  while (proposals.size < count && variation < maximumAttempts) {
    proposals.add(generateBatchName(input, variation, tone));
    variation += 1;
  }

  return [...proposals];
}
