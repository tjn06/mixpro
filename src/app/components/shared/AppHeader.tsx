import React, { type ReactNode } from "react";
import { LongPressButton } from "./LongPressButton";
import { componentTokens, cv } from "../../ui/tokens";

const headerBtn = componentTokens.headerIconButton;

/** Sheet / overlay top offset — keep in sync with `--header-h` in app-layout.css. */
export const APP_HEADER_HEIGHT = "var(--header-h)";

const ROUND_NAV_BTN_CLASS = "shrink-0";
/** Half of 40×40 — visually round; matches beam underlap corner math. */
const ROUND_NAV_BTN_STYLE = { width: 40, height: 40, minHeight: 0, borderRadius: 20 };

interface AppHeaderProps {
  title?: string;
  isLocked?: boolean;
  /** Opens application navigation (hamburger). */
  onMenuClick?: () => void;
  onBack?: () => void;
  /** Long-press confirm copy for back (e.g. BACK TO SESSION). */
  backConfirmAction?: string;
  /** Accessible label for back control. */
  backLabel?: string;
  onForward?: () => void;
  forwardConfirmAction?: string;
  /**
   * Small count badge on the forward control (e.g. active batch-totals plan).
   * Overlays the nav slot; does not affect layout or hit target (`pointer-events: none`).
   */
  forwardBadgeCount?: number | null;
  onSettingsClick?: () => void;
  settingsActive?: boolean;
  /** Session Mode chrome — accent bar + session token styling. */
  sessionChrome?: boolean;
  /** Recipe name / selector — rendered in the subheader strip below the header bar. */
  subline?: ReactNode;
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function formatForwardBadge(count: number): string {
  return count > 9 ? "9+" : String(count);
}

function HeaderIconButton({
  label,
  children,
  onClick,
  disabled = false,
  active = false,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onClick}
      className={`header-icon-btn flex items-center justify-center rounded-full transition-colors duration-150 shrink-0${
        active ? " header-icon-btn--active" : ""
      }`}
      style={{
        width: 40,
        height: 40,
        opacity: disabled ? headerBtn.opacityDisabled : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function AppHeader({
  title = "MIXpro",
  isLocked = false,
  onMenuClick,
  onBack,
  backConfirmAction = "GO BACK",
  backLabel = "Back",
  onForward,
  forwardConfirmAction = "GO FORWARD",
  forwardBadgeCount = null,
  onSettingsClick,
  settingsActive = false,
  sessionChrome = false,
  subline,
}: AppHeaderProps) {
  const showForward = onForward != null && !isLocked;
  const showForwardBadge =
    showForward && forwardBadgeCount != null && forwardBadgeCount > 0;
  const showSettings = onSettingsClick != null;

  return (
    <div
      className={`app-header-chrome shrink-0${
        sessionChrome ? " app-header-chrome--session" : ""
      }`}
    >
      <header className="app-header">
        <div className="app-header__row">
          <div className="app-header__leading flex items-center shrink-0" style={{ gap: 4 }}>
            {onMenuClick ? (
              <HeaderIconButton
                label="Menu"
                onClick={onMenuClick}
                disabled={isLocked}
              >
                <MenuIcon />
              </HeaderIconButton>
            ) : null}
            {onBack ? (
              <div className="app-header__nav-slot">
                <LongPressButton
                  label={backLabel}
                  confirmAction={backConfirmAction}
                  variant="header"
                  sessionTone={sessionChrome}
                  onLongPress={onBack}
                  disabled={isLocked}
                  className={ROUND_NAV_BTN_CLASS}
                  style={ROUND_NAV_BTN_STYLE}
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  }
                />
              </div>
            ) : null}
            {showSettings ? (
              <HeaderIconButton
                label="Settings"
                onClick={onSettingsClick}
                active={settingsActive}
                disabled={isLocked}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </HeaderIconButton>
            ) : null}
          </div>

          <h1
            className="flex-1 min-w-0 truncate text-center pointer-events-none px-1"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "var(--text-header-title)",
              fontWeight: 600,
              color: cv.text.primary,
              letterSpacing: "0.06em",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>

          {showForward ? (
            <div className="app-header__nav-slot">
              <LongPressButton
                label="Forward"
                confirmAction={forwardConfirmAction}
                variant="header"
                onLongPress={onForward}
                disabled={isLocked}
                className={ROUND_NAV_BTN_CLASS}
                style={ROUND_NAV_BTN_STYLE}
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                }
              />
              {showForwardBadge ? (
                <span className="app-header__nav-badge" aria-hidden>
                  {formatForwardBadge(forwardBadgeCount!)}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="app-header__nav-slot" aria-hidden />
          )}
        </div>
      </header>
      {subline ? <div className="app-header-sub">{subline}</div> : null}
    </div>
  );
}
