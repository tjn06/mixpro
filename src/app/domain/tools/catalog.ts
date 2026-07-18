import {
  findFlexSelectLabel,
  formatFlexSelectLabelEntries,
  listSelectedFlexSelectEntries,
  listSelectedFlexSelectLabels,
} from "../select/catalogLookup";
import type { FlexSelectSelection } from "../select/selection";
import type { ToolItem } from "./types";

/**
 * Placeholder tools catalog for session Tools stage + standalone Tools screen.
 * Items with `children` open an overlay dropdown (label + chosen option on the chip).
 */
export const TOOLS_CATALOG: ToolItem[] = [
  {
    id: "mixer",
    label: "Mixer",
    children: [
      { id: "mixer-drill", label: "Drill mixer" },
      { id: "mixer-hand", label: "Hand mixer" },
      { id: "mixer-paddle", label: "Spiral paddle" },
    ],
  },
  { id: "roller", label: "Roller" },
  {
    id: "brush",
    label: "Brush",
    children: [
      { id: "brush-chip", label: "Chip brush" },
      { id: "brush-foam", label: "Foam brush" },
      { id: "brush-bristle", label: "Bristle brush" },
    ],
  },
  {
    id: "squeegee",
    label: "Squeegee",
    children: [
      { id: "squeegee-notch", label: "Notched" },
      { id: "squeegee-flat", label: "Flat" },
    ],
  },
  { id: "spike-roller", label: "Spike roller" },
  { id: "trowel", label: "Trowel" },
  {
    id: "gloves",
    label: "Gloves",
    children: [
      { id: "gloves-nitrile", label: "Nitrile" },
      { id: "gloves-latex", label: "Latex" },
      { id: "gloves-chemical", label: "Chemical" },
    ],
  },
  {
    id: "ppe",
    label: "PPE",
    children: [
      { id: "ppe-mask", label: "Respirator" },
      { id: "ppe-goggles", label: "Goggles" },
      { id: "ppe-suit", label: "Coverall" },
    ],
  },
  { id: "heat-gun", label: "Heat gun" },
  { id: "scale", label: "Scale" },
  { id: "bucket", label: "Bucket" },
  {
    id: "tape",
    label: "Tape",
    children: [
      { id: "tape-masking", label: "Masking" },
      { id: "tape-duct", label: "Duct" },
      { id: "tape-painters", label: "Painter’s" },
    ],
  },
  { id: "scissors", label: "Scissors" },
  { id: "utility-knife", label: "Utility knife" },
];

export function findToolLabel(
  id: string,
  catalog: readonly ToolItem[] = TOOLS_CATALOG,
): string | null {
  return findFlexSelectLabel(id, catalog);
}

export function listSelectedToolLabels(
  selectedIds: readonly string[],
  catalog: readonly ToolItem[] = TOOLS_CATALOG,
  customTools: readonly ToolItem[] = [],
): string[] {
  return listSelectedFlexSelectLabels(selectedIds, catalog, customTools);
}

export function listSelectedToolLabelEntries(
  selection: FlexSelectSelection,
  catalog: readonly ToolItem[] = TOOLS_CATALOG,
  customTools: readonly ToolItem[] = [],
): string[] {
  return formatFlexSelectLabelEntries(
    listSelectedFlexSelectEntries(selection, catalog, customTools),
  );
}
