import React, { type ReactNode } from "react";
import { LongPressButton } from "./LongPressButton";
import { componentTokens, cv } from "../../ui/tokens";

const headerBtn = componentTokens.headerIconButton;

/** Sheet / overlay top offset — keep in sync with `--header-h` in app-layout.css. */
export const APP_HEADER_HEIGHT = "var(--header-h)";

const ROUND_NAV_BTN_CLASS = "shrink-0";
/** Half of 40×40 — visually round; avoids 9999px radius breaking beam underlap math. */
const ROUND_NAV_BTN_STYLE = { width: 40, height: 40, minHeight: 0, borderRadius: 20 };

interface AppHeaderProps {
  title?: string;
  isLocked?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onSettingsClick?: () => void;
  settingsActive?: boolean;
  /** Recipe name / selector — rendered in the subheader strip below the header bar. */
  subline?: ReactNode;
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
  onBack,
  onForward,
  onSettingsClick,
  settingsActive = false,
  subline,
}: AppHeaderProps) {
  return (
    <div className="app-header-chrome shrink-0">
      <header className="app-header">
        <div className="app-header__row">
          <LongPressButton
            label="Back"
            confirmAction="GO BACK"
            variant="header"
            onLongPress={onBack ?? (() => {})}
            disabled={isLocked || !onBack}
            className={ROUND_NAV_BTN_CLASS}
            style={ROUND_NAV_BTN_STYLE}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            }
          />

          <HeaderIconButton
            label="Settings"
            onClick={onSettingsClick}
            active={settingsActive}
            disabled={!onSettingsClick}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </HeaderIconButton>

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

          <HeaderIconButton label="Notifications" disabled>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </HeaderIconButton>

          <LongPressButton
            label="Forward"
            confirmAction="GO FORWARD"
            variant="header"
            onLongPress={onForward ?? (() => {})}
            disabled={isLocked || !onForward}
            className={ROUND_NAV_BTN_CLASS}
            style={ROUND_NAV_BTN_STYLE}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            }
          />
        </div>
      </header>
      {subline ? <div className="app-header-sub">{subline}</div> : null}
    </div>
  );
}
