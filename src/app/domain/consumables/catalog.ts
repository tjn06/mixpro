import type { ConsumableItem } from "./types";

/** English slug id + Swedish display label; empty variants → simple chip. */
function consumable(
  id: string,
  label: string,
  variants: readonly string[] = [],
  options?: { requiresWear?: boolean },
): ConsumableItem {
  const requiresWear = options?.requiresWear;
  if (variants.length === 0) {
    return requiresWear ? { id, label, requiresWear } : { id, label };
  }
  return {
    id,
    label,
    requiresWear,
    children: variants.map((variantLabel, index) => ({
      id: `${id}-${index + 1}`,
      label: variantLabel,
    })),
  };
}

/**
 * Consumables catalog (Förbrukning) — Swedish labels, English slug ids.
 * - No `children` → simple chip
 * - With `children` → variant select
 * - `requiresWear` → slitage picker (Låg / Medel / Hög) after variant pick
 */
export const CONSUMABLES_CATALOG: ConsumableItem[] = [
  consumable("brush", "Pensel"),
  consumable("roller", "Roller"),
  consumable("roller-frame", "Rollerbygel"),
  consumable("spike-roller", "Piggroller"),
  consumable("broom", "Kvast"),
  consumable("mop", "Mopp"),
  consumable(
    "diamond-segment",
    "Diamantsegment",
    [
      "EZ S / 16 grit (H1)",
      "EZ M / 25 grit (H2)",
      "EZ H / 30 grit (H3)",
      "EZ X / 50 grit (H4)",
      "EZ XS / 100 grit (H5)",
    ],
    { requiresWear: true },
  ),
  consumable(
    "grinding-cup",
    "Slipskål",
    [
      "Universal",
      "Turbo",
      "Fin slipyta",
      "Abrasiv",
      "Epoxi",
      "Beläggningsborttagning",
    ],
    { requiresWear: true },
  ),
  consumable(
    "polish-disc",
    "Polerskiva",
    ["Grit 50", "Grit 100", "Grit 200", "Grit 400", "Grit 800"],
    { requiresWear: true },
  ),
  consumable(
    "polish-pad",
    "Polerpad",
    [
      "30 grit",
      "50 grit",
      "100 grit",
      "200 grit",
      "400 grit",
      "800 grit",
      "1500 grit",
      "3000 grit",
    ],
    { requiresWear: true },
  ),
  consumable("bucket", "Hink"),
  consumable("tape", "Tejp"),
  consumable("plastic", "Plast"),
  consumable("stop-strips", "Stopplister"),
  consumable("joint-compound", "Fogmassa"),
  consumable("barrier-tape", "Avspärrningsband"),
  consumable("marker-tags", "Markeringslappar"),
  consumable("trash-bags", "Sopsäckar"),
  consumable("gloves", "Handskar", ["Engångshandskar", "Arbetshandskar"]),
  consumable("hammer-drill", "Slagborr"),
];
