import { useMemo, useState } from "react";
import { CirclePlay } from "lucide-react";
import { useTickingNow } from "../../hooks/useTickingNow";
import { getHumanSavedTime } from "../../saved-mixes/humanSavedTime";
import { useSessionsStore } from "../../sessions/store";
import {
  SESSION_STAGE_CARD_LABELS,
  isSessionStageComplete,
  sessionCardTitle,
  sessionStageAmountLabel,
} from "../../domain/sessions/stages";
import type { MixSession } from "../../sessions/types";
import { SESSION_STAGE_ORDER } from "../../sessions/types";
import { cv } from "../../ui/tokens";
import { DeleteIcon, RenameIcon } from "../shared/ActionIcons";
import { PageSearchField } from "../shared/PageSearchField";
import { SHEET_LIST_ROW_CLASS } from "../sheets/sheetChrome";
import { SaveSessionNameSheet } from "../sessions/SaveSessionNameSheet";
import { DestinationPageChrome } from "./DestinationPageChrome";

const ACTION_ICON = 18;
const PLAY_ICON = 30;

function SessionStageSteps({ session }: { session: MixSession }) {
  return (
    <ol className="sessions-page__stages" aria-label="Session stages">
      {SESSION_STAGE_ORDER.map((stageId, index) => {
        const done = isSessionStageComplete(session, stageId);
        const active = session.activeStage === stageId && !done;
        const label = SESSION_STAGE_CARD_LABELS[stageId];
        const amount = sessionStageAmountLabel(session, stageId);
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
              !isLast && done ? " sessions-page__stage--link-ahead" : ""
            }`}
            aria-label={
              done
                ? `${label}, ${amount}, complete`
                : active
                  ? `${label}, ${amount}, current step`
                  : `${label}, ${amount}`
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
            {!isLast ? (
              <span className="sessions-page__stage-connector" aria-hidden />
            ) : null}
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
  const savedTime = getHumanSavedTime(new Date(session.updatedAt), now);

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
              {sessionCardTitle(session)}
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
              aria-label="Edit session name"
              onClick={onRename}
            >
              <RenameIcon size={ACTION_ICON} />
            </button>
            <button
              type="button"
              className="sessions-page__card-action sessions-page__card-action--danger"
              aria-label="Delete session"
              onClick={onDelete}
            >
              <DeleteIcon size={ACTION_ICON} />
            </button>
            <button
              type="button"
              className="sessions-page__card-action sessions-page__card-action--play"
              aria-label="Open session"
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
  const sessions = useSessionsStore((s) => s.sessions);
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const createSession = useSessionsStore((s) => s.createSession);
  const setActiveSession = useSessionsStore((s) => s.setActiveSession);
  const deleteSession = useSessionsStore((s) => s.deleteSession);
  const patchSession = useSessionsStore((s) => s.patchSession);
  const [query, setQuery] = useState("");
  const [renameSession, setRenameSession] = useState<MixSession | null>(null);
  const now = useTickingNow(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.name.toLowerCase().includes(q));
  }, [sessions, query]);

  const handleNewSession = () => {
    const session = createSession();
    onOpenSession?.(session.id);
  };

  const openSession = (session: MixSession) => {
    setActiveSession(session.id);
    onOpenSession?.(session.id);
  };

  return (
    <DestinationPageChrome
      title="Sessions"
      onMenuClick={onMenuClick}
      embedded={embedded}
    >
      <button
        type="button"
        className="destination-page__primary-btn destination-page__primary-btn--session"
        onClick={handleNewSession}
      >
        + New session
      </button>

      <PageSearchField
        placeholder="Search sessions…"
        value={query}
        onChange={setQuery}
      />

      {sessions.length === 0 ? (
        <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
          No sessions yet. Start with + New session.
        </p>
      ) : filtered.length === 0 ? (
        <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
          No sessions match “{query.trim()}”.
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
                  if (window.confirm(`Delete “${session.name}”?`)) {
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
        title="Rename session"
        subtitle="Update the name shown in your session list."
        confirmLabel="Save"
        onConfirm={(name) => {
          if (!renameSession) return;
          patchSession(renameSession.id, { name });
          setRenameSession(null);
        }}
      />
    </DestinationPageChrome>
  );
}
