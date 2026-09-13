/**
 * Dense Tools/Consumables chip packing experiment.
 *
 * Restore classic layout:
 * 1. Set `SELECT_CHIPS_DENSE` to `false`, or
 * 2. Delete this file + `.select-view--dense` CSS block + dense wiring in FlexSelectView.
 */
export const SELECT_CHIPS_DENSE = true;

export const DENSE_CHIP_GAP_Y = 14;
export const DENSE_CHIP_GAP_X_MIN = 7;
export const DENSE_CHIP_GAP_X_MAX = 16;

/**
 * Adaptive type: short labels can read slightly larger.
 * Never shrink long labels below the base chip size (14px) — that was too hard to read.
 */
export function denseChipFontSizePx(labelLength: number): number {
  if (labelLength <= 5) return 15;
  return 14;
}

export function denseChipFontStyle(
  label: string,
): { fontSize: number } | undefined {
  if (!SELECT_CHIPS_DENSE) return undefined;
  return { fontSize: denseChipFontSizePx(label.trim().length) };
}

/**
 * After flex-wrap, absorb leftover row width into horizontal gaps
 * (clamped). Vertical gap stays fixed for finger targets.
 */
export function applyDenseSelectRowGaps(
  root: HTMLElement,
  opts?: { minGap?: number; maxGap?: number; rowGap?: number },
): void {
  const minGap = opts?.minGap ?? DENSE_CHIP_GAP_X_MIN;
  const maxGap = opts?.maxGap ?? DENSE_CHIP_GAP_X_MAX;
  const rowGap = opts?.rowGap ?? DENSE_CHIP_GAP_Y;

  const kids = Array.from(root.children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );

  for (const kid of kids) {
    kid.style.marginRight = "";
    kid.style.marginBottom = "";
  }

  root.style.rowGap = `${rowGap}px`;
  root.style.columnGap = `${minGap}px`;

  if (kids.length === 0) return;

  const rows: HTMLElement[][] = [];
  for (const kid of kids) {
    const top = kid.offsetTop;
    const row = rows.find((r) => Math.abs(r[0]!.offsetTop - top) < 3);
    if (row) row.push(kid);
    else rows.push([kid]);
  }

  const styles = getComputedStyle(root);
  const padL = parseFloat(styles.paddingLeft) || 0;
  const padR = parseFloat(styles.paddingRight) || 0;
  const inner = root.clientWidth - padL - padR;

  for (const row of rows) {
    if (row.length < 2) continue;
    let sum = 0;
    for (const kid of row) sum += kid.getBoundingClientRect().width;
    const slots = row.length - 1;
    const leftover = inner - sum - minGap * slots;
    if (leftover <= 0) continue;
    const extra = Math.min(maxGap - minGap, leftover / slots);
    if (extra <= 0.25) continue;
    for (let i = 0; i < row.length - 1; i++) {
      row[i]!.style.marginRight = `${extra}px`;
    }
  }
}

export function clearDenseSelectRowGaps(root: HTMLElement): void {
  root.style.rowGap = "";
  root.style.columnGap = "";
  for (const node of root.children) {
    if (!(node instanceof HTMLElement)) continue;
    node.style.marginRight = "";
    node.style.marginBottom = "";
  }
}
