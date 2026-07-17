import { X } from "lucide-react";
import type { AppDestination } from "../../navigation/types";
import { APP_DESTINATIONS } from "../../navigation/types";
import { ColorSchemeSegment } from "../settings/ColorSchemeSegment";

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
          <div className="app-nav-drawer__brand-block min-w-0">
            <p className="app-nav-drawer__brand">MIXpro</p>
            {sessionChrome ? (
              <span className="session-mode-chip app-nav-drawer__session-chip">
                <span className="session-mode-chip__dot" aria-hidden />
                Session
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="app-nav-drawer__close"
            aria-label="Close menu"
            onClick={onClose}
          >
            <X size={22} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="app-nav-drawer__divider" aria-hidden />

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
                    // Settings overlays; shell already closes the drawer in openSettings.
                    if (item.id !== "settings") onClose();
                  }}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="app-nav-drawer__footer">
          <div className="app-nav-drawer__divider" aria-hidden />
          <ColorSchemeSegment />
        </div>
      </nav>
    </div>
  );
}
