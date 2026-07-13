import { pick } from "../context";
import culinaryVocabulary from "../data/culinary-vocabulary.json";
import {
  collectContextualTemplates,
  collectSpecialPhrases,
  getActiveFamilies,
} from "../engine/modifiers";
import {
  grammarTemplatesForStyle,
  hybridTemplatesForStyle,
} from "../engine/templateGrammar";
import type { ActiveFamilies } from "../engine/templates";
import {
  buildTemplateContext,
  randomBatchNumber,
  renderTemplate,
} from "../engine/templates";
import type { BatchContext, NamingStyle } from "../types";
import { CRAFT_VOCABULARY } from "../vocabulary";

/** Candidates rendered per style before polish picks the best. */
export const CANDIDATE_COUNT = 10;

const CONTEXTUAL_FALLBACK_TEMPLATES = [
  "The {time.adjective} {size.adjective} {batchNoun}",
  "{time.adjective} {batchNoun}",
  "{size.adjective} {batchNoun}",
  "{fill.phrase}",
  "{rec.phrase} {batchNoun}",
  "{weekday} {batchNoun}",
  "{dominantPart} {batchNoun}",
  "{leading} {time.adjective} {size.adjective} {batchNoun}{trailing}",
  "{leading} {fill.phrase}{trailing}",
  "{recipe.adjective} {ratio.adjective} {batchNoun}",
  "{day.phrase} {batchNoun}",
  "{timing.phrase} {dominantPart}",
  "{ratio.adjective} {time.adjective} {batchNoun}",
];

const CRAFT_TEMPLATES = [
  "{craft.adjective} {craft.noun}",
  "{craft.adjective} {craft.noun} No. {batchNumber}",
  "{craft.adjective} {recipe.lead}",
  "{craft.noun} No. {batchNumber}",
  "{craft.title} {craft.noun}",
  "{craft.title} {craft.adjective} {craft.noun}",
  "{craft.title} of the {craft.noun}",
  "{craft.title} {dominantPart}",
  "{craft.adjective} {dominantPart} Reserve",
  "{time.adjective} {dominantPart} Reserve",
  "{craft.adjective} {fill.adjective} Measure",
  "{leading} {craft.adjective} {craft.noun}{trailing}",
];

const EXCLUSIVE_TEMPLATES = [
  "{exclusive}",
  "{exclusive} No. {batchNumber}",
  "Private {batchNoun} No. {batchNumber}",
  "Heritage {dominantPart}",
  "Signature {time.adjective} Edition",
  "{leading} {exclusive}{trailing}",
];

const MINIMAL_TEMPLATES = [
  "{professional}",
  "{professional} {batchNumber}",
  "{leading} {professional}{trailing}",
];

const PLAYFUL_AFFIX_TEMPLATES = [
  "{leading} {playful}{trailing}",
  "{playful} {batchNoun}",
  "{leading} {playful} {batchNoun}{trailing}",
  "{leading} {playful.adjective} {humorous.noun}{trailing}",
  "{humorous.noun} {batchNoun}",
  "{playful.adjective} {timing.phrase}",
];

function uniqueTemplates(...groups: string[][]): string[] {
  return [...new Set(groups.flat())];
}

export function templatesForStyle(style: NamingStyle, context: BatchContext): string[] {
  const contextual = [
    ...collectContextualTemplates(context),
    ...CONTEXTUAL_FALLBACK_TEMPLATES,
  ];
  const grammar = grammarTemplatesForStyle(style);
  const hybrid = hybridTemplatesForStyle(style);

  switch (style) {
    case "contextual":
      return uniqueTemplates(contextual, grammar, hybrid);
    case "craft":
      return uniqueTemplates(CRAFT_TEMPLATES, grammar, hybrid);
    case "culinary":
      return uniqueTemplates([...culinaryVocabulary.templates], grammar, hybrid);
    case "playful":
      return uniqueTemplates(PLAYFUL_AFFIX_TEMPLATES, hybrid);
    case "exclusive":
      return uniqueTemplates(EXCLUSIVE_TEMPLATES, grammar, hybrid);
    case "minimal":
      return uniqueTemplates(MINIMAL_TEMPLATES);
    default:
      return uniqueTemplates(contextual, grammar, hybrid);
  }
}

function renderPattern(
  pattern: string,
  context: BatchContext,
  families: ActiveFamilies,
  style: NamingStyle,
  random: () => number,
  batchNumber: string,
): string {
  return renderTemplate(
    pattern,
    buildTemplateContext(context, families, style, random, batchNumber),
  );
}

function generateFromTemplates(
  templates: string[],
  context: BatchContext,
  families: ActiveFamilies,
  style: NamingStyle,
  random: () => number,
  count: number,
  variation = 0,
): string[] {
  if (templates.length === 0) return [];

  const results: string[] = [];
  const batchNumber = randomBatchNumber(random);
  const templateIndex = variation % templates.length;
  const deterministicPattern = templates[templateIndex]!;

  results.push(
    renderPattern(deterministicPattern, context, families, style, random, batchNumber),
  );

  for (let index = results.length; index < count; index += 1) {
    const pattern = pick(templates, random);
    results.push(renderPattern(pattern, context, families, style, random, batchNumber));
  }

  return results;
}

function generateContextual(
  context: BatchContext,
  random: () => number,
  variation: number,
): string[] {
  const families = getActiveFamilies(context);
  const templates = templatesForStyle("contextual", context);
  const phrases = collectSpecialPhrases(context);

  const candidates = generateFromTemplates(
    templates,
    context,
    families,
    "contextual",
    random,
    CANDIDATE_COUNT,
    variation,
  );

  if (phrases.length && random() < 0.35) {
    candidates.push(pick(phrases, random));
  }

  return candidates;
}

function generateCraft(
  context: BatchContext,
  random: () => number,
  variation: number,
): string[] {
  const families = getActiveFamilies(context);
  return generateFromTemplates(
    templatesForStyle("craft", context),
    context,
    families,
    "craft",
    random,
    CANDIDATE_COUNT,
    variation,
  );
}

function generateCulinary(
  context: BatchContext,
  random: () => number,
  variation: number,
): string[] {
  const families = getActiveFamilies(context);
  const candidates = generateFromTemplates(
    templatesForStyle("culinary", context),
    context,
    families,
    "culinary",
    random,
    CANDIDATE_COUNT - 1,
    variation,
  );

  candidates.push(pick(culinaryVocabulary.descriptors, random));
  return candidates;
}

function generatePlayful(
  context: BatchContext,
  random: () => number,
  variation: number,
): string[] {
  const families = getActiveFamilies(context);
  const candidates = generateFromTemplates(
    templatesForStyle("playful", context),
    context,
    families,
    "playful",
    random,
    4,
    variation,
  );

  const contextualPhrases = collectSpecialPhrases(context);
  if (contextualPhrases.length && random() < 0.5) {
    candidates.push(pick(contextualPhrases, random));
  }

  const phrasePool =
    random() < 0.5 ? CRAFT_VOCABULARY.whimsical : CRAFT_VOCABULARY.phrases;
  while (candidates.length < CANDIDATE_COUNT) {
    if (random() < 0.45) {
      candidates.push(
        renderPattern(
          pick(PLAYFUL_AFFIX_TEMPLATES, random),
          context,
          families,
          "playful",
          random,
          randomBatchNumber(random),
        ),
      );
    } else {
      candidates.push(pick(phrasePool, random));
    }
  }

  return candidates;
}

function generateExclusive(
  context: BatchContext,
  random: () => number,
  variation: number,
): string[] {
  const families = getActiveFamilies(context);
  return generateFromTemplates(
    templatesForStyle("exclusive", context),
    context,
    families,
    "exclusive",
    random,
    CANDIDATE_COUNT,
    variation,
  );
}

function generateMinimal(
  context: BatchContext,
  random: () => number,
  variation: number,
): string[] {
  const families = getActiveFamilies(context);
  return generateFromTemplates(
    templatesForStyle("minimal", context),
    context,
    families,
    "minimal",
    random,
    CANDIDATE_COUNT,
    variation,
  );
}

export function generateCandidatesForStyle(
  style: NamingStyle,
  context: BatchContext,
  random: () => number,
  variation = 0,
): string[] {
  switch (style) {
    case "contextual":
      return generateContextual(context, random, variation);
    case "craft":
      return generateCraft(context, random, variation);
    case "culinary":
      return generateCulinary(context, random, variation);
    case "playful":
      return generatePlayful(context, random, variation);
    case "exclusive":
      return generateExclusive(context, random, variation);
    case "minimal":
      return generateMinimal(context, random, variation);
    default:
      return generateContextual(context, random, variation);
  }
}
