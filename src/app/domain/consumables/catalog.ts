import type { ConsumableItem } from "./types";

/**
 * Consumables catalog — same flex-select shape as tools
 * (simple chips + variant selects + custom simple items).
 *
 * Variant number scales for layout testing: 1–10, 100–999, 1000–9999.
 */
export const CONSUMABLES_CATALOG: ConsumableItem[] = [
  {
    id: "solvent",
    label: "Solvent",
    children: [
      { id: "solvent-2", label: "Solvent 2" },
      { id: "solvent-8", label: "Solvent 8" },
      { id: "solvent-350", label: "Solvent 350" },
      { id: "solvent-1200", label: "Solvent 1200" },
    ],
  },
  {
    id: "cups",
    label: "Cups",
    children: [
      { id: "cups-1", label: "Cups 1" },
      { id: "cups-10", label: "Cups 10" },
      { id: "cups-250", label: "Cups 250" },
      { id: "cups-4500", label: "Cups 4500" },
    ],
  },
  { id: "stir-sticks", label: "Stir sticks" },
  {
    id: "roller-covers",
    label: "Covers",
    children: [
      { id: "covers-3", label: "Covers 3" },
      { id: "covers-99", label: "Covers 99" },
      { id: "covers-640", label: "Covers 640" },
      { id: "covers-7100", label: "Covers 7100" },
    ],
  },
  { id: "brush-dispos", label: "Disposable brushes" },
  { id: "rags", label: "Rags" },
  { id: "wipes", label: "Wipes" },
  {
    id: "tape-cons",
    label: "Tape",
    children: [
      { id: "tape-cons-5", label: "Tape 5" },
      { id: "tape-cons-180", label: "Tape 180" },
      { id: "tape-cons-9999", label: "Tape 9999" },
    ],
  },
  { id: "drop-cloth", label: "Drop cloth" },
  { id: "plastic-sheet", label: "Plastic sheeting" },
  {
    id: "gloves-dispos",
    label: "Gloves",
    children: [
      { id: "gloves-dispos-4", label: "Gloves 4" },
      { id: "gloves-dispos-220", label: "Gloves 220" },
      { id: "gloves-dispos-3000", label: "Gloves 3000" },
    ],
  },
  { id: "sandpaper", label: "Sandpaper" },
  { id: "filler", label: "Filler" },
  { id: "cleaner", label: "Surface cleaner" },
  { id: "trash-bags", label: "Trash bags" },
];
