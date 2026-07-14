import { alphaWhite } from "./primitives";
import { semanticBorders } from "./semantic";
import { extraBatchDark } from "./extraBatchTheme";

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
  extraBatch: extraBatchDark.border,
  extraBatchDashed: extraBatchDark.borderDashed,
  swipeColumn: `1px solid ${alphaWhite(0.08)}`,
  headerBtn: semanticBorders.headerButton,
  headerBtnActive: semanticBorders.headerButtonActive,
  cardHeaderBtn: semanticBorders.headerButton,
  search: semanticBorders.search,
  sheetBtn: semanticBorders.sheetButton,
  sharePanelActive: semanticBorders.strong,
  sharePanelIdle: semanticBorders.default,
} as const;
