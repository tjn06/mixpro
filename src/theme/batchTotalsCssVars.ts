import { componentTokens } from "./components";
import { themeSurfaces } from "./surfaces";
import { alphaBlack, alphaWhite } from "./primitives";
import {
  extraBatchDarkHc,
  extraBatchLight,
  extraBatchLightHc,
} from "./extraBatchTheme";

/** CSS custom properties for batch-totals surfaces (injected on :root). */
export const batchTotalsCssVarNames = {
  cardHeaderBg: "--component-batch-totals-card-header-bg",
  extraCardHeaderBg: "--component-batch-totals-extra-card-header-bg",
  extraTableThBg: "--component-batch-totals-extra-table-th-bg",
  batchesCardBg: "--component-batch-totals-batches-card-bg",
  extraBatchBg: "--component-batch-totals-extra-batch-bg",
  emptyCardBg: "--component-batch-totals-empty-card-bg",
  extraBatchBorder: "--component-batch-totals-extra-batch-border",
  extraBatchDashedBorder: "--component-batch-totals-extra-batch-dashed-border",
  insetHighlight: "--component-batch-totals-inset-highlight",
} as const;

/** Dark default batch-totals surfaces. */
export function getDarkBatchTotalsCssEntries(): [string, string][] {
  const bt = componentTokens.batchTotals;
  return [
    [batchTotalsCssVarNames.cardHeaderBg, bt.cardHeaderBackground],
    [batchTotalsCssVarNames.extraCardHeaderBg, bt.extraCardHeaderBackground],
    [batchTotalsCssVarNames.extraTableThBg, bt.extraTableThBackground],
    [batchTotalsCssVarNames.batchesCardBg, bt.batchesCardBackground],
    [batchTotalsCssVarNames.extraBatchBg, bt.extraBatchBackground],
    [batchTotalsCssVarNames.emptyCardBg, bt.emptyCardBackground],
    [batchTotalsCssVarNames.extraBatchBorder, bt.extraBatchBorder],
    [batchTotalsCssVarNames.extraBatchDashedBorder, bt.extraBatchDashedBorder],
    [batchTotalsCssVarNames.insetHighlight, bt.insetHighlight],
  ];
}

/** Light-mode batch-totals surfaces. */
export function getLightBatchTotalsCssEntries(): [string, string][] {
  return [
    [batchTotalsCssVarNames.cardHeaderBg, alphaBlack(0.06)],
    [batchTotalsCssVarNames.extraCardHeaderBg, extraBatchLight.cardHeaderBg],
    [batchTotalsCssVarNames.extraTableThBg, extraBatchLight.tableThBg],
    [batchTotalsCssVarNames.batchesCardBg, alphaBlack(0.04)],
    [batchTotalsCssVarNames.extraBatchBg, extraBatchLight.bodyBg],
    [batchTotalsCssVarNames.emptyCardBg, alphaBlack(0.02)],
    [batchTotalsCssVarNames.extraBatchBorder, extraBatchLight.border],
    [batchTotalsCssVarNames.extraBatchDashedBorder, extraBatchLight.borderDashed],
    [batchTotalsCssVarNames.insetHighlight, "inset 0 1px 0 rgba(0, 0, 0, 0.06)"],
  ];
}

/** Dark high-contrast batch-totals surfaces. */
export function getDarkHcBatchTotalsCssEntries(): [string, string][] {
  return [
    [batchTotalsCssVarNames.cardHeaderBg, alphaWhite(0.12)],
    [batchTotalsCssVarNames.extraCardHeaderBg, extraBatchDarkHc.cardHeaderBg],
    [batchTotalsCssVarNames.extraTableThBg, extraBatchDarkHc.tableThBg],
    [batchTotalsCssVarNames.batchesCardBg, alphaWhite(0.08)],
    [batchTotalsCssVarNames.extraBatchBg, extraBatchDarkHc.bodyBg],
    [batchTotalsCssVarNames.emptyCardBg, alphaWhite(0.05)],
    [batchTotalsCssVarNames.extraBatchBorder, extraBatchDarkHc.border],
    [batchTotalsCssVarNames.extraBatchDashedBorder, extraBatchDarkHc.borderDashed],
    [batchTotalsCssVarNames.insetHighlight, themeSurfaces.insetHighlight],
  ];
}

/** Light high-contrast batch-totals surfaces. */
export function getLightHcBatchTotalsCssEntries(): [string, string][] {
  return [
    [batchTotalsCssVarNames.cardHeaderBg, alphaBlack(0.08)],
    [batchTotalsCssVarNames.extraCardHeaderBg, extraBatchLightHc.cardHeaderBg],
    [batchTotalsCssVarNames.extraTableThBg, extraBatchLightHc.tableThBg],
    [batchTotalsCssVarNames.batchesCardBg, alphaBlack(0.06)],
    [batchTotalsCssVarNames.extraBatchBg, extraBatchLightHc.bodyBg],
    [batchTotalsCssVarNames.emptyCardBg, alphaBlack(0.04)],
    [batchTotalsCssVarNames.extraBatchBorder, extraBatchLightHc.border],
    [batchTotalsCssVarNames.extraBatchDashedBorder, extraBatchLightHc.borderDashed],
    [batchTotalsCssVarNames.insetHighlight, "inset 0 1px 0 rgba(0, 0, 0, 0.1)"],
  ];
}
