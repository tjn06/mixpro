/**
 * Unit helpers for Repair geometry.
 * Domain truth is millimeters; liters for volume presentation.
 */

import { MM3_PER_LITER } from "./constants";

export function mm3ToLiters(mm3: number): number {
  return mm3 / MM3_PER_LITER;
}

export function litersToMm3(liters: number): number {
  return liters * MM3_PER_LITER;
}

/** Clamp a finite non-negative number; NaN/Inf → 0. */
export function sanitizeNonNegative(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}
