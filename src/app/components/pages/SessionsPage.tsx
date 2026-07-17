import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { CirclePlay, Search } from "lucide-react";
import { useTickingNow } from "../../hooks/useTickingNow";
import { getHumanSavedTime } from "../../saved-mixes/humanSavedTime";
import { useSessionsStore } from "../../sessions/store";
import {
  SESSION_STAGE_CARD_LABELS,
  isSessionStageComplete,
  sessionStageAmountLabel,
} from "../../domain/sessions/stages";
import type { MixSession } from "../../sessions/types";
import { SESSION_STAGE_ORDER } from "../../sessions/types";
import { cv } from "../../ui/tokens";
import {
  CollapseActionsIcon,
  DeleteIcon,
  ExpandActionsIcon,
  RenameIcon,
} from "../shared/ActionIcons";
import { SHEET_LIST_ROW_CLASS } from "../sheets/sheetChrome";
import { SaveSessionNameSheet } from "../sessions/SaveSessionNameSheet";
import { DestinationPageChrome } from "./DestinationPageChrome";

const strip = cv.loadSheetStrip;
const STRIP_PANEL_BG = strip.panelBackground;
const STRIP_DIVIDER = strip.divider;
const ACTION_ICON = 16;
const SWIPE_PANEL_CLOSED_W = 52;
const SWIPE_PANEL_OPEN_W = 104;

const stripCellBase: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  minWidth: 0,
  borderRadius: 0,
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function SessionStageSteps({ session }: { session: MixSession }) {
  return (
    <div className="sessions-page__flow" aria-label="Session stages">
      <ol className="sessions-page__steps">
        {SESSION_STAGE_ORDER.map((stageId, index) => {
          const done = isSessionStageComplete(session, stageId);
          const nextId = SESSION_STAGE_ORDER[index + 1];
          const nextDone =
            nextId != null && isSessionStageComplete(session, nextId);
          const step = index + 1;
          const label = SESSION_STAGE_CARD_LABELS[stageId];
          const isLast = index === SESSION_STAGE_ORDER.length - 1;
          return (
            <li
              key={stageId}
              className={`sessions-page__step${done ? " sessions-page__step--done" : ""}${
                !isLast && done && nextDone ? " sessions-page__step--link-done" : ""
              }`}
            >
              <span
                className="sessions-page__step-chip"
                aria-label={done ? `${label}, complete` : `${label}, step ${step}`}
              >
                <span className="sessions-page__step-chip-text">
                  {step}.{label}
                </span>
              </span>
              {!isLast ? <span className="sessions-page__step-h-line" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
      <ul className="sessions-page__amounts" aria-label="Stage amounts">
        {SESSION_STAGE_ORDER.map((stageId, index) => {
          const amount = sessionStageAmountLabel(session, stageId);
          const done = isSessionStageComplete(session, stageId);
          const nextId = SESSION_STAGE_ORDER[index + 1];
          const nextDone =
            nextId != null && isSessionStageComplete(session, nextId);
          const isLast = index === SESSION_STAGE_ORDER.length - 1;
          return (
            <li
              key={stageId}
              className={`sessions-page__amount${done ? " sessions-page__amount--done" : ""}${
                !isLast && done && nextDone ? " sessions-page__amount--link-done" : ""
              }`}
            >
              <span className="sessions-page__amount-value">{amount}</span>
              {!isLast ? (
                <span className="sessions-page__amount-h-line" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SessionSwipeStrip({
  open,
  onToggle,
  onOpen,
  onRename,
  onDelete,
}: {
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const cellR1C1: CSSProperties = {
    ...stripCellBase,
    borderRight: STRIP_DIVIDER,
    borderBottom: STRIP_DIVIDER,
    color: open ? strip.renameColor : strip.mutedColor,
    background: open ? strip.moreOpen : strip.neutral,
  };
  const cellR1C2: CSSProperties = {
    ...stripCellBase,
    borderRight: "none",
    borderBottom: STRIP_DIVIDER,
    background: strip.delete,
    color: strip.deleteColor,
  };
  const cellR2C1: CSSProperties = {
    ...stripCellBase,
    borderRight: open ? STRIP_DIVIDER : "none",
    borderBottom: "none",
    background: strip.open,
    color: "var(--session-accent)",
  };
  const cellR2C2: CSSProperties = {
    ...stripCellBase,
    background: strip.rename,
    color: strip.renameColor,
  };

  return (
    <div
      role="group"
      aria-label="Session actions"
      className={`saved-mix-swipe-panel absolute inset-y-0 right-0 min-h-0 ${
        open ? "saved-mix-swipe-panel--open" : "saved-mix-swipe-panel--closed"
      }`}
      style={{
        width: open ? SWIPE_PANEL_OPEN_W : SWIPE_PANEL_CLOSED_W,
        borderLeft: STRIP_DIVIDER,
        background: STRIP_PANEL_BG,
        zIndex: 2,
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close actions" : "More actions"}
        className="saved-mix-swipe-cell saved-mix-swipe-cell--r1c1 transition-colors duration-150"
        style={cellR1C1}
        onClick={onToggle}
      >
        {open ? (
          <CollapseActionsIcon size={ACTION_ICON} />
        ) : (
          <ExpandActionsIcon size={ACTION_ICON} />
        )}
      </button>

      {open ? (
        <button
          type="button"
          aria-label="Delete"
          className="saved-mix-swipe-cell saved-mix-swipe-cell--r1c2 h-full w-full shrink-0 rounded-none transition-colors duration-150"
          style={cellR1C2}
          onClick={onDelete}
        >
          <DeleteIcon size={ACTION_ICON} />
        </button>
      ) : null}

      <button
        type="button"
        aria-label="Open"
        className="saved-mix-swipe-cell saved-mix-swipe-cell--r2c1 h-full w-full shrink-0 rounded-none transition-colors duration-150"
        style={cellR2C1}
        onClick={onOpen}
      >
        <CirclePlay size={ACTION_ICON} strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <button
          type="button"
          aria-label="Rename"
          className="saved-mix-swipe-cell saved-mix-swipe-cell--r2c2 transition-colors duration-150"
          style={cellR2C2}
          onClick={onRename}
        >
          <RenameIcon size={ACTION_ICON} />
        </button>
      ) : null}
    </div>
  );
}

function SessionCard({
  session,
  active,
  now,
  moreMenuOpen,
  onMoreMenuOpenChange,
  onOpen,
  onDelete,
  onRename,
}: {
  session: MixSession;
  active: boolean;
  now: Date;
  moreMenuOpen: boolean;
  onMoreMenuOpenChange: (open: boolean) => void;
  onOpen: () => void;
  onDelete: () => void;
  onRename: () => void;
}) {
  const savedTime = getHumanSavedTime(new Date(session.updatedAt), now);

  return (
    <article
      className={`${SHEET_LIST_ROW_CLASS} sessions-page__card rounded-2xl min-w-0 overflow-hidden relative${
        active ? " sessions-page__card--active" : ""
      }`}
    >
      <div className="sessions-page__card-grid min-w-0">
        <div className="sessions-page__card-head min-w-0">
          <p className="sessions-page__card-title truncate min-w-0">{session.name}</p>
          <p className="sessions-page__card-time shrink-0 tabular-nums">
            {savedTime.comment ? (
              <>
                <span>{savedTime.comment}</span>
                <span aria-hidden> · </span>
              </>
            ) : null}
            <span className="sessions-page__card-timestamp">{savedTime.timestamp}</span>
          </p>
        </div>
        <SessionStageSteps session={session} />
      </div>

      <SessionSwipeStrip
        open={moreMenuOpen}
        onToggle={() => onMoreMenuOpenChange(!moreMenuOpen)}
        onOpen={onOpen}
        onRename={() => {
          onRename();
          onMoreMenuOpenChange(false);
        }}
        onDelete={() => {
          onDelete();
          onMoreMenuOpenChange(false);
        }}
      />
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
  const [moreMenuSessionId, setMoreMenuSessionId] = useState<string | null>(null);
  const [renameSession, setRenameSession] = useState<MixSession | null>(null);
  const now = useTickingNow(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.name.toLowerCase().includes(q));
  }, [sessions, query]);

  useEffect(() => {
    setMoreMenuSessionId(null);
  }, [query]);

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

      <label className="sessions-page__search">
        <Search size={18} strokeWidth={2} aria-hidden />
        <input
          type="search"
          className="sessions-page__search-input"
          placeholder="Search sessions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
        />
      </label>

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
            <li key={session.id}>
              <SessionCard
                session={session}
                active={session.id === activeSessionId}
                now={now}
                moreMenuOpen={moreMenuSessionId === session.id}
                onMoreMenuOpenChange={(open) =>
                  setMoreMenuSessionId(open ? session.id : null)
                }
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
