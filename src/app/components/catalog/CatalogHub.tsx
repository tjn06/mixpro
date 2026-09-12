import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  selectionLineKey,
  type ItemAcquisition,
} from "../../domain/select/acquisition";
import { listSelectedFlexSelectEntries, formatFlexSelectLabelEntries } from "../../domain/select/catalogLookup";
import {
  ensureFlexSelectSelected,
  flexSelectSelectionTotal,
  type FlexSelectSelection,
} from "../../domain/select/selection";
import type { FlexSelectItem } from "../../domain/select/types";
import {
  wearLabelSuffix,
  type WearByOptionId,
  type WearLevel,
} from "../../domain/select/wear";
import { SESSION_REPORT_LANGUAGE } from "../../domain/sessions/report";
import { localWorkDateId } from "../../domain/sessions/workDate";
import type { ItemLabel, LocalizedLabel } from "../../i18n/localizedLabel";
import { useSettingsStore } from "../../settings/store";
import { CatalogFlexPicker } from "../select/CatalogFlexPicker";
import { CatalogReportDateBar } from "./CatalogReportDateBar";
import { DestinationPageChrome } from "../pages/DestinationPageChrome";
import { InventoryStageSummaryBar } from "../shell/InventoryStageSummaryBar";
import { StageBottomSheet } from "../shell/StageBottomSheet";
import { CatalogEditPanel } from "./CatalogEditPanel";
import { CatalogSharePanel } from "./CatalogSharePanel";

export type CatalogHubTab = "report" | "edit";

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
  wearByOptionId,
  onWearChange,
  onAddCustomItem,
  onRemoveCustomItem,
  onAddGlobalItemBilingual,
  onRenameGlobalItem,
  onRemoveGlobalItem,
  onMenuClick,
  embedded = false,
  reportTitle,
  searchPlaceholder,
  customPlaceholder,
  inventoryNounSingular,
  inventoryNounPlural,
  acquisitionEnabled = false,
  commentsByLineKey,
  onRentalCommentChange,
}: {
  title: string;
  catalog: readonly FlexSelectItem[];
  customItems?: readonly FlexSelectItem[];
  selection: FlexSelectSelection;
  onSelectionChange: (next: Record<string, number>) => void;
  wearByOptionId?: WearByOptionId;
  onWearChange?: (next: Record<string, WearLevel>) => void;
  /** Session-style custom add on Report tab (optional). */
  onAddCustomItem?: (
    item: FlexSelectItem,
    acquisition: ItemAcquisition,
  ) => void;
  onRemoveCustomItem?: (id: string) => void;
  onAddGlobalItemBilingual: (label: LocalizedLabel) => void;
  onRenameGlobalItem: (id: string, label: ItemLabel) => void;
  onRemoveGlobalItem: (id: string) => void;
  onMenuClick: () => void;
  embedded?: boolean;
  reportTitle: string;
  searchPlaceholder: string;
  customPlaceholder: string;
  inventoryNounSingular: string;
  inventoryNounPlural: string;
  /** Tools Report only — owned/rented arm (same as session tools). */
  acquisitionEnabled?: boolean;
  commentsByLineKey?: Readonly<Record<string, string>>;
  onRentalCommentChange?: (lineKey: string, comment: string | null) => void;
}) {
  const { t } = useTranslation("common");
  const tabs: { id: CatalogHubTab; label: string }[] = [
    { id: "report", label: t("catalog.tabReport") },
    { id: "edit", label: t("catalog.tabEdit") },
  ];
  const [tab, setTab] = useState<CatalogHubTab>("report");
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [workDateId, setWorkDateId] = useState<string | null>(() =>
    localWorkDateId(),
  );
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const selectedEntries = useMemo(
    () =>
      listSelectedFlexSelectEntries(
        selection,
        catalog,
        customItems ?? [],
        uiLanguage,
      ),
    [selection, catalog, customItems, uiLanguage],
  );
  const shareEntries = useMemo(
    () =>
      listSelectedFlexSelectEntries(
        selection,
        catalog,
        customItems ?? [],
        SESSION_REPORT_LANGUAGE,
      ),
    [selection, catalog, customItems],
  );
  const selectedLabels = useMemo(
    () =>
      selectedEntries.map((entry) => {
        const base =
          entry.qty > 1 ? `${entry.label} ×${entry.qty}` : entry.label;
        return `${base}${wearLabelSuffix(wearByOptionId?.[entry.id])}`;
      }),
    [selectedEntries, wearByOptionId],
  );
  const shareLabels = useMemo(
    () =>
      formatFlexSelectLabelEntries(
        shareEntries.map((entry) => ({
          ...entry,
          label: `${entry.label}${wearLabelSuffix(wearByOptionId?.[entry.id])}`,
        })),
      ),
    [shareEntries, wearByOptionId],
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
            ? t("catalog.selectedForList", { title })
            : t("catalog.noneSelectedYet", { noun: inventoryNounPlural })}
        </p>
        {selectedEntries.length > 0 ? (
          <div
            className="batch-totals-entity-summary__chips"
            aria-label={t("catalog.selectedAria", {
              noun: inventoryNounPlural,
            })}
          >
            {selectedEntries.map((entry) => {
              const base =
                entry.qty > 1 ? `${entry.label} ×${entry.qty}` : entry.label;
              const label = `${base}${wearLabelSuffix(wearByOptionId?.[entry.id])}`;
              return (
                <span
                  key={entry.id}
                  className="batch-totals-entity-summary__chip"
                  data-rented={entry.rented ? "" : undefined}
                >
                  {label}
                </span>
              );
            })}
          </div>
        ) : null}
      </header>
    </div>
  );

  const subnav = (
    <div className="catalog-hub__chrome">
      <div
        className="catalog-hub__tabs app-gutter-x"
        role="tablist"
        aria-label={t("catalog.sectionsAria", { title })}
      >
        {tabs.map((item) => (
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
      {tab === "report" ? (
        <CatalogReportDateBar
          workDateId={workDateId}
          onWorkDateChange={setWorkDateId}
          ariaLabel={t("catalog.reportDateAria", { title })}
          pickerSubtitle={t("catalog.reportDateSubtitle", {
            title: title.toLowerCase(),
          })}
        />
      ) : null}
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
            regionLabel={t("catalog.summaryRegion", { title })}
            expandedBodyLabel={t("catalog.selectionExpanded", { title })}
            sourceExpanded={panelExpanded}
            onSourceExpandedChange={setPanelExpanded}
            remeasureKey={`${selectedTotal}:${selectedLabels.join("|")}:${workDateId ?? ""}`}
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
                selectedLabels={shareLabels}
                workDateId={workDateId}
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
            wearByOptionId={wearByOptionId}
            onWearChange={onWearChange}
            acquisitionEnabled={acquisitionEnabled}
            commentsByLineKey={commentsByLineKey}
            onRentalCommentChange={onRentalCommentChange}
            tone="default"
            onAddCustomItem={
              onAddCustomItem
                ? (item, acquisition) => {
                    onAddCustomItem(item, acquisition);
                    onSelectionChange(
                      ensureFlexSelectSelected(
                        selection,
                        selectionLineKey(item.id, acquisition),
                      ),
                    );
                  }
                : undefined
            }
            onRemoveCustomItem={onRemoveCustomItem}
            className="tools-page__picker"
            ariaLabel={title}
            addSimpleLabel={t("catalog.custom")}
            addSimplePlaceholder={customPlaceholder}
          />
        </div>
      ) : null}

      {tab === "edit" ? (
        <CatalogEditPanel
          items={catalog}
          onAddBilingual={onAddGlobalItemBilingual}
          onRename={onRenameGlobalItem}
          onRemove={onRemoveGlobalItem}
          searchPlaceholder={searchPlaceholder}
        />
      ) : null}
    </DestinationPageChrome>
  );
}
