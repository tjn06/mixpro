import {
  localizedLabel,
  sameLabel,
  type LocalizedLabel,
} from "../../i18n/localizedLabel";
import {
  findFlexSelectLabel,
  formatFlexSelectLabelEntries,
  listSelectedFlexSelectEntries,
  listSelectedFlexSelectLabels,
  type FlexSelectLabelEntry,
} from "../select/catalogLookup";
import type { AppLanguage } from "../../i18n/language";
import type { FlexSelectSelection } from "../select/selection";
import type { ToolItem } from "./types";

type Variant = string | LocalizedLabel;

/** English slug id + bilingual display label; empty variants → simple chip. */
function tool(
  id: string,
  label: LocalizedLabel,
  variants: readonly Variant[] = [],
): ToolItem {
  if (variants.length === 0) return { id, label };
  return {
    id,
    label,
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
 * Tools catalog — bilingual admin labels, English slug ids.
 * - No `children` → simple chip
 * - With `children` → variant select
 */
export const TOOLS_CATALOG: ToolItem[] = [
  tool("floor-grinder", localizedLabel("Floor grinder", "Golvslip"), [
    "HTC T6",
    "HTC T5",
    "HTC RX6",
    "HTC RX8",
    "HTC RX950",
  ]),
  tool("blast-machine", localizedLabel("Blast machine", "Blästringsmaskin")),
  tool("jackhammer", localizedLabel("Jackhammer", "Bilningsmaskin")),
  tool("groove-cutter", localizedLabel("Groove cutter", "Spårfräs")),
  tool("power-trowel", localizedLabel("Power trowel", "Golvglättare")),
  tool("dust-separator", localizedLabel("Dust separator", "Stoftavskiljare")),
  tool(
    "industrial-vacuum",
    localizedLabel("Industrial vacuum", "Industridammsugare"),
  ),
  tool("scale", localizedLabel("Scale", "Våg")),
  tool("hand-diamond", localizedLabel("Hand diamond", "Handdiamant")),
  tool("pry-bar", localizedLabel("Pry bar", "Bilspett")),
  tool("baseboard-iron", localizedLabel("Baseboard iron", "Sockeljärn")),
  tool("pear-ladle", localizedLabel("Pear ladle", "Päronslev")),
  tool("spatula-sword", localizedLabel("Spatula sword", "Svärd")),
  tool("notched-trowel", localizedLabel("Notched trowel", "Tandspackel")),
  tool("mixing-whisk", localizedLabel("Mixing whisk", "Blandarvisp")),
  tool("mixing-tub", localizedLabel("Mixing tub", "Blandningsbalja")),
  tool("vacuum-nozzle", localizedLabel("Vacuum nozzle", "Dammsugarmunstycke")),
  tool("extension-cable", localizedLabel("Extension cable", "Förlängningskabel"), [
    "230 V",
    "16 A CEE",
    "32 A CEE",
  ]),
];

export function findToolLabel(
  id: string,
  catalog: readonly ToolItem[] = TOOLS_CATALOG,
  language?: AppLanguage,
): string | null {
  return findFlexSelectLabel(id, catalog, language);
}

export function listSelectedToolLabels(
  selectedIds: readonly string[],
  catalog: readonly ToolItem[] = TOOLS_CATALOG,
  customTools: readonly ToolItem[] = [],
  language?: AppLanguage,
): string[] {
  return listSelectedFlexSelectLabels(
    selectedIds,
    catalog,
    customTools,
    language,
  );
}

export function listSelectedToolLabelEntries(
  selection: FlexSelectSelection,
  catalog: readonly ToolItem[] = TOOLS_CATALOG,
  customTools: readonly ToolItem[] = [],
  language?: AppLanguage,
): string[] {
  return formatFlexSelectLabelEntries(
    listSelectedFlexSelectEntries(selection, catalog, customTools, language),
  );
}

/** Structured tool lines (owned + rented) for UI chips. */
export function listSelectedToolEntries(
  selection: FlexSelectSelection,
  catalog: readonly ToolItem[] = TOOLS_CATALOG,
  customTools: readonly ToolItem[] = [],
  language?: AppLanguage,
): FlexSelectLabelEntry[] {
  return listSelectedFlexSelectEntries(
    selection,
    catalog,
    customTools,
    language,
  );
}
