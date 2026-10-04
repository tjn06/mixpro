/**
 * Keys for optional UI helper / coach animations.
 * Add new entries here as more helpers ship; Settings lists them all.
 */
export type HelperAnimationId = "outlineEdit";

export type HelperAnimationFlags = Record<HelperAnimationId, boolean>;

export const DEFAULT_HELPER_ANIMATIONS: HelperAnimationFlags = {
  outlineEdit: true,
};

export const HELPER_ANIMATION_IDS: readonly HelperAnimationId[] = [
  "outlineEdit",
] as const;

export function normalizeHelperAnimations(
  raw: unknown,
): HelperAnimationFlags {
  const base = { ...DEFAULT_HELPER_ANIMATIONS };
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  for (const id of HELPER_ANIMATION_IDS) {
    if (typeof obj[id] === "boolean") base[id] = obj[id];
  }
  return base;
}
