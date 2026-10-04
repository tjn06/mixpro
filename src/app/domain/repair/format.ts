/**
 * Display formatting for Repair volumes / dimensions.
 * Avoid false precision.
 */

export function formatRepairLiters(liters: number): string {
  if (!Number.isFinite(liters)) return "—";
  const abs = Math.abs(liters);
  if (abs >= 100) return `${Math.round(liters)} L`;
  if (abs >= 10) return `${(Math.round(liters * 10) / 10).toFixed(1)} L`;
  return `${(Math.round(liters * 10) / 10).toFixed(1)} L`;
}

/** Primary mm; optional meters hint for large lengths. */
export function formatRepairMm(mm: number): string {
  if (!Number.isFinite(mm)) return "—";
  const rounded = Math.round(mm);
  return `${rounded} mm`;
}

/** Plan area for figure labels — prefers m², falls back to cm² for tiny patches. */
export function formatRepairAreaMm2(mm2: number): string {
  if (!Number.isFinite(mm2) || mm2 < 0) return "—";
  const m2 = mm2 / 1_000_000;
  if (m2 >= 1) return `${(Math.round(m2 * 100) / 100).toFixed(2)} m²`;
  if (m2 >= 0.01) return `${(Math.round(m2 * 1000) / 1000).toFixed(3)} m²`;
  const cm2 = mm2 / 100;
  if (cm2 >= 10) return `${Math.round(cm2)} cm²`;
  return `${(Math.round(cm2 * 10) / 10).toFixed(1)} cm²`;
}

/** Compact depth for marker callouts. */
export function formatRepairDepthLabel(mm: number): string {
  if (!Number.isFinite(mm) || mm < 0) return "—";
  return `${Math.round(mm)}`;
}

export function formatRepairMmWithMetersHint(mm: number): string {
  const primary = formatRepairMm(mm);
  if (!Number.isFinite(mm) || mm < 1000) return primary;
  const m = Math.round((mm / 1000) * 100) / 100;
  const mLabel = Number.isInteger(m) ? `${m}` : m.toFixed(2);
  return `${primary} (${mLabel} m)`;
}

/** Meters readout for dimension label row (e.g. "1 m", "1.25 m"). */
export function formatRepairMetersFromMm(mm: number): string {
  if (!Number.isFinite(mm) || mm <= 0) return "";
  const m = Math.round((mm / 1000) * 100) / 100;
  const mLabel = Number.isInteger(m) ? `${m}` : m.toFixed(2);
  return `${mLabel} m`;
}

export function formatWorkMarginPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return "0%";
  return `${Math.round(fraction * 100)}%`;
}

/** Avoid false precision on solved masses. */
export function formatRepairMassGrams(grams: number): string {
  if (!Number.isFinite(grams) || grams < 0) return "—";
  if (grams >= 1000) {
    const kg = grams / 1000;
    if (kg >= 100) return `${Math.round(kg)} kg`;
    if (kg >= 10) return `${(Math.round(kg * 10) / 10).toFixed(1)} kg`;
    return `${(Math.round(kg * 100) / 100).toFixed(2)} kg`;
  }
  return `${Math.round(grams)} g`;
}
