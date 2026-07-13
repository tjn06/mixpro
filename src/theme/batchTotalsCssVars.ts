import { componentTokens } from "./components";
import { themeSurfaces } from "./surfaces";
import { alphaBlack, alphaWhite } from "./primitives";

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
    [batchTotalsCssVarNames.extraCardHeaderBg, "rgba(92, 72, 200, 0.1)"],
    [batchTotalsCssVarNames.extraTableThBg, "rgba(92, 72, 200, 0.08)"],
    [batchTotalsCssVarNames.batchesCardBg, alphaBlack(0.04)],
    [batchTotalsCssVarNames.extraBatchBg, "rgba(92, 72, 200, 0.06)"],
    [batchTotalsCssVarNames.emptyCardBg, alphaBlack(0.02)],
    [batchTotalsCssVarNames.extraBatchBorder, `1px solid rgba(92, 72, 200, 0.35)`],
    [batchTotalsCssVarNames.extraBatchDashedBorder, `1px dashed rgba(92, 72, 200, 0.35)`],
    [batchTotalsCssVarNames.insetHighlight, "inset 0 1px 0 rgba(0, 0, 0, 0.06)"],
  ];
}

/** Dark high-contrast batch-totals surfaces. */
export function getDarkHcBatchTotalsCssEntries(): [string, string][] {
  return [
    [batchTotalsCssVarNames.cardHeaderBg, alphaWhite(0.12)],
    [batchTotalsCssVarNames.extraCardHeaderBg, "rgba(184, 168, 255, 0.18)"],
    [batchTotalsCssVarNames.extraTableThBg, "rgba(184, 168, 255, 0.22)"],
    [batchTotalsCssVarNames.batchesCardBg, alphaWhite(0.08)],
    [batchTotalsCssVarNames.extraBatchBg, "rgba(184, 168, 255, 0.14)"],
    [batchTotalsCssVarNames.emptyCardBg, alphaWhite(0.05)],
    [batchTotalsCssVarNames.extraBatchBorder, `1.5px solid rgba(184, 168, 255, 0.45)`],
    [batchTotalsCssVarNames.extraBatchDashedBorder, `1.5px dashed rgba(184, 168, 255, 0.45)`],
    [batchTotalsCssVarNames.insetHighlight, themeSurfaces.insetHighlight],
  ];
}

/** Light high-contrast batch-totals surfaces. */
export function getLightHcBatchTotalsCssEntries(): [string, string][] {
  return [
    [batchTotalsCssVarNames.cardHeaderBg, alphaBlack(0.08)],
    [batchTotalsCssVarNames.extraCardHeaderBg, "rgba(56, 40, 160, 0.12)"],
    [batchTotalsCssVarNames.extraTableThBg, "rgba(56, 40, 160, 0.1)"],
    [batchTotalsCssVarNames.batchesCardBg, alphaBlack(0.06)],
    [batchTotalsCssVarNames.extraBatchBg, "rgba(56, 40, 160, 0.08)"],
    [batchTotalsCssVarNames.emptyCardBg, alphaBlack(0.04)],
    [batchTotalsCssVarNames.extraBatchBorder, `1.5px solid rgba(56, 40, 160, 0.45)`],
    [batchTotalsCssVarNames.extraBatchDashedBorder, `1.5px dashed rgba(56, 40, 160, 0.4)`],
    [batchTotalsCssVarNames.insetHighlight, "inset 0 1px 0 rgba(0, 0, 0, 0.1)"],
  ];
}
