import { alphaBlack, alphaWhite } from "./primitives";

/** Warm-stone / raised-gray secondary zone for optional extra batch — no chromatic accent. */
export const extraBatchDark = {
  cardHeaderBg: alphaWhite(0.12),
  tableThBg: alphaWhite(0.1),
  bodyBg: alphaWhite(0.08),
  border: "1px solid rgba(255, 255, 255, 0.22)",
  borderDashed: "1px dashed rgba(255, 255, 255, 0.22)",
} as const;

export const extraBatchLight = {
  cardHeaderBg: "rgba(140, 128, 120, 0.14)",
  tableThBg: "rgba(140, 128, 120, 0.1)",
  bodyBg: "rgba(140, 128, 120, 0.07)",
  border: "1px solid rgba(100, 92, 88, 0.32)",
  borderDashed: "1px dashed rgba(100, 92, 88, 0.32)",
} as const;

export const extraBatchDarkHc = {
  cardHeaderBg: alphaWhite(0.16),
  tableThBg: alphaWhite(0.13),
  bodyBg: alphaWhite(0.11),
  border: "1.5px solid rgba(255, 255, 255, 0.32)",
  borderDashed: "1.5px dashed rgba(255, 255, 255, 0.32)",
} as const;

export const extraBatchLightHc = {
  cardHeaderBg: "rgba(80, 72, 68, 0.14)",
  tableThBg: "rgba(80, 72, 68, 0.11)",
  bodyBg: "rgba(80, 72, 68, 0.08)",
  border: "1.5px solid rgba(60, 56, 52, 0.42)",
  borderDashed: "1.5px dashed rgba(60, 56, 52, 0.38)",
} as const;
