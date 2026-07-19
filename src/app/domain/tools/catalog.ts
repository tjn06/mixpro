import {
  findFlexSelectLabel,
  formatFlexSelectLabelEntries,
  listSelectedFlexSelectEntries,
  listSelectedFlexSelectLabels,
} from "../select/catalogLookup";
import type { FlexSelectSelection } from "../select/selection";
import type { ToolItem } from "./types";

/**
 * Tools catalog for session Tools stage + standalone Tools screen.
 * - No `children` → simple chip
 * - With `children` → variant select (closed chip shows family label;
 *   options are variants like "Mixer 245", sized to the widest option)
 *
 * Variant number scales for layout testing: 1–10, 100–999, 1000–9999.
 */
export const TOOLS_CATALOG: ToolItem[] = [
  {
    id: "mixer",
    label: "Mixer",
    children: [
      { id: "mixer-3", label: "Mixer 3" },
      { id: "mixer-7", label: "Mixer 7" },
      { id: "mixer-245", label: "Mixer 245" },
      { id: "mixer-1842", label: "Mixer 1842" },
    ],
  },
  { id: "roller", label: "Roller" },
  {
    id: "brush",
    label: "Brush",
    children: [
      { id: "brush-2", label: "Brush 2" },
      { id: "brush-10", label: "Brush 10" },
      { id: "brush-501", label: "Brush 501" },
      { id: "brush-9001", label: "Brush 9001" },
    ],
  },
  {
    id: "squeegee",
    label: "Squeegee",
    children: [
      { id: "squeegee-1", label: "Squeegee 1" },
      { id: "squeegee-9", label: "Squeegee 9" },
      { id: "squeegee-412", label: "Squeegee 412" },
    ],
  },
  { id: "spike-roller", label: "Spike roller" },
  { id: "trowel", label: "Trowel" },
  {
    id: "gloves",
    label: "Gloves",
    children: [
      { id: "gloves-4", label: "Gloves 4" },
      { id: "gloves-88", label: "Gloves 88" },
      { id: "gloves-760", label: "Gloves 760" },
      { id: "gloves-3200", label: "Gloves 3200" },
    ],
  },
  {
    id: "ppe",
    label: "PPE",
    children: [
      { id: "ppe-5", label: "PPE 5" },
      { id: "ppe-333", label: "PPE 333" },
      { id: "ppe-5555", label: "PPE 5555" },
    ],
  },
  { id: "heat-gun", label: "Heat gun" },
  { id: "scale", label: "Scale" },
  { id: "bucket", label: "Bucket" },
  {
    id: "tape",
    label: "Tape",
    children: [
      { id: "tape-6", label: "Tape 6" },
      { id: "tape-150", label: "Tape 150" },
      { id: "tape-8888", label: "Tape 8888" },
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
