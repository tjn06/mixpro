/** Lock shell height to the initial viewport — keyboard open/close must not rescale the app. */
export function applyStableViewportHeight(
  root: HTMLElement = document.documentElement,
): void {
  const sync = () => {
    root.style.setProperty("--mobile-shell-h", `${window.innerHeight}px`);
  };

  sync();
  window.addEventListener("orientationchange", () => {
    window.setTimeout(sync, 150);
  });
}

export function readStableShellHeightPx(): number | null {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--mobile-shell-h")
    .trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function isFormFieldFocused(): boolean {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
