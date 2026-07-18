import { useEffect, useMemo, useState } from "react";
import {
  formatFlexSelectLabelEntries,
  listSelectedFlexSelectEntries,
} from "../../domain/select/catalogLookup";
import {
  ensureFlexSelectSelected,
  flexSelectSelectionTotal,
  type FlexSelectSelection,
} from "../../domain/select/selection";
import type { FlexSelectItem } from "../../domain/select/types";
import { useSettingsStore } from "../../settings/store";
import { CatalogFlexPicker } from "../select/CatalogFlexPicker";
import { DestinationPageChrome } from "../pages/DestinationPageChrome";
import { InventoryStageSummaryBar } from "../shell/InventoryStageSummaryBar";
import { StageBottomSheet } from "../shell/StageBottomSheet";
import { CatalogEditPanel } from "./CatalogEditPanel";
import { CatalogSharePanel } from "./CatalogSharePanel";

export type CatalogHubTab = "report" | "edit";

const TABS: { id: CatalogHubTab; label: string }[] = [
  { id: "report", label: "Report" },
  { id: "edit", label: "Edit" },
];

/**
 * Top-level Tools / Consumables workspace:
 * Report (picker + session-stage bottom sheet) · Edit (global catalog CRUD).
 */
export function CatalogHub({
  title,
  catalog,
  customItems,
  selection,
  onSelectionChange,
  onAddCustomItem,
  onAddGlobalItem,
  onRenameGlobalItem,
  onRemoveGlobalItem,
  onMenuClick,
  embedded = false,
  reportTitle,
  searchPlaceholder,
  customPlaceholder,
  inventoryNounSingular,
  inventoryNounPlural,
}: {
  title: string;
  catalog: readonly FlexSelectItem[];
  customItems?: readonly FlexSelectItem[];
  selection: FlexSelectSelection;
  onSelectionChange: (next: Record<string, number>) => void;
  /** Session-style custom add on Report tab (optional). */
  onAddCustomItem?: (item: FlexSelectItem) => void;
  onAddGlobalItem: (label: string) => void;
  onRenameGlobalItem: (id: string, label: string) => void;
  onRemoveGlobalItem: (id: string) => void;
  onMenuClick: () => void;
  embedded?: boolean;
  reportTitle: string;
  searchPlaceholder: string;
  customPlaceholder: string;
  inventoryNounSingular: string;
  inventoryNounPlural: string;
}) {
  const [tab, setTab] = useState<CatalogHubTab>("report");
  const [panelExpanded, setPanelExpanded] = useState(false);
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const selectedEntries = useMemo(
    () =>
      listSelectedFlexSelectEntries(selection, catalog, customItems ?? []),
    [selection, catalog, customItems],
  );
  const selectedLabels = useMemo(
    () => formatFlexSelectLabelEntries(selectedEntries),
    [selectedEntries],
  );
  const selectedTotal = flexSelectSelectionTotal(selection);

  useEffect(() => {
    if (tab !== "report") setPanelExpanded(false);
  }, [tab]);

  const expandedBody = (
    <div className="batch-totals-entity-total-table min-w-0 w-full" aria-readonly>
      <header className="batch-totals-entity-summary__intro">
        <h2 className="batch-totals-entity-summary__title">{title}</h2>
        <p className="batch-totals-entity-summary__subtitle">
          {selectedLabels.length > 0
            ? `${title} selected for this list.`
            : `No ${inventoryNounPlural} selected yet.`}
        </p>
        {selectedLabels.length > 0 ? (
          <div
            className="batch-totals-entity-summary__chips"
            aria-label={`Selected ${inventoryNounPlural}`}
          >
            {selectedLabels.map((label) => (
              <span key={label} className="batch-totals-entity-summary__chip">
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </header>
    </div>
  );

  const subnav = (
    <div
      className="catalog-hub__tabs"
      role="tablist"
      aria-label={`${title} sections`}
    >
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={tab === item.id}
          className="catalog-hub__tab"
          data-active={tab === item.id ? "" : undefined}
          onClick={() => setTab(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <DestinationPageChrome
      title={title}
      onMenuClick={onMenuClick}
      embedded={embedded}
      subnav={subnav}
      bottomSheet={
        tab === "report" ? (
          <StageBottomSheet
            panelId="catalog-bottom-panel"
            regionLabel={`${title} summary`}
            expandedBodyLabel={`${title} selection`}
            sourceExpanded={panelExpanded}
            onSourceExpandedChange={setPanelExpanded}
            remeasureKey={`${selectedTotal}:${selectedLabels.join("|")}`}
            summary={
              <InventoryStageSummaryBar
                label={title}
                count={selectedTotal}
                nounSingular={inventoryNounSingular}
                nounPlural={inventoryNounPlural}
                colorScheme={colorScheme}
              />
            }
            shareActions={
              <CatalogSharePanel
                title={reportTitle}
                selectedLabels={selectedLabels}
              />
            }
            expandedBody={expandedBody}
          />
        ) : undefined
      }
    >
      {tab === "report" ? (
        <div className="catalog-hub__select">
          <CatalogFlexPicker
            catalog={catalog}
            customItems={customItems}
            selection={selection}
            onSelectionChange={onSelectionChange}
            onAddCustomItem={
              onAddCustomItem
                ? (item) => {
                    onAddCustomItem(item);
                    onSelectionChange(
                      ensureFlexSelectSelected(selection, item.id),
                    );
                  }
                : undefined
            }
            className="tools-page__picker"
            ariaLabel={title}
            addSimpleLabel="Custom"
            addSimplePlaceholder={customPlaceholder}
          />
        </div>
      ) : null}

      {tab === "edit" ? (
        <CatalogEditPanel
          items={catalog}
          onAdd={onAddGlobalItem}
          onRename={onRenameGlobalItem}
          onRemove={onRemoveGlobalItem}
          searchPlaceholder={searchPlaceholder}
        />
      ) : null}
    </DestinationPageChrome>
  );
}
