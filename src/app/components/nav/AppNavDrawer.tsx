import type { AppDestination } from "../../navigation/types";
import { APP_DESTINATIONS } from "../../navigation/types";
import { cv } from "../../ui/tokens";

export function AppNavDrawer({
  open,
  active,
  sessionChrome = false,
  onClose,
  onNavigate,
}: {
  open: boolean;
  active: AppDestination;
  /** When true, active item uses session accent rail (matches header bar). */
  sessionChrome?: boolean;
  onClose: () => void;
  onNavigate: (dest: AppDestination) => void;
}) {
  if (!open) return null;

  return (
    <div className="app-nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
      <button
        type="button"
        className="app-nav-drawer__backdrop"
        aria-label="Close menu"
        onClick={onClose}
      />
      <nav
        className={`app-nav-drawer__panel${
          sessionChrome ? " app-nav-drawer__panel--session" : ""
        }`}
        aria-label="Main"
      >
        <div className="app-nav-drawer__brand-row">
          <p className="app-nav-drawer__brand">MIXpro</p>
          {sessionChrome ? (
            <span className="session-mode-chip app-nav-drawer__session-chip">
              <span className="session-mode-chip__dot" aria-hidden />
              Session
            </span>
          ) : null}
        </div>
        <ul className="app-nav-drawer__list">
          {APP_DESTINATIONS.map((item) => {
            const isActive = item.id === active;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`app-nav-drawer__item${
                    isActive ? " app-nav-drawer__item--active" : ""
                  }${
                    isActive && sessionChrome
                      ? " app-nav-drawer__item--session-active"
                      : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="app-nav-drawer__hint" style={{ color: cv.text.muted }}>
          {sessionChrome
            ? "Session open — teal marks where you are."
            : "Calculator stays available without a session."}
        </p>
      </nav>
    </div>
  );
}
