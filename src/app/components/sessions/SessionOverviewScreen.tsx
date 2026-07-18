import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  SESSION_STAGE_CARD_LABELS,
  canNavigateToSessionStage,
  isSessionStageComplete,
  nextSessionStage,
} from "../../domain/sessions/stages";
import {
  resolveSessionBatchRecipe,
  sessionEntityIndexes,
  sessionGrandTotalGrams,
  sessionIngredientTotalsGrams,
} from "../../domain/sessions/totals";
import { useRecipeLibraryStore } from "../../recipe-library/store";
import { useSessionsStore } from "../../sessions/store";
import {
  SESSION_STAGE_LABELS,
  SESSION_STAGE_ORDER,
  type SessionStageId,
} from "../../sessions/types";
import {
  CARD_NAME_WEIGHT,
  entityValueColor,
} from "../../presentation/entityCardStyles";
import { entityAccentColor } from "../../presentation/entityAccent";
import { useSettingsStore } from "../../settings/store";
import { RenameIcon } from "../shared/ActionIcons";
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
import { listSelectedToolLabelEntries } from "../../domain/tools/catalog";
import { useToolsLibraryStore } from "../../tools/libraryStore";
import { ConsumablesPicker } from "../consumables/ConsumablesPicker";
import { ToolsPicker } from "../tools/ToolsPicker";
import { PickRecipeForMixSheet } from "./PickRecipeForMixSheet";
import { SaveSessionNameSheet } from "./SaveSessionNameSheet";
import { SessionBottomPanel } from "./SessionBottomPanel";
import { SessionMixCard } from "./SessionMixCard";

export function SessionOverviewScreen({
  sessionId,
  embedded = false,
  onMenuClick,
  onBack,
  onAddMix,
  onEditMix,
  onCreateRecipe,
}: {
  sessionId: string;
  embedded?: boolean;
  onMenuClick: () => void;
  onBack: () => void;
  onAddMix: (recipe: BlendingRecipe) => void;
  onEditMix: (batchId: string) => void;
  onCreateRecipe: () => void;
}) {
  const colorScheme = useSettingsStore((s) => s.colorScheme);
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
  const scrollPanelRef = useRef<HTMLDivElement>(null);

  const batches = session?.batches ?? [];
  const sessionRecipes = session?.sessionRecipes ?? [];
  const toolsCatalog = useToolsLibraryStore((s) => s.items);
  const consumablesCatalog = useConsumablesLibraryStore((s) => s.items);
  const selectedToolQtys = session?.selectedToolQtys ?? {};
  const customTools = session?.customTools ?? [];
  const selectedConsumableQtys = session?.selectedConsumableQtys ?? {};
  const customConsumables = session?.customConsumables ?? [];
  const toolCount = flexSelectSelectionTotal(selectedToolQtys);
  const consumableCount = flexSelectSelectionTotal(selectedConsumableQtys);
  const activeStage = session?.activeStage ?? "mixes";
  const touchedStages = session?.touchedStages ?? ["mixes"];
  const nextStage = nextSessionStage(activeStage);
  const selectedToolLabels = useMemo(
    () =>
      listSelectedToolLabelEntries(
        selectedToolQtys,
        toolsCatalog,
        customTools,
      ),
    [selectedToolQtys, toolsCatalog, customTools],
  );
  const selectedConsumableLabels = useMemo(
    () =>
      listSelectedConsumableLabelEntries(
        selectedConsumableQtys,
        consumablesCatalog,
        customConsumables,
      ),
    [selectedConsumableQtys, consumablesCatalog, customConsumables],
  );

  useEffect(() => {
    setShareScope(defaultShareScope(activeStage));
    setPanelExpanded(false);
  }, [activeStage]);

  const stagesInShare = useMemo(
    () => stagesForShareScope(shareScope, activeStage),
    [shareScope, activeStage],
  );

  const resolveRecipe = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch || !session) return null;
    return resolveSessionBatchRecipe(batch, sessionRecipes, libraryRecipes);
  };

  const grandTotal = useMemo(() => sessionGrandTotalGrams(batches), [batches]);
  const ingredientTotals = useMemo(
    () => sessionIngredientTotalsGrams(batches),
    [batches],
  );
  const entityIndexes = useMemo(
    () =>
      sessionEntityIndexes(batches, (batch) =>
        resolveSessionBatchRecipe(batch, sessionRecipes, libraryRecipes),
      ),
    [batches, sessionRecipes, libraryRecipes],
  );

  const scrollEdges = useScrollEdgeFades(
    scrollPanelRef,
    true,
    `${batches.length}:${activeStage}`,
  );

  if (!session) {
    const missing = (
      <div
        className="app-frame relative flex flex-col overflow-hidden select-none h-full min-h-0"
        style={{ background: "var(--semantic-surface-app)" }}
      >
        <AppHeader
          title="Session"
          onMenuClick={onMenuClick}
          onBack={onBack}
          backLabel="Back to sessions"
          backConfirmAction="BACK TO SESSIONS"
          sessionChrome
        />
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

  const handleSaveConfirm = (name: string) => {
    saveSession(session.id, name);
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 1600);
  };

  const amountColor = entityValueColor(true, colorScheme);
  const ingredientRows = entityIndexes.filter((i) => i !== 0);

  const expandedSummary = (
    <div className="batch-totals-entity-total-table min-w-0 w-full" aria-readonly>
      <header className="batch-totals-entity-summary__intro">
        <h2 className="batch-totals-entity-summary__title">
          {SESSION_STAGE_LABELS[activeStage]}
        </h2>
        <p className="batch-totals-entity-summary__subtitle">
          {activeStage === "summary"
            ? "Session package — mixes, tools, consumables, and combined ingredient totals."
            : activeStage === "mixes"
              ? "Combined totals for each ingredient across all mixes."
              : activeStage === "consumption-tools"
                ? selectedToolLabels.length > 0
                  ? "Tools selected for this session."
                  : "No tools selected yet."
                : selectedConsumableLabels.length > 0
                  ? "Consumables selected for this session."
                  : "No consumables selected yet."}
        </p>
        {activeStage === "mixes" || activeStage === "summary" ? (
          <div className="batch-totals-entity-summary__chips" aria-label="Session counts">
            <span className="batch-totals-entity-summary__chip">
              Mixes{" "}
              <span className="batch-totals-entity-summary__chip-mult">
                ×{batches.length}
              </span>
            </span>
            {activeStage === "summary" ? (
              <>
                <span className="batch-totals-entity-summary__chip">
                  Tools{" "}
                  <span className="batch-totals-entity-summary__chip-mult">
                    ×{toolCount}
                  </span>
                </span>
                <span className="batch-totals-entity-summary__chip">
                  Cons.{" "}
                  <span className="batch-totals-entity-summary__chip-mult">
                    ×{consumableCount}
                  </span>
                </span>
              </>
            ) : null}
          </div>
        ) : null}
        {activeStage === "consumption-tools" && selectedToolLabels.length > 0 ? (
          <div className="batch-totals-entity-summary__chips" aria-label="Selected tools">
            {selectedToolLabels.map((label) => (
              <span key={label} className="batch-totals-entity-summary__chip">
                {label}
              </span>
            ))}
          </div>
        ) : null}
        {activeStage === "consumables" && selectedConsumableLabels.length > 0 ? (
          <div
            className="batch-totals-entity-summary__chips"
            aria-label="Selected consumables"
          >
            {selectedConsumableLabels.map((label) => (
              <span key={label} className="batch-totals-entity-summary__chip">
                {label}
              </span>
            ))}
          </div>
        ) : null}
        {activeStage === "summary" && selectedToolLabels.length > 0 ? (
          <div className="batch-totals-entity-summary__chips" aria-label="Selected tools">
            {selectedToolLabels.map((label) => (
              <span key={`tool-${label}`} className="batch-totals-entity-summary__chip">
                {label}
              </span>
            ))}
          </div>
        ) : null}
        {activeStage === "summary" && selectedConsumableLabels.length > 0 ? (
          <div
            className="batch-totals-entity-summary__chips"
            aria-label="Selected consumables"
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
                ? getEntityMetaLabel(sampleRecipe, p.id)
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
          <p style={{ color: cv.text.dimmed, margin: 0 }}>No tools selected yet.</p>
        ) : null
      ) : activeStage === "consumables" ? (
        selectedConsumableLabels.length === 0 ? (
          <p style={{ color: cv.text.dimmed, margin: 0 }}>
            No consumables selected yet.
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
          {batches.length === 0 ? (
            <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
              No mixes yet. Add a mix to start this session.
            </p>
          ) : (
            batches.map((batch) => (
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
                onMultiplierChange={(next) =>
                  updateSessionBatch(session.id, batch.id, {
                    multiplier: next,
                  })
                }
                onEdit={() => onEditMix(batch.id)}
                onRemove={() => removeSessionBatch(session.id, batch.id)}
              />
            ))
          )}

          <div className="session-overview__workspace-actions">
            <button
              type="button"
              onClick={() => setPickRecipeOpen(true)}
              className="session-overview__workspace-btn session-overview__workspace-btn--mix"
            >
              <span className="batch-totals-add-extra-btn__icon" aria-hidden>
                +
              </span>
              Add mix
            </button>
            <button
              type="button"
              onClick={onCreateRecipe}
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
    session.status === "saved" ? "Saved" : "Ready to save";

  const summaryMain = (
    <div className="scroll-edge-fade-viewport batch-totals-scroll-fade-viewport flex flex-col">
      <ScrollEdgeFadeOverlays fromTop={scrollEdges.fromTop} fromBottom={false} />
      <div ref={scrollPanelRef} className="batch-totals-scroll-panel flex flex-col">
        <div className="batch-totals-scroll-panel__inner session-overview__mix-list">
          <header className="session-overview__stage-intro">
            <h2 style={{ color: cv.text.primary, margin: 0 }}>Summary</h2>
            <p style={{ color: cv.text.muted, margin: 0 }}>
              Check the job package, then save or share from the dock.
            </p>
          </header>

          <div
            className="session-overview__summary-snapshot"
            aria-label="Session snapshot"
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
                <strong>{batches.length}</strong>{" "}
                {batches.length === 1 ? "mix" : "mixes"}
              </span>
              <span aria-hidden>·</span>
              <span>
                <strong>{toolCount}</strong>{" "}
                {toolCount === 1 ? "tool" : "tools"}
              </span>
              <span aria-hidden>·</span>
              <span>
                <strong>{consumableCount}</strong>{" "}
                {consumableCount === 1 ? "consumable" : "consumables"}
              </span>
            </div>
          </div>

          <section className="session-overview__summary-section" aria-labelledby="summary-mixes-heading">
            <div className="session-overview__summary-section-head">
              <h3 id="summary-mixes-heading">Mixes</h3>
              <span className="session-overview__summary-section-count">
                {batches.length}
              </span>
            </div>
            {batches.length === 0 ? (
              <p className="session-overview__summary-empty" style={{ color: cv.text.dimmed }}>
                No mixes yet — add them in the Mixes stage.
              </p>
            ) : (
              <ul className="session-overview__summary-mixes">
                {batches.map((batch) => {
                  const recipe = resolveRecipe(batch.id);
                  const total = sessionGrandTotalGrams([batch]);
                  return (
                    <li key={batch.id} className="session-overview__summary-mix-row">
                      <button
                        type="button"
                        className="session-overview__summary-mix-btn"
                        onClick={() => onEditMix(batch.id)}
                      >
                        <span className="session-overview__summary-mix-name">
                          {batch.name}
                        </span>
                        <span
                          className="session-overview__summary-mix-meta"
                          style={{ color: cv.text.muted }}
                        >
                          {batch.recipeName ||
                            (recipe ? recipeMenuLabel(recipe) : batch.recipeId)}
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
              <h3 id="summary-tools-heading">Tools</h3>
              <span className="session-overview__summary-section-count">
                {toolCount}
              </span>
            </div>
            {selectedToolLabels.length > 0 ? (
              <div className="session-overview__summary-chips" aria-label="Selected tools">
                {selectedToolLabels.map((label) => (
                  <span key={label} className="session-overview__summary-chip">
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="session-overview__summary-empty" style={{ color: cv.text.dimmed }}>
                None selected — add them in Tools, or continue without.
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
              Open Tools
            </button>
          </section>

          <section
            className="session-overview__summary-section"
            aria-labelledby="summary-cons-heading"
          >
            <div className="session-overview__summary-section-head">
              <h3 id="summary-cons-heading">Consumables</h3>
              <span className="session-overview__summary-section-count">
                {consumableCount}
              </span>
            </div>
            {selectedConsumableLabels.length > 0 ? (
              <div
                className="session-overview__summary-chips"
                aria-label="Selected consumables"
              >
                {selectedConsumableLabels.map((label) => (
                  <span key={label} className="session-overview__summary-chip">
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="session-overview__summary-empty" style={{ color: cv.text.dimmed }}>
                None selected — add them in Consumables, or continue without.
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
              Open Consumables
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
          <ToolsPicker
            selection={selectedToolQtys}
            onSelectionChange={(next) => {
              if (!session) return;
              patchSession(session.id, { selectedToolQtys: next });
            }}
            customTools={customTools}
            onAddCustomTool={(item) => {
              if (!session) return;
              patchSession(session.id, {
                customTools: [...customTools, item],
                selectedToolQtys: ensureFlexSelectSelected(
                  selectedToolQtys,
                  item.id,
                ),
              });
            }}
          />
        </div>
      </div>
    </div>
  );

  const consumablesMain = (
    <div className="scroll-edge-fade-viewport batch-totals-scroll-fade-viewport flex flex-col">
      <div className="batch-totals-scroll-panel flex flex-col">
        <div className="batch-totals-scroll-panel__inner session-overview__tools-pad app-gutter-x">
          <ConsumablesPicker
            selection={selectedConsumableQtys}
            onSelectionChange={(next) => {
              if (!session) return;
              patchSession(session.id, { selectedConsumableQtys: next });
            }}
            customConsumables={customConsumables}
            onAddCustomConsumable={(item) => {
              if (!session) return;
              patchSession(session.id, {
                customConsumables: [...customConsumables, item],
                selectedConsumableQtys: ensureFlexSelectSelected(
                  selectedConsumableQtys,
                  item.id,
                ),
              });
            }}
          />
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
            title="Session"
            onMenuClick={onMenuClick}
            onBack={onBack}
            backLabel="Back to sessions"
            backConfirmAction="BACK TO SESSIONS"
            onForward={nextStage ? goNextStage : undefined}
            forwardConfirmAction="NEXT STAGE"
            sessionChrome
          />

          <div className="batch-totals-screen flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden relative">
            <div className="batch-totals-screen__main flex flex-col">
              <div className="session-overview__chrome">
                <div className="session-overview__context app-gutter-x">
                  <button
                    type="button"
                    className="session-overview__name-field"
                    onClick={() => setRenameNameOpen(true)}
                    aria-label={`Rename session, ${session.name}`}
                  >
                    <span className="session-overview__context-name">{session.name}</span>
                    <span className="session-overview__name-edit" aria-hidden>
                      <RenameIcon size={14} />
                    </span>
                  </button>
                </div>
                <nav className="session-overview__stages app-gutter-x" aria-label="Session stages">
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
                    return (
                      <button
                        key={stageId}
                        type="button"
                        className={`session-overview__stage-btn${
                          active ? " session-overview__stage-btn--active" : ""
                        }${complete && !active ? " session-overview__stage-btn--complete" : ""}${
                          inShare ? " session-overview__stage-btn--in-share" : ""
                        }${isNext && !active ? " session-overview__stage-btn--next" : ""}`}
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
                        <span className="session-overview__stage-index" aria-hidden>
                          {complete ? (
                            <Check size={12} strokeWidth={2.5} />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span className="session-overview__stage-label">
                          {SESSION_STAGE_CARD_LABELS[stageId]}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {stageMain}

              <SessionBottomPanel
                mixCount={batches.length}
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
        onConfirm={handleSaveConfirm}
      />

      <SaveSessionNameSheet
        open={renameNameOpen}
        onOpenChange={setRenameNameOpen}
        initialName={session.name}
        title="Rename session"
        subtitle="Update the name shown in your session list."
        confirmLabel="Rename"
        onConfirm={(name) => patchSession(session.id, { name })}
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
