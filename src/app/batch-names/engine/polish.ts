import type { BatchContext } from "../types";

function words(name: string): string[] {
  return name.split(/\s+/).filter(Boolean);
}

function startsWithSameLetter(a: string, b: string): boolean {
  const letterA = a[0]?.toLowerCase();
  const letterB = b[0]?.toLowerCase();
  return letterA != null && letterB != null && letterA === letterB;
}

function hasRepeatedWord(name: string): boolean {
  const lower = words(name).map((word) => word.toLowerCase());
  return new Set(lower).size !== lower.length;
}

/**
 * Deterministic quality score — higher is better.
 * Used to pick among multiple generated candidates.
 */
export function scoreName(name: string, context: BatchContext): number {
  let score = 0;
  const parts = words(name);

  if (parts.length >= 2 && parts.length <= 5) score += 2;
  if (parts.length === 1 && name.length <= 24) score += 1;
  if (parts.length > 6) score -= 2;

  const anchor =
    context.dominantPart?.split(/\s+/)[0] ??
    context.recipeName.split(/[\s—-]+/)[0]?.trim();
  if (anchor) {
    const anchorLetter = anchor[0]?.toLowerCase();
    if (parts.some((word) => word[0]?.toLowerCase() === anchorLetter)) {
      score += 2;
    }
    if (parts.some((word) => word.toLowerCase().includes(anchor.toLowerCase()))) {
      score += 1;
    }
  }

  if (parts.length >= 2 && startsWithSameLetter(parts[0]!, parts[1]!)) {
    score += 1;
  }

  if (hasRepeatedWord(name)) score -= 4;
  if (/(\w+)\s+\1/i.test(name)) score -= 4;
  if (/^\s|\s$/.test(name)) score -= 3;
  if (name.includes("undefined") || name.includes("{")) score -= 10;

  return score;
}

export function pickBestCandidate(
  candidates: string[],
  context: BatchContext,
  random: () => number,
): string {
  const unique = [...new Set(candidates.map((c) => c.trim()).filter(Boolean))];
  if (unique.length === 0) return "Standard Mix";
  if (unique.length === 1) return unique[0]!;

  const scored = unique
    .map((name) => ({ name, score: scoreName(name, context) }))
    .sort((a, b) => b.score - a.score);

  const topScore = scored[0]!.score;
  const topTier = scored.filter((entry) => entry.score >= topScore - 0.5);
  return topTier[Math.floor(random() * topTier.length)]!.name;
}
