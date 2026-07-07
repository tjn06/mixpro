import React, { type ReactNode } from "react";
import { HEADER_NAV_LONG_PRESS_MS, LongPressProgress, useLongPress } from "./LongPressButton";

interface AppHeaderProps {
  title?: string;
  isLocked?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onSettings?: () => void;
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
      className="flex items-center justify-center rounded-xl transition-colors duration-150"
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

function HeaderLongPressIconButton({
  label,
  children,
  onLongPress,
  confirmAction,
  active = false,
  disabled = false,
  durationMs,
}: {
  label: string;
  children: ReactNode;
  onLongPress: () => void;
  confirmAction: string;
  active?: boolean;
  disabled?: boolean;
  durationMs?: number;
}) {
  const { progress, holding, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
    useLongPress(onLongPress, disabled, {
      confirmAction,
      headerProgress: true,
      durationMs,
    });

  const lit = active || holding;

  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      className="relative flex items-center justify-center rounded-xl overflow-hidden touch-none transition-colors duration-150"
      style={{
        width: 40,
        height: 40,
        background: holding ? "#10101e" : active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
        border: lit
          ? "1px solid rgba(255,255,255,0.28)"
          : "1px solid rgba(255,255,255,0.07)",
        color: lit ? "#c0c0e0" : "#8888a8",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <LongPressProgress progress={progress} inset={4} />
      <span className="relative z-[1] flex items-center justify-center">{children}</span>
    </button>
  );
}

export function AppHeader({
  title = "MIXpro",
  isLocked = false,
  onBack,
  onForward,
  onSettings,
}: AppHeaderProps) {
  return (
    <div className="relative shrink-0 px-3 pt-9 pb-3" style={{ zIndex: 10 }}>
      <div className="flex items-center gap-2.5" style={{ minHeight: 44 }}>
        {onBack ? (
          <HeaderLongPressIconButton
            label="Back"
            onLongPress={onBack}
            confirmAction="GO BACK"
            disabled={isLocked}
            durationMs={HEADER_NAV_LONG_PRESS_MS}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </HeaderLongPressIconButton>
        ) : (
          <HeaderIconButton label="Back" disabled={isLocked}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </HeaderIconButton>
        )}

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

        <HeaderIconButton label="Settings" onClick={onSettings} disabled={isLocked}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </HeaderIconButton>
        <HeaderIconButton label="Notifications" disabled={isLocked}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </HeaderIconButton>
        <HeaderLongPressIconButton
          label="Forward"
          onLongPress={onForward ?? (() => {})}
          confirmAction="GO FORWARD"
          disabled={isLocked}
          durationMs={HEADER_NAV_LONG_PRESS_MS}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </HeaderLongPressIconButton>
      </div>
    </div>
  );
}
