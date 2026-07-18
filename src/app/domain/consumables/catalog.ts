import type { ConsumableItem } from "./types";

/**
 * Placeholder consumables catalog — same flex-select shape as tools
 * (simple chips + dropdown groups + custom simple items).
 */
export const CONSUMABLES_CATALOG: ConsumableItem[] = [
  {
    id: "solvent",
    label: "Solvent",
    children: [
      { id: "solvent-acetone", label: "Acetone" },
      { id: "solvent-ipa", label: "IPA" },
      { id: "solvent-xylene", label: "Xylene" },
    ],
  },
  {
    id: "cups",
    label: "Mixing cups",
    children: [
      { id: "cups-small", label: "Small" },
      { id: "cups-medium", label: "Medium" },
      { id: "cups-large", label: "Large" },
    ],
  },
  { id: "stir-sticks", label: "Stir sticks" },
  {
    id: "roller-covers",
    label: "Roller covers",
    children: [
      { id: "roller-nap-short", label: "Short nap" },
      { id: "roller-nap-med", label: "Medium nap" },
      { id: "roller-foam", label: "Foam" },
    ],
  },
  { id: "brush-dispos", label: "Disposable brushes" },
  { id: "rags", label: "Rags" },
  { id: "wipes", label: "Wipes" },
  {
    id: "tape-cons",
    label: "Tape",
    children: [
      { id: "tape-masking", label: "Masking" },
      { id: "tape-duct", label: "Duct" },
      { id: "tape-painters", label: "Painter’s" },
    ],
  },
  { id: "drop-cloth", label: "Drop cloth" },
  { id: "plastic-sheet", label: "Plastic sheeting" },
  {
    id: "gloves-dispos",
    label: "Disposable gloves",
    children: [
      { id: "gloves-nitrile-box", label: "Nitrile box" },
      { id: "gloves-latex-box", label: "Latex box" },
    ],
  },
  { id: "sandpaper", label: "Sandpaper" },
  { id: "filler", label: "Filler" },
  { id: "cleaner", label: "Surface cleaner" },
  { id: "trash-bags", label: "Trash bags" },
];
