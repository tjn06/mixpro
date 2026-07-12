import { useEffect, useState } from "react";

/** Current time; ticks while active so relative saved labels stay fresh. */
export function useTickingNow(active: boolean, intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);

  return now;
}
