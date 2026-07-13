import { alphaWhite } from "./primitives";
import { semanticBorders } from "./semantic";

/** Border strings — alias semantic tokens for backward compatibility. */
export const themeBorders = {
  table: semanticBorders.subtle,
  batchesCard: semanticBorders.default,
  panel: semanticBorders.panel,
  panelPrimary: semanticBorders.strong,
  recipeRatio: semanticBorders.default,
  header: semanticBorders.subtle,
  headerSub: semanticBorders.subtle,
  dropdownMenu: semanticBorders.default,
  divider: semanticBorders.divider,
  input: semanticBorders.input,
  inputSubtle: semanticBorders.subtle,
  inputActive: semanticBorders.inputActive,
  extraBatch: `1px solid rgba(155, 140, 255, 0.32)`,
  extraBatchDashed: `1px dashed rgba(155, 140, 255, 0.32)`,
  swipeColumn: `1px solid ${alphaWhite(0.08)}`,
  headerBtn: semanticBorders.headerButton,
  headerBtnActive: semanticBorders.headerButtonActive,
  cardHeaderBtn: semanticBorders.headerButton,
  search: semanticBorders.search,
  sheetBtn: semanticBorders.sheetButton,
  sharePanelActive: semanticBorders.strong,
  sharePanelIdle: semanticBorders.default,
} as const;
