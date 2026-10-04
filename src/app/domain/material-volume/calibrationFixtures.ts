/**
 * Manufacturer-derived calibration fixtures — reference only.
 * Inform packing-curve shape; do NOT branch production logic by manufacturer.
 *
 * Densities are finished mortar kg/L at the stated sand:epoxy mass ratio R.
 */

export type CalibrationFixture = {
  source: string;
  r: number;
  mixedDensityKgPerL: number;
  notes?: string;
};

export const MANUFACTURER_CALIBRATION_FIXTURES: readonly CalibrationFixture[] = [
  { source: "Sika", r: 0.35, mixedDensityKgPerL: 1.71 },
  { source: "Sika", r: 0.5, mixedDensityKgPerL: 1.7 },
  { source: "Sika", r: 1, mixedDensityKgPerL: 1.9 },
  { source: "Sika", r: 5, mixedDensityKgPerL: 1.96 },
  { source: "Sika", r: 8, mixedDensityKgPerL: 2.2 },
  { source: "Sika", r: 10, mixedDensityKgPerL: 2.2, notes: "Sikafloor-91-like" },
  { source: "Sto", r: 1, mixedDensityKgPerL: 1.5 },
  { source: "Sto", r: 1.5, mixedDensityKgPerL: 1.7 },
  { source: "Sto", r: 2.5, mixedDensityKgPerL: 1.8 },
  { source: "Sto", r: 3, mixedDensityKgPerL: 1.92 },
  { source: "Sto", r: 8, mixedDensityKgPerL: 2.0 },
  { source: "Botament E120", r: 3, mixedDensityKgPerL: 1.87 },
  { source: "Botament E120", r: 4, mixedDensityKgPerL: 2.0 },
  { source: "Botament E120", r: 7, mixedDensityKgPerL: 2.17 },
  { source: "Botament E120", r: 10, mixedDensityKgPerL: 2.2 },
  { source: "Botament E120", r: 15, mixedDensityKgPerL: 2.24 },
  { source: "Hahne", r: 4, mixedDensityKgPerL: 2.0 },
  { source: "Hahne", r: 5, mixedDensityKgPerL: 1.9 },
  { source: "Hahne", r: 8, mixedDensityKgPerL: 2.12 },
  { source: "Hahne", r: 13, mixedDensityKgPerL: 2.23 },
  { source: "Hahne", r: 21, mixedDensityKgPerL: 1.97, notes: "open aggregate density drop" },
  { source: "Remmers", r: 10, mixedDensityKgPerL: 2.2 },
  { source: "Mapei", r: 8.73, mixedDensityKgPerL: 2.0 },
  { source: "Mapei", r: 6.94, mixedDensityKgPerL: 2.2 },
  { source: "KLB", r: 8, mixedDensityKgPerL: 2.03 },
  { source: "KLB", r: 10, mixedDensityKgPerL: 2.02 },
  { source: "KLB", r: 12, mixedDensityKgPerL: 2.17 },
];
