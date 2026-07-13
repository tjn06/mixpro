import type { NamingStyle } from "../types";

/** Slots used by the auto-expansion grammar. */
export const GRAMMAR_SLOT_PAIRS: readonly (readonly [string, string])[] = [
  ["time.adjective", "size.adjective"],
  ["time.adjective", "batchNoun"],
  ["size.adjective", "batchNoun"],
  ["craft.adjective", "craft.noun"],
  ["craft.adjective", "dominantPart"],
  ["craft.adjective", "recipe.lead"],
  ["time.adjective", "dominantPart"],
  ["size.adjective", "dominantPart"],
  ["fill.adjective", "batchNoun"],
  ["rec.adjective", "batchNoun"],
  ["dominantPart", "batchNoun"],
  ["prefix", "time.adjective"],
  ["craft.noun", "batchNoun"],
  ["recipe.adjective", "batchNoun"],
  ["ratio.adjective", "dominantPart"],
  ["day.phrase", "batchNoun"],
  ["timing.phrase", "batchNoun"],
  ["culinary.noun", "batchNoun"],
  ["humorous.noun", "batchNoun"],
];

export const GRAMMAR_SLOT_TRIPLES: readonly (readonly [string, string, string])[] = [
  ["time.adjective", "size.adjective", "batchNoun"],
  ["time.adjective", "craft.adjective", "batchNoun"],
  ["craft.adjective", "size.adjective", "batchNoun"],
  ["craft.adjective", "dominantPart", "batchNoun"],
  ["time.adjective", "dominantPart", "batchNoun"],
  ["size.adjective", "dominantPart", "batchNoun"],
  ["rec.adjective", "time.adjective", "batchNoun"],
  ["fill.adjective", "craft.adjective", "batchNoun"],
  ["craft.adjective", "fill.adjective", "batchNoun"],
  ["prefix", "dominantPart", "batchNoun"],
  ["craft.adjective", "craft.noun", "batchNoun"],
  ["time.adjective", "size.adjective", "dominantPart"],
  ["recipe.adjective", "ratio.adjective", "batchNoun"],
  ["day.phrase", "size.adjective", "batchNoun"],
  ["timing.phrase", "dominantPart", "batchNoun"],
  ["leading", "culinary.noun", "trailing"],
];

/** Cross-style hybrids — pools from contextual, craft, culinary, exclusive. */
export const HYBRID_TEMPLATES: readonly string[] = [
  "{leading} {time.adjective} {craft.noun}",
  "{leading} {craft.adjective} {fill.phrase}",
  "{prefix} {dominantPart} {batchNoun}",
  "{descriptor} {time.adjective} {batchNoun}",
  "{exclusive} — {weekday} Edition",
  "{craft.adjective} {time.adjective} {dominantPart}",
  "{prefix} {craft.adjective} {dominantPart} Reserve",
  "{leading} {rec.adjective} {craft.noun}",
  "{descriptor} {dominantPart} No. {batchNumber}",
  "{exclusive} {fill.adjective} {batchNoun}",
  "{craft.title} {time.adjective} {batchNoun}",
  "{leading} {size.adjective} {craft.noun}{trailing}",
  "{prefix} {recipe.lead} {batchNoun}{trailing}",
  "{craft.adjective} {dominantPart} — {weekday}{trailing}",
  "{leading} {recipe.adjective} {batchNoun}",
  "{ratio.adjective} {dominantPart} {batchNoun}",
  "{day.phrase} {batchNoun}",
  "{timing.phrase} {dominantPart}",
  "{leading} {culinary.noun}{trailing}",
  "{humorous.noun} No. {batchNumber}",
  "{playful.adjective} {humorous.noun}",
];

function slotPattern(slots: readonly string[]): string {
  return slots.map((slot) => `{${slot}}`).join(" ");
}

/** Auto-generated pair/triple templates with optional affix wrappers. */
export function expandGrammarTemplates(includeAffixWrap = true): string[] {
  const templates = new Set<string>();

  for (const pair of GRAMMAR_SLOT_PAIRS) {
    const core = slotPattern(pair);
    templates.add(core);
    templates.add(`The ${core}`);
    if (includeAffixWrap) {
      templates.add(`{leading} ${core}{trailing}`);
    }
  }

  for (const triple of GRAMMAR_SLOT_TRIPLES) {
    const core = slotPattern(triple);
    templates.add(core);
    templates.add(`The ${core}`);
    if (includeAffixWrap) {
      templates.add(`{leading} ${core}{trailing}`);
    }
  }

  return [...templates];
}

const STYLE_GRAMMAR: Partial<Record<NamingStyle, boolean>> = {
  contextual: true,
  craft: true,
  culinary: true,
  exclusive: true,
  minimal: false,
  playful: false,
};

export function grammarTemplatesForStyle(style: NamingStyle): string[] {
  if (!STYLE_GRAMMAR[style]) return [];
  return expandGrammarTemplates(style !== "minimal");
}

export function hybridTemplatesForStyle(style: NamingStyle): string[] {
  if (style === "minimal") return [];
  if (style === "playful") {
    return [
      "{leading} {playful.adjective} {humorous.noun}{trailing}",
      "{humorous.noun} {batchNoun}",
    ];
  }
  return [...HYBRID_TEMPLATES];
}

export function resolveVariationIndices(
  variation: number,
  templateCount: number,
  styleCount: number,
): { styleIndex: number; templateIndex: number } {
  const safeTemplateCount = Math.max(1, templateCount);
  const safeStyleCount = Math.max(1, styleCount);
  return {
    templateIndex: variation % safeTemplateCount,
    styleIndex: Math.floor(variation / safeTemplateCount) % safeStyleCount,
  };
}

export function cyclicStyleAtVariation(
  variation: number,
  styles: readonly NamingStyle[],
): NamingStyle {
  return styles[variation % styles.length] ?? styles[0]!;
}
