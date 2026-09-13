import { useMemo, useState } from "react";
import { CirclePlay } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTickingNow } from "../../hooks/useTickingNow";
import { getHumanSavedTime } from "../../saved-mixes/humanSavedTime";
import { useSessionsStore } from "../../sessions/store";
import { useSettingsStore } from "../../settings/store";
import {
  isSessionStageComplete,
  sessionCardShowsDraftHint,
  sessionCardTitle,
  sessionOrderNumber,
  sessionStageAmountLabel,
} from "../../domain/sessions/stages";
import { sessionMatchesHubDateFilter } from "../../domain/sessions/workDate";
import type { MixSession, SessionStageId } from "../../sessions/types";
import { SESSION_STAGE_ORDER } from "../../sessions/types";
import { cv } from "../../ui/tokens";
import { CatalogReportDateBar } from "../catalog/CatalogReportDateBar";
import { DeleteIcon, FilterIcon, RenameIcon } from "../shared/ActionIcons";
import { PageSearchField } from "../shared/PageSearchField";
import { SHEET_LIST_ROW_CLASS } from "../sheets/sheetChrome";
import { SaveSessionNameSheet } from "../sessions/SaveSessionNameSheet";
import { DestinationPageChrome } from "./DestinationPageChrome";

const ACTION_ICON = 18;
const PLAY_ICON = 30;
const DATE_FILTER_ICON = 14;
const SHEET_CONFIRM_ICON = 18;

function stageShortKey(stageId: SessionStageId): string {
  return `sessions.stageShort.${stageId}`;
}

function SessionStageSteps({ session }: { session: MixSession }) {
  const { t } = useTranslation("common");
  return (
    <ol className="sessions-page__stages" aria-label={t("sessions.stagesAria")}>
      {SESSION_STAGE_ORDER.map((stageId, index) => {
        const done = isSessionStageComplete(session, stageId);
        const active = session.activeStage === stageId && !done;
        const label = t(stageShortKey(stageId));
        const rawAmount = sessionStageAmountLabel(session, stageId);
        const amount =
          stageId === "summary"
            ? rawAmount === "Saved"
              ? t("sessions.saved")
              : t("sessions.draft")
            : rawAmount;
        const isFirst = index === 0;
        const isLast = index === SESSION_STAGE_ORDER.length - 1;
        const stateClass = done
          ? " sessions-page__stage--done"
          : active
            ? " sessions-page__stage--active"
            : "";
        return (
          <li
            key={stageId}
            className={`sessions-page__stage${stateClass}${
              isFirst ? " sessions-page__stage--first" : ""
            }${isLast ? " sessions-page__stage--last" : ""}`}
            style={{ zIndex: SESSION_STAGE_ORDER.length - index }}
            aria-label={
              done
                ? t("sessions.stageComplete", { label, amount })
                : active
                  ? t("sessions.stageCurrent", { label, amount })
                  : t("sessions.stageAmount", { label, amount })
            }
          >
            <span className="sessions-page__stage-name">{label}</span>
            <span
              className={`sessions-page__stage-amount${
                stageId === "summary" ? " sessions-page__stage-amount--status" : ""
              }`}
            >
              {amount}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SessionCard({
  session,
  active,
  now,
  onOpen,
  onDelete,
  onRename,
}: {
  session: MixSession;
  active: boolean;
  now: Date;
  onOpen: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const { t } = useTranslation("common");
  const uiLanguage = useSettingsStore((s) => s.uiLanguage);
  const orderNumber = sessionOrderNumber(session);
  const savedTime = getHumanSavedTime(
    new Date(session.updatedAt),
    now,
    uiLanguage,
  );

  return (
    <article
      className={`${SHEET_LIST_ROW_CLASS} sessions-page__card w-full min-w-0 overflow-hidden relative${
        active ? " sessions-page__card--active" : ""
      }`}
    >
      <div className="sessions-page__card-grid w-full min-w-0">
        <div className="sessions-page__card-head min-w-0">
          <div className="sessions-page__card-meta min-w-0">
            <p className="sessions-page__card-title truncate min-w-0">
              <span className="sessions-page__card-title-text truncate min-w-0">
                {sessionCardTitle(session)}
              </span>
              {sessionCardShowsDraftHint(session) ? (
                <span className="sessions-page__card-draft">
                  {t("sessions.draft")}
                </span>
              ) : null}
            </p>
            <p
              className="sessions-page__card-order truncate min-w-0"
              aria-hidden={orderNumber ? undefined : true}
            >
              {orderNumber || "\u00A0"}
            </p>
            <p className="sessions-page__card-time tabular-nums">
              {savedTime.comment ? (
                <>
                  <span>{savedTime.comment}</span>
                  <span aria-hidden> · </span>
                </>
              ) : null}
              <span className="sessions-page__card-timestamp">
                {savedTime.timestamp}
              </span>
            </p>
          </div>

          <div className="sessions-page__card-actions">
            <button
              type="button"
              className="sessions-page__card-action"
              aria-label={t("sessions.editName")}
              onClick={onRename}
            >
              <RenameIcon size={ACTION_ICON} />
            </button>
            <button
              type="button"
              className="sessions-page__card-action sessions-page__card-action--danger"
              aria-label={t("sessions.deleteSession")}
              onClick={onDelete}
            >
              <DeleteIcon size={ACTION_ICON} />
            </button>
            <button
              type="button"
              className="sessions-page__card-action sessions-page__card-action--play"
              aria-label={t("sessions.openSession")}
              onClick={onOpen}
            >
              <CirclePlay size={PLAY_ICON} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
        <SessionStageSteps session={session} />
      </div>
    </article>
  );
}

/** Sessions hub — project list; open a session to work mixes. */
export function SessionsPage({
  onMenuClick,
  onOpenSession,
  embedded = false,
}: {
  onMenuClick: () => void;
  onOpenSession?: (sessionId: string) => void;
  embedded?: boolean;
}) {
  const { t } = useTranslation("common");
  const sessions = useSessionsStore((s) => s.sessions);
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const createSession = useSessionsStore((s) => s.createSession);
  const setActiveSession = useSessionsStore((s) => s.setActiveSession);
  const deleteSession = useSessionsStore((s) => s.deleteSession);
  const patchSession = useSessionsStore((s) => s.patchSession);
  const [query, setQuery] = useState("");
  const [filterDateId, setFilterDateId] = useState<string | null>(null);
  const [renameSession, setRenameSession] = useState<MixSession | null>(null);
  const now = useTickingNow(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      if (filterDateId && !sessionMatchesHubDateFilter(s, filterDateId)) {
        return false;
      }
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sessions, query, filterDateId]);

  const handleNewSession = () => {
    const session = createSession();
    onOpenSession?.(session.id);
  };

  const openSession = (session: MixSession) => {
    setActiveSession(session.id);
    onOpenSession?.(session.id);
  };

  const emptyFilterMessage = (() => {
    const q = query.trim();
    if (filterDateId && q) {
      return t("sessions.noMatchQueryDate", { query: q });
    }
    if (filterDateId) return t("sessions.noMatchDate");
    if (q) return t("sessions.noMatchQuery", { query: q });
    return t("sessions.noMatch");
  })();

  return (
    <DestinationPageChrome
      title={t("sessions.title")}
      onMenuClick={onMenuClick}
      embedded={embedded}
    >
      <button
        type="button"
        className="destination-page__primary-btn destination-page__primary-btn--session"
        onClick={handleNewSession}
      >
        {t("sessions.new")}
      </button>

      <PageSearchField
        placeholder={t("sessions.search")}
        value={query}
        onChange={setQuery}
      />

      <CatalogReportDateBar
        className="sessions-page__date-bar"
        workDateId={filterDateId}
        onWorkDateChange={setFilterDateId}
        ariaLabel={t("sessions.filterAria")}
        emptyLabel={t("sessions.filterEmpty")}
        changeTitle={t("sessions.filterChange")}
        formatSelectedLabel={(date) => t("sessions.filterSelected", { date })}
        leadingIcon={<FilterIcon size={DATE_FILTER_ICON} />}
        confirmIcon={<FilterIcon size={SHEET_CONFIRM_ICON} />}
        confirmLabel={t("sessions.filterApply")}
        pickerSubtitle={t("sessions.filterSubtitle")}
      />

      {sessions.length === 0 ? (
        <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
          {t("sessions.empty")}
        </p>
      ) : filtered.length === 0 ? (
        <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
          {emptyFilterMessage}
        </p>
      ) : (
        <ul className="sessions-page__list">
          {filtered.map((session) => (
            <li key={session.id} className="sessions-page__list-item">
              <SessionCard
                session={session}
                active={session.id === activeSessionId}
                now={now}
                onOpen={() => openSession(session)}
                onDelete={() => {
                  if (
                    window.confirm(
                      t("sessions.confirmDelete", { name: session.name }),
                    )
                  ) {
                    deleteSession(session.id);
                  }
                }}
                onRename={() => setRenameSession(session)}
              />
            </li>
          ))}
        </ul>
      )}

      <SaveSessionNameSheet
        open={renameSession != null}
        onOpenChange={(open) => {
          if (!open) setRenameSession(null);
        }}
        initialName={renameSession?.name ?? ""}
        initialOrderNumber={renameSession?.orderNumber ?? ""}
        title={t("sessions.renameTitle")}
        subtitle={t("sessions.renameSubtitle")}
        confirmLabel={t("common.save")}
        onConfirm={(name, orderNumber) => {
          if (!renameSession) return;
          patchSession(renameSession.id, {
            name,
            orderNumber: orderNumber || undefined,
          });
          setRenameSession(null);
        }}
      />
    </DestinationPageChrome>
  );
}
