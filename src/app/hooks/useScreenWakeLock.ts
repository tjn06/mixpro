import { useCallback, useEffect, useRef, useState } from "react";

/** Default keep-awake window — then release and let the OS dim again. */
export const SCREEN_WAKE_LOCK_DURATION_MS = 10 * 60 * 1000;

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (
    type: "release",
    listener: () => void,
  ) => void;
  removeEventListener: (
    type: "release",
    listener: () => void,
  ) => void;
};

function wakeLockApi():
  | { request: (type: "screen") => Promise<WakeLockSentinelLike> }
  | null {
  if (typeof navigator === "undefined") return null;
  const api = (
    navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    }
  ).wakeLock;
  return api ?? null;
}

export function isScreenWakeLockSupported(): boolean {
  return wakeLockApi() != null;
}

/**
 * Screen Wake Lock for locked calculator mode.
 * Request once while armed; tick UI separately; re-request on visibility;
 * auto-release after `durationMs` (deadline-based, not only setTimeout).
 */
export function useScreenWakeLock({
  armed,
  durationMs = SCREEN_WAKE_LOCK_DURATION_MS,
  onExpire,
}: {
  /** User wants keep-awake (toggle on). */
  armed: boolean;
  durationMs?: number;
  /** Fired once when the keep-awake window ends (so the toggle can turn off). */
  onExpire?: () => void;
}) {
  const supported = isScreenWakeLockSupported();
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const [held, setHeld] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [failed, setFailed] = useState(false);

  const releaseLock = useCallback(async () => {
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        /* already released */
      }
    }
    setHeld(false);
  }, []);

  const requestLock = useCallback(async () => {
    const api = wakeLockApi();
    if (!api) {
      setFailed(true);
      setHeld(false);
      return false;
    }
    try {
      const sentinel = await api.request("screen");
      sentinelRef.current = sentinel;
      setFailed(false);
      setHeld(true);
      sentinel.addEventListener("release", () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
          setHeld(false);
        }
      });
      return true;
    } catch {
      setFailed(true);
      setHeld(false);
      return false;
    }
  }, []);

  // Arm / disarm + deadline.
  useEffect(() => {
    if (!armed) {
      deadlineRef.current = null;
      setRemainingMs(0);
      void releaseLock();
      return;
    }

    deadlineRef.current = Date.now() + durationMs;
    setRemainingMs(durationMs);
    void requestLock();

    return () => {
      void releaseLock();
    };
  }, [armed, durationMs, releaseLock, requestLock]);

  // UI countdown + deadline release (re-check on interval; mobile may pause timers).
  useEffect(() => {
    if (!armed) return;

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline == null) return;
      const left = Math.max(0, deadline - Date.now());
      setRemainingMs(left);
      if (left <= 0) {
        deadlineRef.current = null;
        void releaseLock();
        onExpireRef.current?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [armed, releaseLock]);

  // Re-acquire when tab becomes visible again (OS often drops the lock).
  useEffect(() => {
    if (!armed) return;

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const deadline = deadlineRef.current;
      if (deadline == null || Date.now() >= deadline) return;
      if (sentinelRef.current && !sentinelRef.current.released) return;
      void requestLock();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [armed, requestLock]);

  return {
    supported,
    /** Lock is currently held (may briefly lag after arm). */
    active: armed && held && remainingMs > 0,
    remainingMs: armed ? remainingMs : 0,
    failed,
  };
}

export function formatWakeLockRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
