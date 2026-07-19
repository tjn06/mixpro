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
  /** Tap back instead of long-press (e.g. dismiss Settings overlay). */
  backImmediate?: boolean;
  onForward?: () => void;
  forwardConfirmAction?: string;
  /**
   * Small count badge on the forward control (e.g. active batch-totals plan).
   * Overlays the nav slot; does not affect layout or hit target (`pointer-events: none`).
   */
  forwardBadgeCount?: number | null;
  /** Session Mode chrome — accent bar + session token styling. */
  sessionChrome?: boolean;
  /** When set, title is tappable (e.g. rename session). */
  onTitleClick?: () => void;
  titleClickLabel?: string;
  /** Recipe name / selector — rendered in the subheader strip below the header bar. */
  subline?: ReactNode;
}

/** Nav bar icons — ~22–24px per native iOS chrome, not page-heading scale. */
const NAV_ICON_SIZE = 22;

function MenuIcon() {
  return (
    <svg width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
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
  backImmediate = false,
  onForward,
  forwardConfirmAction = "GO FORWARD",
  forwardBadgeCount = null,
  sessionChrome = false,
  onTitleClick,
  titleClickLabel,
  subline,
}: AppHeaderProps) {
  const showForward = onForward != null && !isLocked;
  const showForwardBadge =
    showForward && forwardBadgeCount != null && forwardBadgeCount > 0;
  const titleStyle = {
    fontFamily: "var(--font-ui, 'Outfit', sans-serif)",
    fontSize: "var(--text-header-title)",
    fontWeight: 600,
    color: sessionChrome ? "var(--session-accent)" : cv.text.primary,
    letterSpacing: "0.04em",
    lineHeight: 1.2,
  } as const;

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
                {backImmediate ? (
                  <HeaderIconButton
                    label={backLabel}
                    onClick={onBack}
                    disabled={isLocked}
                  >
                    <ChevronLeftIcon />
                  </HeaderIconButton>
                ) : (
                  <LongPressButton
                    label={backLabel}
                    confirmAction={backConfirmAction}
                    variant="header"
                    sessionTone={sessionChrome}
                    onLongPress={onBack}
                    disabled={isLocked}
                    className={ROUND_NAV_BTN_CLASS}
                    style={ROUND_NAV_BTN_STYLE}
                    icon={<ChevronLeftIcon />}
                  />
                )}
              </div>
            ) : null}
          </div>

          {onTitleClick && !isLocked ? (
            <button
              type="button"
              className="app-header__title-btn flex-1 min-w-0 truncate text-center px-1"
              style={titleStyle}
              aria-label={titleClickLabel ?? `Rename, ${title}`}
              onClick={onTitleClick}
            >
              {title}
            </button>
          ) : (
            <h1
              className="flex-1 min-w-0 truncate text-center pointer-events-none px-1"
              style={titleStyle}
            >
              {title}
            </h1>
          )}

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
                icon={<ChevronRightIcon />}
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
