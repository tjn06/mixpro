/** Height captured before keyboard or other transient viewport shrink. */
let lastLayoutHeight = 0;

/** Keyboard shrink threshold — ignore innerHeight drops larger than this while typing. */
const KEYBOARD_SHRINK_PX = 80;

export function isFormFieldFocused(): boolean {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** True when the virtual keyboard is likely open (visual viewport or innerHeight shrink). */
export function isKeyboardLikelyOpen(): boolean {
  const vv = window.visualViewport;
  if (vv) {
    const offsetGap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    if (offsetGap > KEYBOARD_SHRINK_PX) return true;
  }

  if (
    isFormFieldFocused() &&
    lastLayoutHeight > 0 &&
    window.innerHeight < lastLayoutHeight - KEYBOARD_SHRINK_PX
  ) {
    return true;
  }

  return false;
}

function readShellHeight(): number {
  return window.innerHeight;
}

function applyShellHeight(root: HTMLElement, height: number): void {
  lastLayoutHeight = height;
  root.style.setProperty("--mobile-shell-h", `${height}px`);
}

/**
 * Keep shell height stable while the keyboard is open, but still respond to
 * normal resize (desktop, DevTools, split-screen, rotation).
 */
export function applyStableViewportHeight(
  root: HTMLElement = document.documentElement,
): void {
  const sync = (force = false) => {
    if (!force && isKeyboardLikelyOpen()) return;

    const next = readShellHeight();
    if (!force && isFormFieldFocused() && next < lastLayoutHeight - KEYBOARD_SHRINK_PX) {
      return;
    }

    applyShellHeight(root, next);
  };

  applyShellHeight(root, readShellHeight());

  window.addEventListener("resize", () => sync());
  window.visualViewport?.addEventListener("resize", () => sync());
  window.visualViewport?.addEventListener("scroll", () => sync());

  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => sync(true), 150);
  });

  window.addEventListener(
    "focusout",
    () => {
      window.setTimeout(() => sync(true), 100);
    },
    true,
  );
}

export function readStableShellHeightPx(): number | null {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--mobile-shell-h")
    .trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
