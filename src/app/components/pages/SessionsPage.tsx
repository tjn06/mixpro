import { recipeMenuLabel } from "../../domain/recipe/types";
import { formatRecipeFormulaSummary } from "../../domain/recipe/createFromInputs";
import { useSessionsStore } from "../../sessions/store";
import {
  SESSION_STAGE_LABELS,
  SESSION_STAGE_ORDER,
} from "../../sessions/types";
import { DestinationPageChrome } from "./DestinationPageChrome";
import { cv } from "../../ui/tokens";

function formatUpdatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SessionsPage({
  onMenuClick,
  onCreateRecipe,
  onOpenSession,
  embedded = false,
}: {
  onMenuClick: () => void;
  onCreateRecipe?: () => void;
  onOpenSession?: (sessionId: string) => void;
  embedded?: boolean;
}) {
  const sessions = useSessionsStore((s) => s.sessions);
  const activeSessionId = useSessionsStore((s) => s.activeSessionId);
  const createSession = useSessionsStore((s) => s.createSession);
  const setActiveSession = useSessionsStore((s) => s.setActiveSession);
  const deleteSession = useSessionsStore((s) => s.deleteSession);
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const sessionRecipes = activeSession?.sessionRecipes ?? [];

  const handleNewSession = () => {
    const session = createSession();
    onOpenSession?.(session.id);
  };

  return (
    <DestinationPageChrome
      title="Sessions"
      onMenuClick={onMenuClick}
      embedded={embedded}
    >
      <div className="destination-page__stack">
        <button
          type="button"
          className="destination-page__primary-btn"
          onClick={handleNewSession}
        >
          + New session
        </button>

        {activeSession && onOpenSession ? (
          <button
            type="button"
            className="create-recipe__secondary-btn"
            onClick={() => onOpenSession(activeSession.id)}
          >
            Open mixes — {activeSession.name}
          </button>
        ) : null}

        {activeSession && onCreateRecipe ? (
          <button
            type="button"
            className="create-recipe__secondary-btn"
            onClick={onCreateRecipe}
          >
            + Create recipe for session
          </button>
        ) : null}

        <p className="destination-page__lede" style={{ color: cv.text.muted }}>
          Project containers for multiple mixes. Open a session to add mixes,
          share, and save.
        </p>

        {sessions.length === 0 ? (
          <p className="destination-page__empty" style={{ color: cv.text.dimmed }}>
            No sessions yet.
          </p>
        ) : (
          <ul className="destination-page__list">
            {sessions.map((session) => {
              const active = session.id === activeSessionId;
              const recipeCount = session.sessionRecipes?.length ?? 0;
              return (
                <li key={session.id}>
                  <article
                    className={`destination-page__card${
                      active ? " destination-page__card--active" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="destination-page__card-main"
                      onClick={() => {
                        setActiveSession(session.id);
                        onOpenSession?.(session.id);
                      }}
                    >
                      <span className="destination-page__card-title">{session.name}</span>
                      <span
                        className="destination-page__card-meta"
                        style={{ color: cv.text.muted }}
                      >
                        {session.batches.length} mix
                        {session.batches.length === 1 ? "" : "es"}
                        {" · "}
                        {recipeCount} session recipe{recipeCount === 1 ? "" : "s"}
                        {" · "}
                        {session.status === "saved" ? "Saved" : "Draft"}
                        {" · "}
                        {formatUpdatedAt(session.updatedAt)}
                      </span>
                      <span
                        className="destination-page__card-stages"
                        style={{ color: cv.text.dimmed }}
                      >
                        {SESSION_STAGE_ORDER.map((id) => SESSION_STAGE_LABELS[id]).join(
                          " → ",
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="destination-page__card-delete"
                      aria-label={`Delete ${session.name}`}
                      onClick={() => deleteSession(session.id)}
                    >
                      Delete
                    </button>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {activeSession && sessionRecipes.length > 0 ? (
          <section className="create-recipe__session-recipes">
            <h3
              className="create-recipe__section-title"
              style={{ color: cv.text.primary }}
            >
              Session recipes — {activeSession.name}
            </h3>
            <ul className="destination-page__list">
              {sessionRecipes.map((recipe) => (
                <li key={recipe.id}>
                  <article className="destination-page__card">
                    <div className="destination-page__card-main">
                      <span className="destination-page__card-title">
                        {recipeMenuLabel(recipe)}
                      </span>
                      <span
                        className="destination-page__card-meta"
                        style={{ color: cv.text.muted }}
                      >
                        {formatRecipeFormulaSummary(recipe)}
                      </span>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </DestinationPageChrome>
  );
}
