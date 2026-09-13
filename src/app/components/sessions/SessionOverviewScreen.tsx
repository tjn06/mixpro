import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatMixAmount, MIX_PARAMS } from "../../domain/mix/entities";
import { getEntityMetaLabel } from "../../domain/recipe/calc";
import {
  PRESET_RECIPES,
  recipeMenuLabel,
  type BlendingRecipe,
} from "../../domain/recipe/types";
import {
  defaultShareScope,
  stagesForShareScope,
  type SessionShareScope,
} from "../../domain/sessions/shareScope";
import {
  canNavigateToSessionStage,
  isSessionStageComplete,
  nextSessionStage,
  sessionHeaderName,
} from "../../domain/sessions/stages";
import {
  resolveSessionBatchRecipe,
  sessionEntityIndexes,
  sessionGrandTotalGrams,
  sessionIngredientTotalsGrams,
} from "../../domain/sessions/totals";
import {
  collectSessionWorkDateIds,
  commentMapFromDatedEntries,
  localWorkDateId,
  moveDatedEntriesDay,
  omitCatalogIdFromDatedEntries,
  qtyMapFromDatedEntries,
  replaceDatedQtyMapForDay,
  setDatedEntryComment,
} from "../../domain/sessions/workDate";
import { selectionLineKey } from "../../domain/select/acquisition";
import { useRecipeLibraryStore } from "../../recipe-library/store";
import { useSessionsStore } from "../../sessions/store";
import {
  SESSION_STAGE_ORDER,
  type SessionStageId,
} from "../../sessions/types";
import {
  CARD_NAME_WEIGHT,
  entityValueColor,
} from "../../presentation/entityCardStyles";
import { entityAccentColor } from "../../presentation/entityAccent";
import { useSettingsStore } from "../../settings/store";
import { AppHeader } from "../shared/AppHeader";
import {
  ScrollEdgeFadeOverlays,
  useScrollEdgeFades,
} from "../sheets/scrollEdgeFades";
import { cv } from "../../ui/tokens";
import { useConsumablesLibraryStore } from "../../consumables/libraryStore";
import { listSelectedConsumableLabelEntries } from "../../domain/consumables/labels";
import {
  ensureFlexSelectSelected,
  flexSelectSelectionTotal,
} from "../../domain/select/selection";
import { pruneWearByOptionId } from "../../domain/select/wear";
import { listSelectedToolEntries, listSelectedToolLabelEntries } from "../../domain/tools/catalog";
import { useToolsLibraryStore } from "../../tools/libraryStore";
import { ConsumablesPicker } from "../consumables/ConsumablesPicker";
import { ToolsPicker } from "../tools/ToolsPicker";
import { PickRecipeForMixSheet } from "./PickRecipeForMixSheet";
import { SaveSessionNameSheet } from "./SaveSessionNameSheet";
import { SessionBottomPanel } from "./SessionBottomPanel";
import {
  SessionDayFilterBar,
  buildSessionDayFilterBadges,
} from "./SessionDayFilterBar";
import { SessionMixCard } from "./SessionMixCard";
import { format } from "date-fns";

export function SessionOverviewScreen({
  sessionId,
  embedded = false,
  onMenuClick,
  onAddMix,
  onEditMix,
  onCreateRecipe,
}: {
  sessionId: string;
  embedded?: boolean;
  onMenuClick: () => void;
  onAddMix: (recipe: BlendingRecipe) => void;
  onEditMix: (batchId: string) => void;
  onCreateRecipe: () => void;
}) {
  const { t } = useTranslation("common");
  const colorScheme = useSettingsStore((s) => s.colorScheme);
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const sessions = useSessionsStore((s) => s.sessions);
  const session = sessions.find((item) => item.id === sessionId) ?? null;
  const patchSession = useSessionsStore((s) => s.patchSession);
  const updateSessionBatch = useSessionsStore((s) => s.updateSessionBatch);
  const removeSessionBatch = useSessionsStore((s) => s.removeSessionBatch);
  const saveSession = useSessionsStore((s) => s.saveSession);
  const userRecipes = useRecipeLibraryStore((s) => s.userRecipes);
  const libraryRecipes = useMemo(() => {
    const user = Array.isArray(userRecipes) ? userRecipes : [];
    return [...PRESET_RECIPES, ...user];
  }, [userRecipes]);

  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<string, boolean>>({});
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [pickRecipeOpen, setPickRecipeOpen] = useState(false);
  const [saveNameOpen, setSaveNameOpen] = useState(false);
  const [renameNameOpen, setRenameNameOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [shareScope, setShareScope] = useState<SessionShareScope>("current");
  const [dayFilterId, setDayFilterId] = useState<string>(() => localWorkDateId());
  const [extraDayIds, setExtraDayIds] = useState<string[]>([]);
  const scrollPanelRef = useRef<HTMLDivElement>(null);

  const batches = session?.batches ?? [];
  const sessionRecipes = session?.sessionRecipes ?? [];
  const toolsCatalog = useToolsLibraryStore((s) => s.items);
  const consumablesCatalog = useConsumablesLibraryStore((s) => s.items);
  const toolEntries = session?.toolEntries ?? [];
  const consumableEntries = session?.consumableEntries ?? [];
  const customTools = session?.customTools ?? [];
  const consumableWearByOptionId = session?.consumableWearByOptionId ?? {};
  const customConsumables = session?.customConsumables ?? [];
  /** Day-scoped writes need a concrete date — "All dates" is view-only. */
  const dayEditsEnabled = dayFilterId !== "all";
  const todayId = localWorkDateId();

  const visibleBatches = useMemo(
    () =>
      dayFilterId === "all"
        ? batches
        : batches.filter((b) => b.workDate === dayFilterId),
    [batches, dayFilterId],
  );

  const selectedToolQtys = useMemo(
    () => qtyMapFromDatedEntries(toolEntries, dayFilterId),
    [toolEntries, dayFilterId],
  );
  const toolRentalComments = useMemo(
    () => commentMapFromDatedEntries(toolEntries, dayFilterId),
    [toolEntries, dayFilterId],
  );
  const selectedConsumableQtys = useMemo(
    () => qtyMapFromDatedEntries(consumableEntries, dayFilterId),
    [consumableEntries, dayFilterId],
  );

  const toolCount = flexSelectSelectionTotal(selectedToolQtys);
  const consumableCount = flexSelectSelectionTotal(selectedConsumableQtys);
  const activeStage = session?.activeStage ?? "mixes";
  const touchedStages = session?.touchedStages ?? ["mixes"];
  const nextStage = nextSessionStage(activeStage);

  const dayBadges = useMemo(() => {
    const populatedDayIds = new Set<string>();
    for (const batch of batches) {
      if (batch.workDate) populatedDayIds.add(batch.workDate);
    }
    for (const entry of toolEntries) {
      if (entry.workDate) populatedDayIds.add(entry.workDate);
    }
    for (const entry of consumableEntries) {
      if (entry.workDate) populatedDayIds.add(entry.workDate);
    }
    return {
      badges: buildSessionDayFilterBadges(
        collectSessionWorkDateIds({
          batches,
          toolEntries,
          consumableEntries,
          activeWorkDate: session?.activeWorkDate,
          extraDayIds,
        }),
        new Date(),
        populatedDayIds,
      ),
      populatedDayIds,
    };
  }, [
    batches,
    toolEntries,
    consumableEntries,
    session?.activeWorkDate,
    extraDayIds,
  ]);
  const populatedDayIds = dayBadges.populatedDayIds;
  const sessionDayBadges = dayBadges.badges;

  const selectedToolEntries = useMemo(
    () =>
      listSelectedToolEntries(
        selectedToolQtys,
        toolsCatalog,
        customTools,
        uiLanguage,
      ),
    [selectedToolQtys, toolsCatalog, customTools, uiLanguage],
  );
  const selectedToolLabels = useMemo(
    () =>
      listSelectedToolLabelEntries(
        selectedToolQtys,
        toolsCatalog,
        customTools,
        uiLanguage,
      ),
    [selectedToolQtys, toolsCatalog, customTools, uiLanguage],
  );
  const selectedConsumableLabels = useMemo(
    () =>
      listSelectedConsumableLabelEntries(
        selectedConsumableQtys,
        consumablesCatalog,
        customConsumables,
        consumableWearByOptionId,
        uiLanguage,
      ),
    [
      selectedConsumableQtys,
      consumablesCatalog,
      customConsumables,
      consumableWearByOptionId,
      uiLanguage,
    ],
  );

  useEffect(() => {
    setShareScope(defaultShareScope(activeStage));
    setPanelExpanded(false);
  }, [activeStage]);

  useEffect(() => {
    const active =
      useSessionsStore.getState().sessions.find((s) => s.id === sessionId)
        ?.activeWorkDate || localWorkDateId();
    setDayFilterId(active);
    setExtraDayIds([]);
  }, [sessionId]);

  const stagesInShare = useMemo(
    () => stagesForShareScope(shareScope, activeStage),
    [shareScope, activeStage],
  );

  const resolveRecipe = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch || !session) return null;
    return resolveSessionBatchRecipe(batch, sessionRecipes, libraryRecipes);
  };

  const grandTotal = useMemo(
    () => sessionGrandTotalGrams(visibleBatches),
    [visibleBatches],
  );
  const ingredientTotals = useMemo(
    () => sessionIngredientTotalsGrams(visibleBatches),
    [visibleBatches],
  );
  const entityIndexes = useMemo(
    () =>
      sessionEntityIndexes(visibleBatches, (batch) =>
        resolveSessionBatchRecipe(batch, sessionRecipes, libraryRecipes),
      ),
    [visibleBatches, sessionRecipes, libraryRecipes],
  );

  const scrollEdges = useScrollEdgeFades(
    scrollPanelRef,
    true,
    `${visibleBatches.length}:${activeStage}:${dayFilterId}`,
  );

  const setDayFilter = (id: string) => {
    setDayFilterId(id);
    if (!session || id === "all") return;
    patchSession(session.id, { activeWorkDate: id });
  };

  const patchToolSelection = (next: Record<string, number>) => {
    if (!session || !dayEditsEnabled) return;
    patchSession(session.id, {
      toolEntries: replaceDatedQtyMapForDay(toolEntries, dayFilterId, next),
      activeWorkDate: dayFilterId,
    });
  };

  const patchConsumableSelection = (next: Record<string, number>) => {
    if (!session || !dayEditsEnabled) return;
    const nextEntries = replaceDatedQtyMapForDay(
      consumableEntries,
      dayFilterId,
      next,
    );
    patchSession(session.id, {
      consumableEntries: nextEntries,
      consumableWearByOptionId: pruneWearByOptionId(
        consumableWearByOptionId,
        qtyMapFromDatedEntries(nextEntries, "all"),
      ),
      activeWorkDate: dayFilterId,
    });
  };

  const confirmDayChange = (fromDayId: string, toDate: Date) => {
    if (!session) return;
    const toId = format(toDate, "yyyy-MM-dd");
    const fromIsToday = fromDayId === todayId;

    if (fromIsToday) {
      setExtraDayIds((prev) =>
        prev.includes(toId) || toId === todayId ? prev : [...prev, toId],
      );
      setDayFilter(toId);
      return;
    }

    if (fromDayId === toId) {
      setDayFilter(toId);
      return;
    }

    patchSession(session.id, {
      batches: batches.map((batch) =>
        batch.workDate === fromDayId ? { ...batch, workDate: toId } : batch,
      ),
      toolEntries: moveDatedEntriesDay(toolEntries, fromDayId, toId),
      consumableEntries: moveDatedEntriesDay(
        consumableEntries,
        fromDayId,
        toId,
      ),
      activeWorkDate: toId,
    });
    setExtraDayIds((prev) => {
      const withoutFrom = prev.filter((id) => id !== fromDayId);
      return withoutFrom.includes(toId) ? withoutFrom : [...withoutFrom, toId];
    });
    setDayFilterId(toId);
  };

  const deleteDayContent = (dayId: string) => {
    if (!session) return;
    const nextToolEntries = toolEntries.filter((e) => e.workDate !== dayId);
    const nextConsumableEntries = consumableEntries.filter(
      (e) => e.workDate !== dayId,
    );

    patchSession(session.id, {
      batches: batches.filter((batch) => batch.workDate !== dayId),
      toolEntries: nextToolEntries,
      consumableEntries: nextConsumableEntries,
      consumableWearByOptionId: pruneWearByOptionId(
        consumableWearByOptionId,
        qtyMapFromDatedEntries(nextConsumableEntries, "all"),
      ),
      activeWorkDate:
        dayFilterId === dayId && dayId !== todayId
          ? todayId
          : dayId === session.activeWorkDate
            ? todayId
            : session.activeWorkDate,
    });

    if (dayId !== todayId) {
      setExtraDayIds((prev) => prev.filter((id) => id !== dayId));
    }
    if (dayFilterId === dayId) {
      setDayFilterId(todayId);
    }
  };

  const addSessionDay = (date: Date) => {
    const toId = format(date, "yyyy-MM-dd");
    setExtraDayIds((prev) =>
      prev.includes(toId) || toId === todayId ? prev : [...prev, toId],
    );
    setDayFilter(toId);
  };

  if (!session) {
    const missing = (
      <div
        className="app-frame relative flex flex-col overflow-hidden select-none h-full min-h-0"
        style={{ background: "var(--semantic-surface-app)" }}
      >
        <AppHeader title={t("sessions.headerTitle")} onMenuClick={onMenuClick} sessionChrome />
        <p className="destination-page__empty app-gutter-x" style={{ color: cv.text.dimmed }}>
          Session not found.
        </p>
      </div>
    );
    return embedded ? missing : (
      <div className="mobile-shell">
        <div className="app-frame-host">{missing}</div>
      </div>
    );
  }

  const setStage = (stage: SessionStageId) => {
    if (!canNavigateToSessionStage(stage, activeStage, touchedStages)) return;
    patchSession(session.id, { activeStage: stage });
  };

  /** Header Next and the immediate-next chip share this path. */
  const goNextStage = () => {
    if (!nextStage) return;
    patchSession(session.id, { activeStage: nextStage });
  };

  const handleSaveConfirm = (name: string, orderNumber: string) => {
    saveSession(session.id, name, orderNumber);
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 1600);
  };

  const amountColor = entityValueColor(true, colorScheme);
  const ingredientRows = entityIndexes.filter((i) => i !== 0);

  const expandedSummary = (
    <div className="batch-totals-entity-total-table min-w-0 w-full" aria-readonly>
      <header className="batch-totals-entity-summary__intro">
        <h2 className="batch-totals-entity-summary__title">
          {t(`sessions.stage.${activeStage}`)}
        </h2>
        <p className="batch-totals-entity-summary__subtitle">
          {activeStage === "summary"
            ? t("sessions.ledePackage")
            : activeStage === "mixes"
              ? t("sessions.ledeMixTotals")
              : activeStage === "consumption-tools"
                ? selectedToolLabels.length > 0
                  ? t("sessions.ledeTools")
                  : t("sessions.ledeToolsEmpty")
                : selectedConsumableLabels.length > 0
                  ? t("sessions.ledeConsumables")
                  : t("sessions.ledeConsumablesEmpty")}
        </p>
        {activeStage === "mixes" || activeStage === "summary" ? (
          <div className="batch-totals-entity-summary__chips" aria-label={t("sessions.countsAria")}>
            <span className="batch-totals-entity-summary__chip">
              {t("sessions.stageShort.mixes")}{" "}
              <span className="batch-totals-entity-summary__chip-mult">
                ×{visibleBatches.length}
              </span>
            </span>
            {activeStage === "summary" ? (
              <>
                <span className="batch-totals-entity-summary__chip">
                  {t("sessions.stageShort.consumption-tools")}{" "}
                  <span className="batch-totals-entity-summary__chip-mult">
                    ×{toolCount}
                  </span>
                </span>
                <span className="batch-totals-entity-summary__chip">
                  {t("sessions.stageShort.consumables")}{" "}
                  <span className="batch-totals-entity-summary__chip-mult">
                    ×{consumableCount}
                  </span>
                </span>
              </>
            ) : null}
          </div>
        ) : null}
        {activeStage === "consumption-tools" && selectedToolEntries.length > 0 ? (
          <div className="batch-totals-entity-summary__chips" aria-label={t("sessions.selectedToolsAria")}>
            {selectedToolEntries.map((entry) => (
              <span
                key={entry.id}
                className="batch-totals-entity-summary__chip"
                data-rented={entry.rented ? "" : undefined}
              >
                {entry.qty > 1 ? `${entry.label} ×${entry.qty}` : entry.label}
              </span>
            ))}
          </div>
        ) : null}
        {activeStage === "consumables" && selectedConsumableLabels.length > 0 ? (
          <div
            className="batch-totals-entity-summary__chips"
            aria-label={t("sessions.selectedConsumablesAria")}
          >
            {selectedConsumableLabels.map((label) => (
              <span key={label} className="batch-totals-entity-summary__chip">
                {label}
              </span>
            ))}
          </div>
        ) : null}
        {activeStage === "summary" && selectedToolEntries.length > 0 ? (
          <div className="batch-totals-entity-summary__chips" aria-label={t("sessions.selectedToolsAria")}>
            {selectedToolEntries.map((entry) => (
              <span
                key={`tool-${entry.id}`}
                className="batch-totals-entity-summary__chip"
                data-rented={entry.rented ? "" : undefined}
              >
                {entry.qty > 1 ? `${entry.label} ×${entry.qty}` : entry.label}
              </span>
            ))}
          </div>
        ) : null}
        {activeStage === "summary" && selectedConsumableLabels.length > 0 ? (
          <div
            className="batch-totals-entity-summary__chips"
            aria-label={t("sessions.selectedConsumablesAria")}
          >
            {selectedConsumableLabels.map((label) => (
              <span key={`cons-${label}`} className="batch-totals-entity-summary__chip">
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </header>
      {activeStage === "mixes" || activeStage === "summary" ? (
        <table
          className="batch-totals-entity-total-table__grid w-full min-w-0 border-collapse"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: "56%" }} />
            <col style={{ width: "44%" }} />
          </colgroup>
          <tbody>
            {ingredientRows.map((pi) => {
              const p = MIX_PARAMS[pi];
              const sampleRecipe = batches[0]
                ? resolveSessionBatchRecipe(batches[0], sessionRecipes, libraryRecipes)
                : null;
              const metaLabel = sampleRecipe
                ? p.id === "TOTAL"
                  ? t("mixer.totalMeta")
                  : getEntityMetaLabel(sampleRecipe, p.id, uiLanguage)
                : undefined;
              return (
                <tr key={p.id}>
                  <th
                    scope="row"
                    className="text-left align-middle font-normal"
                    style={{ padding: "var(--entity-summary-cell-py) 0" }}
                  >
                    <div className="min-w-0 flex items-baseline gap-1">
                      <span
                        className="truncate shrink-0"
                        style={{
                          fontSize: "var(--text-card-name)",
                          letterSpacing: "0.18em",
                          fontWeight: CARD_NAME_WEIGHT,
                          color: entityAccentColor(p.id, colorScheme),
                          lineHeight: 1.15,
                        }}
                      >
                        {p.id}
                      </span>
                      {metaLabel ? (
                        <span
                          className="truncate min-w-0"
                          style={{
                            fontSize: "var(--text-totals-item-meta)",
                            color: cv.text.secondary,
                            fontWeight: 500,
                          }}
                        >
                          {metaLabel}
                        </span>
                      ) : null}
                    </div>
                  </th>
                  <td
                    className="app-readout text-right align-middle tabular-nums whitespace-nowrap"
                    style={{
                      paddingBlock: "var(--entity-summary-cell-py)",
                      fontSize: "var(--text-totals-row-amount)",
                      fontWeight: 600,
                      color: amountColor,
                    }}
                  >
                    {formatMixAmount(ingredientTotals[pi] ?? 0, p.isKg)}
                    <span
                      style={{
                        color: cv.text.muted,
                        fontWeight: 500,
                        marginLeft: 3,
                        fontSize: "var(--text-totals-unit)",
                      }}
                    >
                      {p.isKg ? "kg" : "g"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : activeStage === "consumption-tools" ? (
        selectedToolLabels.length === 0 ? (
          <p style={{ color: cv.text.dimmed, margin: 0 }}>{t("sessions.ledeToolsEmpty")}</p>
        ) : null
      ) : activeStage === "consumables" ? (
        selectedConsumableLabels.length === 0 ? (
          <p style={{ color: cv.text.dimmed, margin: 0 }}>
            {t("sessions.ledeConsumablesEmpty")}
          </p>
        ) : null
      ) : null}
    </div>
  );

  const mixesMain = (
    <div className="scroll-edge-fade-viewport batch-totals-scroll-fade-viewport flex flex-col">
      <ScrollEdgeFadeOverlays fromTop={scrollEdges.fromTop} fromBottom={false} />
      <div ref={scrollPanelRef} className="batch-totals-scroll-panel flex flex-col">
        <div className="batch-totals-scroll-panel__inner session-overview__mix-list">
          {!dayEditsEnabled ? (
            <p
              className="session-overview__day-readonly-hint"
              style={{ color: cv.text.muted }}
            >
              {t("sessions.selectDayEditMixes")}
            </p>
          ) : null}
          {visibleBatches.length === 0 ? (
            <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
              {dayFilterId === "all"
                ? t("sessions.noMixesYet")
                : t("sessions.noMixesOnDay")}
            </p>
          ) : (
            visibleBatches.map((batch) => (
              <SessionMixCard
                key={batch.id}
                batch={batch}
                recipe={resolveRecipe(batch.id)}
                colorScheme={colorScheme}
                expanded={Boolean(expandedBatchIds[batch.id])}
                onExpandedChange={(next) =>
                  setExpandedBatchIds((prev) => ({
                    ...prev,
                    [batch.id]: next,
                  }))
                }
                onMultiplierChange={(next) => {
                  if (!dayEditsEnabled) return;
                  updateSessionBatch(session.id, batch.id, {
                    multiplier: next,
                  });
                }}
                onCommentChange={(next) => {
                  if (!dayEditsEnabled) return;
                  updateSessionBatch(session.id, batch.id, {
                    comment: next,
                  });
                }}
                onEdit={() => {
                  if (!dayEditsEnabled) return;
                  onEditMix(batch.id);
                }}
                onRemove={() => {
                  if (!dayEditsEnabled) return;
                  removeSessionBatch(session.id, batch.id);
                }}
                readOnly={!dayEditsEnabled}
              />
            ))
          )}

          <div className="session-overview__workspace-actions">
            <button
              type="button"
              disabled={!dayEditsEnabled}
              title={
                dayEditsEnabled
                  ? undefined
                  : t("sessions.selectDayAddMix")
              }
              onClick={() => {
                if (!dayEditsEnabled) return;
                setPickRecipeOpen(true);
              }}
              className="session-overview__workspace-btn session-overview__workspace-btn--mix"
            >
              <span className="batch-totals-add-extra-btn__icon" aria-hidden>
                +
              </span>
              {t("sessions.addMix")}
            </button>
            <button
              type="button"
              disabled={!dayEditsEnabled}
              title={
                dayEditsEnabled
                  ? undefined
                  : t("sessions.selectDayAddRecipe")
              }
              onClick={() => {
                if (!dayEditsEnabled) return;
                onCreateRecipe();
              }}
              className="session-overview__workspace-btn session-overview__workspace-btn--recipe"
            >
              <span className="batch-totals-add-extra-btn__icon" aria-hidden>
                +
              </span>
              Add recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const goToStage = (stage: SessionStageId) => {
    if (canNavigateToSessionStage(stage, activeStage, touchedStages)) {
      patchSession(session.id, { activeStage: stage });
    }
  };

  const summaryStatusLabel =
    session.status === "saved" ? t("sessions.saved") : t("sessions.readyToSave");

  const summaryMain = (
    <div className="scroll-edge-fade-viewport batch-totals-scroll-fade-viewport flex flex-col">
      <ScrollEdgeFadeOverlays fromTop={scrollEdges.fromTop} fromBottom={false} />
      <div ref={scrollPanelRef} className="batch-totals-scroll-panel flex flex-col">
        <div className="batch-totals-scroll-panel__inner session-overview__mix-list">
          <header className="session-overview__stage-intro">
            <h2 style={{ color: cv.text.primary, margin: 0 }}>
              {t("sessions.stage.summary")}
            </h2>
            <p style={{ color: cv.text.muted, margin: 0 }}>
              {t("sessions.summaryLede")}
            </p>
          </header>

          <div
            className="session-overview__summary-snapshot"
            aria-label={t("sessions.snapshotAria")}
          >
            <div className="session-overview__summary-snapshot-hero">
              <span
                className="session-overview__summary-snapshot-total app-readout tabular-nums"
                style={{ color: amountColor }}
              >
                {grandTotal > 0 ? `${formatMixAmount(grandTotal, true)} kg` : "—"}
              </span>
              <span
                className="session-overview__summary-snapshot-status"
                data-saved={session.status === "saved" ? "" : undefined}
              >
                {summaryStatusLabel}
              </span>
            </div>
            <div className="session-overview__summary-snapshot-facts">
              <span>
                <strong>{visibleBatches.length}</strong>{" "}
                {visibleBatches.length === 1
                  ? t("sessions.count.mix_one")
                  : t("sessions.count.mix_other")}
              </span>
              <span aria-hidden>·</span>
              <span>
                <strong>{toolCount}</strong>{" "}
                {toolCount === 1
                  ? t("sessions.count.tool_one")
                  : t("sessions.count.tool_other")}
              </span>
              <span aria-hidden>·</span>
              <span>
                <strong>{consumableCount}</strong>{" "}
                {consumableCount === 1
                  ? t("sessions.count.consumable_one")
                  : t("sessions.count.consumable_other")}
              </span>
            </div>
          </div>

          <section className="session-overview__summary-section" aria-labelledby="summary-mixes-heading">
            <div className="session-overview__summary-section-head">
              <h3 id="summary-mixes-heading">{t("sessions.stage.mixes")}</h3>
              <span className="session-overview__summary-section-count">
                {visibleBatches.length}
              </span>
            </div>
            {visibleBatches.length === 0 ? (
              <p className="session-overview__summary-empty" style={{ color: cv.text.dimmed }}>
                {dayFilterId === "all"
                  ? t("sessions.noMixesSummary")
                  : t("sessions.noMixesOnDay")}
              </p>
            ) : (
              <ul className="session-overview__summary-mixes">
                {visibleBatches.map((batch) => {
                  const recipe = resolveRecipe(batch.id);
                  const total = sessionGrandTotalGrams([batch]);
                  return (
                    <li key={batch.id} className="session-overview__summary-mix-row">
                      <button
                        type="button"
                        className="session-overview__summary-mix-btn"
                        disabled={!dayEditsEnabled}
                        title={
                          dayEditsEnabled
                            ? undefined
                            : t("sessions.selectDayEditMix")
                        }
                        onClick={() => {
                          if (!dayEditsEnabled) return;
                          onEditMix(batch.id);
                        }}
                      >
                        <span className="session-overview__summary-mix-name">
                          {batch.name}
                        </span>
                        <span
                          className="session-overview__summary-mix-meta"
                          style={{ color: cv.text.muted }}
                        >
                          {batch.recipeName ||
                            (recipe
                              ? recipeMenuLabel(recipe, uiLanguage)
                              : batch.recipeId)}
                          {" · "}
                          ×{Math.max(1, batch.multiplier)}
                        </span>
                      </button>
                      <span
                        className="session-overview__summary-mix-total app-readout tabular-nums"
                        style={{ color: amountColor }}
                      >
                        {formatMixAmount(total, true)} kg
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            className="session-overview__summary-section"
            aria-labelledby="summary-tools-heading"
          >
            <div className="session-overview__summary-section-head">
              <h3 id="summary-tools-heading">
                {t("sessions.stage.consumption-tools")}
              </h3>
              <span className="session-overview__summary-section-count">
                {toolCount}
              </span>
            </div>
            {selectedToolEntries.length > 0 ? (
              <div className="session-overview__summary-chips" aria-label={t("sessions.selectedToolsAria")}>
                {selectedToolEntries.map((entry) => (
                  <span
                    key={entry.id}
                    className="session-overview__summary-chip"
                    data-rented={entry.rented ? "" : undefined}
                  >
                    {entry.qty > 1 ? `${entry.label} ×${entry.qty}` : entry.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="session-overview__summary-empty" style={{ color: cv.text.dimmed }}>
                {t("sessions.summaryToolsEmpty")}
              </p>
            )}
            <button
              type="button"
              className="session-overview__summary-jump"
              disabled={
                !canNavigateToSessionStage(
                  "consumption-tools",
                  activeStage,
                  touchedStages,
                )
              }
              onClick={() => goToStage("consumption-tools")}
            >
              {t("sessions.openTools")}
            </button>
          </section>

          <section
            className="session-overview__summary-section"
            aria-labelledby="summary-cons-heading"
          >
            <div className="session-overview__summary-section-head">
              <h3 id="summary-cons-heading">
                {t("sessions.stage.consumables")}
              </h3>
              <span className="session-overview__summary-section-count">
                {consumableCount}
              </span>
            </div>
            {selectedConsumableLabels.length > 0 ? (
              <div
                className="session-overview__summary-chips"
                aria-label={t("sessions.selectedConsumablesAria")}
              >
                {selectedConsumableLabels.map((label) => (
                  <span key={label} className="session-overview__summary-chip">
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="session-overview__summary-empty" style={{ color: cv.text.dimmed }}>
                {t("sessions.summaryConsumablesEmpty")}
              </p>
            )}
            <button
              type="button"
              className="session-overview__summary-jump"
              disabled={
                !canNavigateToSessionStage("consumables", activeStage, touchedStages)
              }
              onClick={() => goToStage("consumables")}
            >
              {t("sessions.openConsumables")}
            </button>
          </section>
        </div>
      </div>
    </div>
  );

  const toolsMain = (
    <div className="scroll-edge-fade-viewport batch-totals-scroll-fade-viewport flex flex-col">
      <div className="batch-totals-scroll-panel flex flex-col">
        <div className="batch-totals-scroll-panel__inner session-overview__tools-pad app-gutter-x">
          {!dayEditsEnabled ? (
            <p
              className="session-overview__day-readonly-hint"
              style={{ color: cv.text.muted }}
            >
              {t("sessions.selectDayChangeTools")}
            </p>
          ) : null}
          <div
            className={
              dayEditsEnabled ? undefined : "session-overview__day-readonly"
            }
            aria-disabled={!dayEditsEnabled}
          >
            <ToolsPicker
              selection={selectedToolQtys}
              onSelectionChange={patchToolSelection}
              customTools={customTools}
              acquisitionEnabled
              commentsByLineKey={toolRentalComments}
              onRentalCommentChange={
                dayEditsEnabled
                  ? (lineKey, comment) => {
                      if (!session || dayFilterId === "all") return;
                      patchSession(session.id, {
                        toolEntries: setDatedEntryComment(
                          toolEntries,
                          dayFilterId,
                          lineKey,
                          comment,
                        ),
                      });
                    }
                  : undefined
              }
              onAddCustomTool={(item, acquisition) => {
                if (!session || !dayEditsEnabled) return;
                patchSession(session.id, {
                  customTools: [...customTools, item],
                  toolEntries: replaceDatedQtyMapForDay(
                    toolEntries,
                    dayFilterId,
                    ensureFlexSelectSelected(
                      qtyMapFromDatedEntries(toolEntries, dayFilterId),
                      selectionLineKey(item.id, acquisition),
                    ),
                  ),
                  activeWorkDate: dayFilterId,
                });
              }}
              onRemoveCustomTool={
                dayEditsEnabled
                  ? (id) => {
                      if (!session) return;
                      patchSession(session.id, {
                        customTools: customTools.filter(
                          (item) => item.id !== id,
                        ),
                        toolEntries: omitCatalogIdFromDatedEntries(
                          toolEntries,
                          id,
                        ),
                      });
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );

  const consumablesMain = (
    <div className="scroll-edge-fade-viewport batch-totals-scroll-fade-viewport flex flex-col">
      <div className="batch-totals-scroll-panel flex flex-col">
        <div className="batch-totals-scroll-panel__inner session-overview__tools-pad app-gutter-x">
          {!dayEditsEnabled ? (
            <p
              className="session-overview__day-readonly-hint"
              style={{ color: cv.text.muted }}
            >
              {t("sessions.selectDayChangeConsumables")}
            </p>
          ) : null}
          <div
            className={
              dayEditsEnabled ? undefined : "session-overview__day-readonly"
            }
            aria-disabled={!dayEditsEnabled}
          >
            <ConsumablesPicker
              selection={selectedConsumableQtys}
              onSelectionChange={patchConsumableSelection}
              wearByOptionId={consumableWearByOptionId}
              onWearChange={(next) => {
                if (!session || !dayEditsEnabled) return;
                patchSession(session.id, { consumableWearByOptionId: next });
              }}
              customConsumables={customConsumables}
              onAddCustomConsumable={(item) => {
                if (!session || !dayEditsEnabled) return;
                const nextEntries = replaceDatedQtyMapForDay(
                  consumableEntries,
                  dayFilterId,
                  ensureFlexSelectSelected(
                    qtyMapFromDatedEntries(consumableEntries, dayFilterId),
                    item.id,
                  ),
                );
                patchSession(session.id, {
                  customConsumables: [...customConsumables, item],
                  consumableEntries: nextEntries,
                  consumableWearByOptionId: pruneWearByOptionId(
                    consumableWearByOptionId,
                    qtyMapFromDatedEntries(nextEntries, "all"),
                  ),
                  activeWorkDate: dayFilterId,
                });
              }}
              onRemoveCustomConsumable={
                dayEditsEnabled
                  ? (id) => {
                      if (!session) return;
                      const nextEntries = omitCatalogIdFromDatedEntries(
                        consumableEntries,
                        id,
                      );
                      patchSession(session.id, {
                        customConsumables: customConsumables.filter(
                          (item) => item.id !== id,
                        ),
                        consumableEntries: nextEntries,
                        consumableWearByOptionId: pruneWearByOptionId(
                          consumableWearByOptionId,
                          qtyMapFromDatedEntries(nextEntries, "all"),
                          [id],
                        ),
                      });
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );

  const stageMain =
    activeStage === "mixes"
      ? mixesMain
      : activeStage === "consumption-tools"
        ? toolsMain
        : activeStage === "consumables"
          ? consumablesMain
          : summaryMain;

  const frame = (
    <div
      className="app-frame relative flex flex-col overflow-hidden select-none h-full min-h-0"
      style={{ background: "var(--semantic-surface-app)" }}
    >
      <div className="batch-totals-route flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="recipe-context-gradient flex-1 min-h-0 flex flex-col overflow-hidden">
          <AppHeader
            title={`${t("sessions.headerTitle")}: ${sessionHeaderName(session)}`}
            onMenuClick={onMenuClick}
            onTitleClick={() => setRenameNameOpen(true)}
            titleClickLabel={`${t("sessions.editName")}, ${sessionHeaderName(session)}`}
            sessionChrome
          />

          <div className="batch-totals-screen flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden relative">
            <div className="batch-totals-screen__main flex flex-col">
              <div className="session-overview__chrome">
                <nav className="session-overview__stages app-gutter-x" aria-label={t("sessions.stagesAria")}>
                  {SESSION_STAGE_ORDER.map((stageId, index) => {
                    const active = stageId === activeStage;
                    const touched = touchedStages.includes(stageId);
                    const complete = session
                      ? isSessionStageComplete(session, stageId)
                      : false;
                    const inShare = stagesInShare.includes(stageId);
                    const selectable = canNavigateToSessionStage(
                      stageId,
                      activeStage,
                      touchedStages,
                    );
                    const isNext = stageId === nextStage;
                    const isFirst = index === 0;
                    const isLast = index === SESSION_STAGE_ORDER.length - 1;
                    return (
                      <button
                        key={stageId}
                        type="button"
                        className={`session-overview__stage-btn${
                          isFirst ? " session-overview__stage-btn--first" : ""
                        }${isLast ? " session-overview__stage-btn--last" : ""}${
                          active ? " session-overview__stage-btn--active" : ""
                        }`}
                        style={{ zIndex: SESSION_STAGE_ORDER.length - index }}
                        aria-current={active ? "step" : undefined}
                        disabled={!active && !selectable}
                        data-touched={touched ? "" : undefined}
                        data-complete={complete ? "" : undefined}
                        data-in-share={inShare ? "" : undefined}
                        onClick={() => {
                          if (active) return;
                          if (isNext) {
                            goNextStage();
                            return;
                          }
                          setStage(stageId);
                        }}
                      >
                        <span
                          className={`session-overview__stage-label${
                            complete ? " session-overview__stage-label--modified" : ""
                          }`}
                        >
                          {t(`sessions.stageShort.${stageId}`)}
                          {complete ? (
                            <Check
                              className="session-overview__stage-modified-mark"
                              size={11}
                              strokeWidth={2.4}
                              aria-hidden
                            />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </nav>
                <SessionDayFilterBar
                  badges={sessionDayBadges}
                  selectedId={dayFilterId}
                  onSelectedIdChange={setDayFilter}
                  onConfirmDayChange={confirmDayChange}
                  onDeleteDay={deleteDayContent}
                  dayHasContent={(dayId) => populatedDayIds.has(dayId)}
                  onAddDay={addSessionDay}
                />
              </div>

              {stageMain}

              <SessionBottomPanel
                mixCount={visibleBatches.length}
                totalGrams={grandTotal}
                colorScheme={colorScheme}
                sourceExpanded={panelExpanded}
                onSourceExpandedChange={setPanelExpanded}
                expandedBody={expandedSummary}
                session={session}
                libraryRecipes={libraryRecipes}
                shareScope={shareScope}
                onShareScopeChange={setShareScope}
                onSaveSession={() => setSaveNameOpen(true)}
                saveFlash={saveFlash}
                toolCount={toolCount}
                consumableCount={consumableCount}
                dayFilter={dayFilterId}
              />
            </div>
          </div>
        </div>
      </div>

      <PickRecipeForMixSheet
        open={pickRecipeOpen}
        onOpenChange={setPickRecipeOpen}
        libraryRecipes={libraryRecipes}
        sessionRecipes={sessionRecipes}
        onPick={onAddMix}
      />

      <SaveSessionNameSheet
        open={saveNameOpen}
        onOpenChange={setSaveNameOpen}
        initialName={session.name}
        initialOrderNumber={session.orderNumber ?? ""}
        onConfirm={handleSaveConfirm}
      />

      <SaveSessionNameSheet
        open={renameNameOpen}
        onOpenChange={setRenameNameOpen}
        initialName={session.name}
        initialOrderNumber={session.orderNumber ?? ""}
        title={t("sessions.renameTitle")}
        subtitle={t("sessions.renameSubtitle")}
        confirmLabel={t("common.rename")}
        onConfirm={(name, orderNumber) =>
          patchSession(session.id, {
            name,
            orderNumber: orderNumber || undefined,
          })
        }
      />
    </div>
  );

  if (embedded) return frame;

  return (
    <div className="mobile-shell">
      <div className="app-frame-host">{frame}</div>
    </div>
  );
}
