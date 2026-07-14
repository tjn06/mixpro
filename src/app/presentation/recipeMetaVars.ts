import { themeColorVar } from "../../theme/cssVars";

/** Runtime recipe readout colors — follow active appearance via --ui-recipe-* vars. */
export const recipeMetaVar = {
  id: themeColorVar("recipeId"),
  idMuted: themeColorVar("recipeIdMuted"),
  value: themeColorVar("recipeValue"),
  valueMuted: themeColorVar("recipeValueMuted"),
  unit: themeColorVar("recipeUnit"),
  colon: themeColorVar("recipeColon"),
} as const;
