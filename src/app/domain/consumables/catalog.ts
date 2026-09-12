import {
  localizedLabel,
  sameLabel,
  type LocalizedLabel,
} from "../../i18n/localizedLabel";
import type { ConsumableItem } from "./types";

type Variant = string | LocalizedLabel;

/** English slug id + bilingual display label; empty variants → simple chip. */
function consumable(
  id: string,
  label: LocalizedLabel,
  variants: readonly Variant[] = [],
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
      label:
        typeof variantLabel === "string"
          ? sameLabel(variantLabel)
          : variantLabel,
    })),
  };
}

/**
 * Consumables catalog — bilingual admin labels, English slug ids.
 * - No `children` → simple chip
 * - With `children` → variant select
 * - `requiresWear` → wear picker after variant pick
 */
export const CONSUMABLES_CATALOG: ConsumableItem[] = [
  consumable("brush", localizedLabel("Brush", "Pensel")),
  consumable("roller", localizedLabel("Roller", "Roller")),
  consumable("roller-frame", localizedLabel("Roller frame", "Rollerbygel")),
  consumable("spike-roller", localizedLabel("Spike roller", "Piggroller")),
  consumable("broom", localizedLabel("Broom", "Kvast")),
  consumable("mop", localizedLabel("Mop", "Mopp")),
  consumable(
    "diamond-segment",
    localizedLabel("Diamond segment", "Diamantsegment"),
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
    localizedLabel("Grinding cup", "Slipskål"),
    [
      localizedLabel("Universal", "Universal"),
      localizedLabel("Turbo", "Turbo"),
      localizedLabel("Fine surface", "Fin slipyta"),
      localizedLabel("Abrasive", "Abrasiv"),
      localizedLabel("Epoxy", "Epoxi"),
      localizedLabel("Coating removal", "Beläggningsborttagning"),
    ],
    { requiresWear: true },
  ),
  consumable(
    "polish-disc",
    localizedLabel("Polish disc", "Polerskiva"),
    ["Grit 50", "Grit 100", "Grit 200", "Grit 400", "Grit 800"],
    { requiresWear: true },
  ),
  consumable(
    "polish-pad",
    localizedLabel("Polish pad", "Polerpad"),
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
  consumable("bucket", localizedLabel("Bucket", "Hink")),
  consumable("tape", localizedLabel("Tape", "Tejp")),
  consumable("plastic", localizedLabel("Plastic", "Plast")),
  consumable("stop-strips", localizedLabel("Stop strips", "Stopplister")),
  consumable("joint-compound", localizedLabel("Joint compound", "Fogmassa")),
  consumable(
    "barrier-tape",
    localizedLabel("Barrier tape", "Avspärrningsband"),
  ),
  consumable("marker-tags", localizedLabel("Marker tags", "Markeringslappar")),
  consumable("trash-bags", localizedLabel("Trash bags", "Sopsäckar")),
  consumable("gloves", localizedLabel("Gloves", "Handskar"), [
    localizedLabel("Disposable gloves", "Engångshandskar"),
    localizedLabel("Work gloves", "Arbetshandskar"),
  ]),
  consumable("hammer-drill", localizedLabel("Hammer drill", "Slagborr")),
];
