/** Raw palette + alpha helpers — not used directly in components. */

export const primitiveInk = {
  950: "#030308",
  900: "#07070f",
  850: "#0a0a14",
  800: "#0c0c18",
  750: "#0d0d1c",
  700: "#12122a",
  650: "#141428",
  600: "#18182c",
  550: "#1c1c34",
  500: "#222240",
  450: "#252548",
  400: "#3a1824",
} as const;

/** Light-mode surface scale — cool paper tones. */
export const primitivePaper = {
  950: "#fafafc",
  900: "#f4f4f8",
  850: "#ececf4",
  800: "#e4e4ee",
  750: "#dcdce8",
  700: "#d4d4e0",
  650: "#cccedc",
  600: "#c4c6d4",
  550: "#b8bac8",
  500: "#a8aab8",
  450: "#9898a8",
  400: "#f4e8ec",
} as const;

export const primitiveText = {
  100: "#ffffff",
  90: "#e8e8f4",
  80: "#e0e0f0",
  70: "#c4c4dc",
  60: "#b8b8d4",
  50: "#a0a0c0",
  40: "#9898b4",
  30: "#8888a8",
  20: "#7a7a98",
  10: "#5a5a72",
} as const;

/** Dark ink text for light surfaces. */
export const primitiveInkText = {
  100: "#ffffff",
  90: "#1a1a28",
  80: "#242436",
  70: "#303044",
  60: "#3c3c52",
  50: "#505064",
  40: "#646478",
  30: "#78788c",
  20: "#9494a4",
  10: "#b4b4c0",
} as const;

export const primitiveSemantic = {
  warn: "#d4b070",
  error: "#d86474",
  errorMuted: "#9a5060",
  accent: "#9b8cff",
  /** Session Mode chrome — header bar + nav active rail (shared). */
  session: "#2dd4bf",
} as const;

export const primitiveSemanticLight = {
  warn: "#9a7028",
  error: "#b83848",
  errorMuted: "#8a4858",
  accent: "#5c48c8",
  session: "#0f766e",
} as const;

/** White overlay on dark surfaces — outdoor-readable alphas start ~16%. */
export function alphaWhite(opacity: number): string {
  return `rgba(255,255,255,${opacity})`;
}

/** Black overlay on light surfaces. */
export function alphaBlack(opacity: number): string {
  return `rgba(0,0,0,${opacity})`;
}

export function borderSolid(opacity: number, width = "1px"): string {
  return `${width} solid ${alphaWhite(opacity)}`;
}

export function borderSolidBlack(opacity: number, width = "1px"): string {
  return `${width} solid ${alphaBlack(opacity)}`;
}
