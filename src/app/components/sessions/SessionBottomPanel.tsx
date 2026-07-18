import {
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { formatMixAmount, MIX_PARAMS } from "../../domain/mix/entities";
import {
  CARD_NAME_WEIGHT,
  entityValueColor,
} from "../../presentation/entityCardStyles";
import { entityAccentColor } from "../../presentation/entityAccent";
import type { ColorScheme } from "../../../theme/appearance";
import type { BlendingRecipe } from "../../domain/recipe/types";
import type { SessionShareScope } from "../../domain/sessions/shareScope";
import type { MixSession, SessionStageId } from "../../sessions/types";
import { SESSION_STAGE_LABELS } from "../../sessions/types";
import { cv } from "../../ui/tokens";
import { InventoryStageSummaryBar } from "../shell/InventoryStageSummaryBar";
import { StageBottomSheet } from "../shell/StageBottomSheet";
import { SessionShareBar } from "./SessionShareBar";

function AmountCell({
  grams,
  isKg,
  colorScheme,
}: {
  grams: number;
  isKg: boolean;
  colorScheme: ColorScheme;
}) {
  const unit = isKg ? "kg" : "g";
  return (
    <span
      className="app-readout tabular-nums whitespace-nowrap"
      style={{ color: entityValueColor(true, colorScheme) }}
    >
      {formatMixAmount(grams, isKg)}
      <span
        style={{
          color: cv.text.muted,
          fontWeight: 500,
          marginLeft: 3,
          fontSize: "var(--text-totals-unit)",
        }}
      >
        {unit}
      </span>
    </span>
  );
}

function StatusLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: "var(--text-totals-table)",
        fontWeight: 500,
        letterSpacing: "0.12em",
        lineHeight: 1.2,
        textTransform: "uppercase",
        color: cv.text.dimmed,
        padding: "0 var(--totals-section-title-pad-x)",
      }}
    >
      {children}
    </span>
  );
}

function StatusValue({
  children,
  colorScheme,
  accentId,
}: {
  children: ReactNode;
  colorScheme: ColorScheme;
  accentId?: string;
}) {
  return (
    <span
      className="app-readout tabular-nums whitespace-nowrap shrink-0"
      style={{
        fontSize: "var(--text-totals-sum)",
        color: accentId
          ? entityAccentColor(accentId, colorScheme)
          : entityValueColor(true, colorScheme),
        fontWeight: 700,
        lineHeight: 1.1,
      }}
    >
      {children}
    </span>
  );
}

function SummaryCount({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={`tabular-nums shrink-0 batch-totals-summary-bar__count${
        className ? ` ${className}` : ""
      }`}
    >
      ×{value}
    </span>
  );
}

function SessionSummaryBar({
  stage,
  sessionStatus,
  mixCount,
  totalGrams,
  toolCount = 0,
  consumableCount = 0,
  colorScheme,
  compactSummaryRef,
  batchesRelocated = false,
}: {
  stage: SessionStageId;
  sessionStatus: MixSession["status"];
  mixCount: number;
  totalGrams: number;
  toolCount?: number;
  consumableCount?: number;
  colorScheme: ColorScheme;
  compactSummaryRef: RefObject<HTMLDivElement | null>;
  batchesRelocated?: boolean;
}) {
  const totalParam = MIX_PARAMS[0];

  if (stage === "summary") {
    const saved = sessionStatus === "saved";
    return (
      <div className="min-w-0 w-full batch-totals-summary-bar">
        <div className="batch-totals-summary-bar__card w-full min-w-0 flex flex-col min-h-0">
          <div
            ref={compactSummaryRef}
            className="grid items-center min-w-0 w-full batch-totals-summary-bar__grid batch-totals-summary-bar__compact batch-totals-summary-bar__compact--status"
            style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
          >
            <div className="batch-totals-summary-bar__batch-rows min-w-0">
              <div className="batch-totals-summary-bar__batch-row min-w-0">
                <span
                  className="batch-totals-summary-bar__status-message truncate min-w-0"
                  data-saved={saved ? "" : undefined}
                >
                  {saved ? "Saved" : "Ready to save or share"}
                </span>
              </div>
            </div>
            <div className="batch-totals-summary-bar__total batch-totals-summary-bar__total--status">
              <span className="batch-totals-summary-bar__metric-unit">
                Pull up for details
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "consumption-tools" || stage === "consumables") {
    const count =
      stage === "consumption-tools" ? toolCount : consumableCount;
    return (
      <InventoryStageSummaryBar
        label={SESSION_STAGE_LABELS[stage]}
        count={count}
        nounSingular={stage === "consumption-tools" ? "tool" : "item"}
        nounPlural={stage === "consumption-tools" ? "tools" : "items"}
        colorScheme={colorScheme}
        compactSummaryRef={compactSummaryRef}
      />
    );
  }

  const left =
    batchesRelocated && stage === "mixes" ? (
      <div className="batch-totals-summary-bar__total-label min-w-0 flex items-center">
        <StatusValue colorScheme={colorScheme} accentId={totalParam.id}>
          {totalParam.id}
        </StatusValue>
      </div>
    ) : (
      <div className="batch-totals-summary-bar__batch-rows min-w-0">
        <div className="batch-totals-summary-bar__batch-row">
          <StatusLabel>{SESSION_STAGE_LABELS[stage]}</StatusLabel>
          <SummaryCount value={mixCount} />
        </div>
      </div>
    );

  const right = (
    <div className="batch-totals-summary-bar__total batch-totals-summary-bar__total--mass">
      {!batchesRelocated ? (
        <span
          className="batch-totals-summary-bar__metric-label batch-totals-summary-bar__metric-label--accent truncate shrink-0"
          style={{
            color: entityAccentColor(totalParam.id, colorScheme),
            fontWeight: CARD_NAME_WEIGHT,
            letterSpacing: "0.18em",
            fontSize: "var(--text-card-name)",
          }}
        >
          {totalParam.id}
        </span>
      ) : null}
      <StatusValue colorScheme={colorScheme}>
        <AmountCell
          grams={totalGrams}
          isKg={totalParam.isKg}
          colorScheme={colorScheme}
        />
      </StatusValue>
    </div>
  );

  return (
    <div className="min-w-0 w-full batch-totals-summary-bar">
      <div className="batch-totals-summary-bar__card w-full min-w-0 flex flex-col min-h-0">
        <div
          ref={compactSummaryRef}
          className={`grid items-center min-w-0 w-full batch-totals-summary-bar__grid batch-totals-summary-bar__compact${
            batchesRelocated && stage === "mixes"
              ? " batch-totals-summary-bar__compact--total-only"
              : ""
          }`}
          style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}
        >
          {left}
          {right}
        </div>
      </div>
    </div>
  );
}

export function SessionBottomPanel({
  mixCount,
  totalGrams,
  colorScheme,
  sourceExpanded,
  onSourceExpandedChange,
  expandedBody,
  session,
  libraryRecipes,
  shareScope,
  onShareScopeChange,
  onSaveSession,
  saveFlash = false,
  toolCount = 0,
  consumableCount = 0,
}: {
  mixCount: number;
  totalGrams: number;
  colorScheme: ColorScheme;
  sourceExpanded: boolean;
  onSourceExpandedChange: (next: boolean) => void;
  expandedBody: ReactNode;
  session: MixSession;
  libraryRecipes: BlendingRecipe[];
  shareScope: SessionShareScope;
  onShareScopeChange: (scope: SessionShareScope) => void;
  onSaveSession?: () => void;
  saveFlash?: boolean;
  toolCount?: number;
  consumableCount?: number;
}) {
  const compactSummaryRef = useRef<HTMLDivElement>(null);

  return (
    <StageBottomSheet
      panelId="session-bottom-panel"
      regionLabel="Session summary"
      expandedBodyLabel="Session summary — total per ingredient"
      sourceExpanded={sourceExpanded}
      onSourceExpandedChange={onSourceExpandedChange}
      remeasureKey={`${session.activeStage}:${mixCount}:${toolCount}:${consumableCount}:${shareScope}:${session.updatedAt}`}
      summary={({ batchesRelocated }) => (
        <SessionSummaryBar
          stage={session.activeStage}
          sessionStatus={session.status}
          mixCount={mixCount}
          totalGrams={totalGrams}
          toolCount={toolCount}
          consumableCount={consumableCount}
          colorScheme={colorScheme}
          compactSummaryRef={compactSummaryRef}
          batchesRelocated={batchesRelocated}
        />
      )}
      shareActions={
        <SessionShareBar
          session={session}
          libraryRecipes={libraryRecipes}
          shareScope={shareScope}
          onShareScopeChange={onShareScopeChange}
          onSave={onSaveSession}
          saveFlash={saveFlash}
        />
      }
      expandedBody={expandedBody}
    />
  );
}
