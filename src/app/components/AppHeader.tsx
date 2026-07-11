import React, { type ReactNode } from "react";
import { LongPressButton } from "./LongPressButton";

/** Design-canvas height of the app header row (`pt-9` + 44px bar + `pb-3` + divider). */
export const APP_HEADER_HEIGHT = 36 + 44 + 12 + 1;

const HEADER_BG = "#0a0a14";
const HEADER_DIVIDER = "1px solid rgba(255,255,255,0.08)";

const ROUND_NAV_BTN_CLASS = "shrink-0";
/** Half of 40×40 — visually round; avoids 9999px radius breaking beam underlap math. */
const ROUND_NAV_BTN_STYLE = { width: 40, height: 40, minHeight: 0, borderRadius: 20 };

interface AppHeaderProps {
  title?: string;
  isLocked?: boolean;
  onBack?: () => void;
  onForward?: () => void;
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
      className="flex items-center justify-center rounded-full transition-colors duration-150 shrink-0"
      style={{
        width: 40,
        height: 40,
        background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
        border: active ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(255,255,255,0.07)",
        color: active ? "#c0c0e0" : "#8888a8",
        opacity: disabled ? 0.35 : 1,
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
}: AppHeaderProps) {
  return (
    <div
      className="relative shrink-0 px-3 pt-9 pb-3"
      style={{ background: HEADER_BG, borderBottom: HEADER_DIVIDER }}
    >
      <div className="flex items-center gap-2.5" style={{ minHeight: 44 }}>
        <LongPressButton
          label="Back"
          confirmAction="GO BACK"
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

        <h1
          className="flex-1 min-w-0 truncate text-center pointer-events-none"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 17,
            fontWeight: 600,
            color: "#c0c0e0",
            letterSpacing: "0.06em",
            lineHeight: 1,
          }}
        >
          {title}
        </h1>

        <HeaderIconButton label="Settings" disabled>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </HeaderIconButton>
        <HeaderIconButton label="Notifications" disabled>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </HeaderIconButton>
        <LongPressButton
          label="Forward"
          confirmAction="GO FORWARD"
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
    </div>
  );
}
