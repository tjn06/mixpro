import {
  formatRepairAreaMm2,
  formatRepairLiters,
  formatRepairMassGrams,
  formatWorkMarginPercent,
} from "./format";
import { formatRepairPackagingReportText } from "./packaging";
import type { RepairCalcBasis } from "./planning";
import type { RepairConfidence } from "./types";

/** Prepend optional comment title to a repair share body. */
export function withRepairShareComment(
  reportText: string,
  comment?: string,
): string {
  const trimmed = comment?.trim();
  if (!trimmed) return reportText;
  return formatRepairPackagingReportText([trimmed, "", reportText]);
}

export type RepairMaterialShareLabels = {
  title: string;
  recipeLabel: string;
  areaLabel: string;
  marginLabel: string;
  basisLabel: string;
  volumeLabel: string;
  rangeLabel: string;
  componentsHeading: string;
  totalMassLabel: string;
};

/** Simple material-required plaintext for copy / mail / SMS. */
export function buildRepairMaterialShareText(input: {
  labels: RepairMaterialShareLabels;
  recipeName: string;
  selectedHolesLabel: string;
  totalAreaMm2: number;
  workMarginFraction: number;
  calcBasisLabel: string;
  volumeLiters: number;
  rangeLowLiters: number;
  rangeHighLiters: number;
  confidenceLabel: string;
  components: readonly { label: string; grams: number }[];
  totalGrams: number;
}): string {
  const { labels } = input;
  return formatRepairPackagingReportText([
    labels.title,
    "",
    `${labels.recipeLabel}: ${input.recipeName}`,
    input.selectedHolesLabel,
    `${labels.areaLabel}: ${formatRepairAreaMm2(input.totalAreaMm2)}`,
    `${labels.marginLabel}: ${formatWorkMarginPercent(input.workMarginFraction)}`,
    `${labels.basisLabel}: ${input.calcBasisLabel}`,
    "",
    `${labels.volumeLabel}: ${formatRepairLiters(input.volumeLiters)}`,
    `${labels.rangeLabel}: ${formatRepairLiters(input.rangeLowLiters)} – ${formatRepairLiters(input.rangeHighLiters)}`,
    input.confidenceLabel,
    "",
    labels.componentsHeading,
    ...input.components.map(
      (c) => `${c.label}: ${formatRepairMassGrams(c.grams)}`,
    ),
    `${labels.totalMassLabel}: ${formatRepairMassGrams(input.totalGrams)}`,
  ]);
}

export function calcBasisShareLabel(
  basis: RepairCalcBasis,
  labels: { planning: string; estimated: string },
): string {
  return basis === "ESTIMATED" ? labels.estimated : labels.planning;
}

export function confidenceShareLabel(
  confidence: RepairConfidence,
  t: (key: string) => string,
): string {
  switch (confidence) {
    case "HIGH":
      return t("repair.confidence.high");
    case "MEDIUM":
      return t("repair.confidence.medium");
    case "LOW":
      return t("repair.confidence.low");
    case "EXPERIMENTAL":
      return t("repair.confidence.experimental");
  }
}
