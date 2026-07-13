import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cv } from "../../ui/tokens";

export const DEFAULT_LONG_PRESS_PROGRESS_COLOR = cv.longPress.progress;

/** Fixed slot under header — always reserved so long-press UI never shifts layout. */
export const HEADER_CONFIRM_SLOT_H = 30;

export type LongPressProgressUpdate = {
  accentColor?: string;
  action?: string;
};

type LongPressProgressContextValue = {
  progress: number;
  color: string;
  action: string;
  reportProgress: (progress: number, update?: LongPressProgressUpdate) => void;
};

const LongPressProgressContext = createContext<LongPressProgressContextValue | null>(null);

export function LongPressProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState(DEFAULT_LONG_PRESS_PROGRESS_COLOR);
  const [action, setAction] = useState("");

  const reportProgress = useCallback((p: number, update?: LongPressProgressUpdate) => {
    setProgress(p);
    if (p > 0) {
      if (update?.accentColor) setColor(update.accentColor);
      if (update?.action) setAction(update.action);
    } else {
      setColor(DEFAULT_LONG_PRESS_PROGRESS_COLOR);
      setAction("");
    }
  }, []);

  const value = useMemo(
    () => ({ progress, color, action, reportProgress }),
    [progress, color, action, reportProgress],
  );

  return (
    <LongPressProgressContext.Provider value={value}>
      {children}
    </LongPressProgressContext.Provider>
  );
}

export function useLongPressProgressReporter() {
  return useContext(LongPressProgressContext)?.reportProgress;
}

export function LongPressHeaderBar() {
  const ctx = useContext(LongPressProgressContext);
  const active = !!ctx && ctx.progress > 0;

  return (
    <div
      className="relative shrink-0 px-3"
      style={{
        zIndex: 10,
        height: HEADER_CONFIRM_SLOT_H,
        paddingBottom: 2,
      }}
      aria-live="polite"
      aria-hidden={!active}
    >
      <div
        style={{
          opacity: active ? 1 : 0,
          transition: "opacity 0.15s ease",
          pointerEvents: "none",
        }}
      >
        <div
          aria-hidden
          style={{
            height: 2,
            borderRadius: 1,
            background: cv.longPress.beamTrack,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${(ctx?.progress ?? 0) * 100}%`,
              height: "100%",
              borderRadius: 1,
              background: ctx?.color ?? DEFAULT_LONG_PRESS_PROGRESS_COLOR,
              boxShadow: active ? `0 0 8px ${ctx?.color ?? DEFAULT_LONG_PRESS_PROGRESS_COLOR}88` : "none",
            }}
          />
        </div>
        <p
          className="uppercase text-center truncate"
          style={{
            fontSize: "var(--text-ui-sm)",
            letterSpacing: "0.08em",
            color: componentTokens.text.secondary,
            marginTop: 7,
            lineHeight: 1.3,
            fontWeight: 500,
          }}
        >
          HOLD TO CONFIRM ·{" "}
          <span style={{ color: ctx?.color ?? DEFAULT_LONG_PRESS_PROGRESS_COLOR, fontWeight: 700 }}>
            {ctx?.action ?? ""}
          </span>
        </p>
      </div>
    </div>
  );
}
