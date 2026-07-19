import {
  findFlexSelectLabel,
  formatFlexSelectLabelEntries,
  listSelectedFlexSelectEntries,
  listSelectedFlexSelectLabels,
} from "../select/catalogLookup";
import type { FlexSelectSelection } from "../select/selection";
import type { ToolItem } from "./types";

/** English slug id + Swedish display label; empty variants → simple chip. */
function tool(
  id: string,
  label: string,
  variants: readonly string[] = [],
): ToolItem {
  if (variants.length === 0) return { id, label };
  return {
    id,
    label,
    children: variants.map((variantLabel, index) => ({
      id: `${id}-${index + 1}`,
      label: variantLabel,
    })),
  };
}

/**
 * Tools catalog (Verktyg) — Swedish labels, English slug ids.
 * - No `children` → simple chip
 * - With `children` → variant select
 */
export const TOOLS_CATALOG: ToolItem[] = [
  tool("floor-grinder", "Golvslip", [
    "HTC T6",
    "HTC T5",
    "HTC RX6",
    "HTC RX8",
    "HTC RX950",
  ]),
  tool("blast-machine", "Blästringsmaskin"),
  tool("jackhammer", "Bilningsmaskin"),
  tool("groove-cutter", "Spårfräs"),
  tool("power-trowel", "Golvglättare"),
  tool("dust-separator", "Stoftavskiljare"),
  tool("industrial-vacuum", "Industridammsugare"),
  tool("scale", "Våg"),
  tool("hand-diamond", "Handdiamant"),
  tool("pry-bar", "Bilspett"),
  tool("baseboard-iron", "Sockeljärn"),
  tool("pear-ladle", "Päronslev"),
  tool("spatula-sword", "Svärd"),
  tool("notched-trowel", "Tandspackel"),
  tool("mixing-whisk", "Blandarvisp"),
  tool("mixing-tub", "Blandningsbalja"),
  tool("vacuum-nozzle", "Dammsugarmunstycke"),
  tool("extension-cable", "Förlängningskabel", [
    "230 V",
    "16 A CEE",
    "32 A CEE",
  ]),
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
