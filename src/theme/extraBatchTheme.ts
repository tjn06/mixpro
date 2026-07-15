import { alphaBlack, alphaWhite } from "./primitives";

/** Warm-stone / raised-gray secondary zone for optional extra batch — no chromatic accent. */
export const extraBatchDark = {
  cardHeaderBg: alphaWhite(0.055),
  tableThBg: alphaWhite(0.04),
  bodyBg: alphaWhite(0.08),
  border: "1px solid rgba(255, 255, 255, 0.22)",
  borderDashed: "1px dashed rgba(255, 255, 255, 0.22)",
} as const;

export const extraBatchLight = {
  cardHeaderBg: "rgba(140, 128, 120, 0.07)",
  tableThBg: "rgba(140, 128, 120, 0.05)",
  bodyBg: "rgba(140, 128, 120, 0.07)",
  border: "1px solid rgba(100, 92, 88, 0.32)",
  borderDashed: "1px dashed rgba(100, 92, 88, 0.32)",
} as const;

export const extraBatchDarkHc = {
  cardHeaderBg: alphaWhite(0.09),
  tableThBg: alphaWhite(0.07),
  bodyBg: alphaWhite(0.11),
  border: "1.5px solid rgba(255, 255, 255, 0.32)",
  borderDashed: "1.5px dashed rgba(255, 255, 255, 0.32)",
} as const;

export const extraBatchLightHc = {
  cardHeaderBg: "rgba(80, 72, 68, 0.08)",
  tableThBg: "rgba(80, 72, 68, 0.06)",
  bodyBg: "rgba(80, 72, 68, 0.08)",
  border: "1.5px solid rgba(60, 56, 52, 0.42)",
  borderDashed: "1.5px dashed rgba(60, 56, 52, 0.38)",
} as const;
