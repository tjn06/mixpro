import type { AppLanguage } from "../../i18n/language";
import {
  displayLabel,
  localizedLabel,
  type ItemLabel,
} from "../../i18n/localizedLabel";

/** Part ratio among binder ingredients (e.g. A:2, B:1). */
export interface PartRatio {
  id: string;
  parts: number;
  /** Human-readable name shown under the part id (e.g. Resin, Hardener). */
  label?: string;
}

/** Percent of (A + B) for an additive (e.g. SAND:555 → 5.55× binder). */
export interface PercentOfBinder {
  id: string;
  percent: number;
  /** Human-readable name (e.g. Filler, Thickener). */
  label?: string;
}

/** Locked blending recipe — passed from parent; not editable in the mixer view. */
export interface BlendingRecipe {
  id: string;
  /** Presets: LocalizedLabel; user recipes: free-text string. */
  name?: ItemLabel;
  /** Second line under recipe name in the meta card. */
  nameSubline?: ItemLabel;
  /**
   * Optional card blurb.
   * Presets: LocalizedLabel (`{ en, sv }`) — missing side falls back to the other.
   * User recipes: free-text string (stored as typed).
   */
  description?: ItemLabel;
  /** Binder (A + B) reference in grams for initial mix and REC. BATCH reset. */
  initialBinderSum?: number;
  binderParts: PartRatio[];
  binderPercents: PercentOfBinder[];
}

const EPOXY_SUBLINE = localizedLabel("Epoxy", "Epoxi");

export const DEFAULT_RECIPE: BlendingRecipe = {
  id: "default",
  name: localizedLabel("Standard", "Standard"),
  nameSubline: EPOXY_SUBLINE,
  description: localizedLabel(
    "General epoxy with sand filler for everyday repairs.",
    "Allround-epoxi med sandfyllnad för vardagliga lagningar.",
  ),
  initialBinderSum: 2250,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [
    { id: "SAND", percent: 1600 / 3, label: "Filler" },
  ],
};

/** Same as Standard Lagning but SAND 10 kg (not 12 kg) at 2250 g binder. */
export const STANDARD_BLOT_RECIPE: BlendingRecipe = {
  id: "standard-blot",
  name: localizedLabel("Standard Wet", "Standard Blöt"),
  nameSubline: EPOXY_SUBLINE,
  description: localizedLabel(
    "Standard mix tuned for wetter, blöt applications.",
    "Standardblandning anpassad för blötare applikationer.",
  ),
  initialBinderSum: 2250,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [{ id: "SAND", percent: 4000 / 9, label: "Filler" }],
};

/** A 1.5 kg · B 0.75 kg (2:1) · SAND 10 kg · TIX 100 g at 2250 g binder (A + B). */
export const FAS_SOCKEL_RECIPE: BlendingRecipe = {
  id: "fas-sockel",
  name: localizedLabel("Chamfer/Baseboard", "Fas/Sockel"),
  nameSubline: EPOXY_SUBLINE,
  description: localizedLabel(
    "Facade and sockel blend with sand and thickener.",
    "Fas- och sockelblandning med sand och förtjockare.",
  ),
  initialBinderSum: 2250,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [
    { id: "SAND", percent: 4000 / 9, label: "Filler" },
    { id: "TIX", percent: 40 / 9, label: "Thickener" },
  ],
};

/** A 1 kg · B 0.5 kg (2:1) at 1500 g binder — no fillers. */
export const PRIMER_RECIPE: BlendingRecipe = {
  id: "primer",
  name: localizedLabel("Primer", "Primer"),
  nameSubline: EPOXY_SUBLINE,
  description: localizedLabel(
    "Thin primer coat — binder only, no fillers.",
    "Tunn primer — endast bindemedel, ingen fyllnad.",
  ),
  initialBinderSum: 1500,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [],
};

/** A 1 kg · B 0.5 kg (2:1) at 1500 g binder — no fillers. */
export const LACK_RECIPE: BlendingRecipe = {
  id: "lack",
  name: localizedLabel("Lacquer", "Lack"),
  nameSubline: EPOXY_SUBLINE,
  description: localizedLabel(
    "Topcoat finish — binder only, no fillers.",
    "Lack/topplack — endast bindemedel, ingen fyllnad.",
  ),
  initialBinderSum: 1500,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [],
};

/** A 0.5 kg · B 0.25 kg (2:1) · TIX 50 g at 750 g binder (A + B). */
export const TIXBLANDNING_RECIPE: BlendingRecipe = {
  id: "tixblandning",
  name: localizedLabel("Thixotropic mix", "Tixblandning"),
  nameSubline: EPOXY_SUBLINE,
  description: localizedLabel(
    "Small batch with thickener for tixotropic mixes.",
    "Liten sats med förtjockare för tixotropa blandningar.",
  ),
  initialBinderSum: 750,
  binderParts: [
    { id: "A", parts: 2, label: "Resin" },
    { id: "B", parts: 1, label: "Hardener" },
  ],
  binderPercents: [{ id: "TIX", percent: 20 / 3, label: "Thickener" }],
};

export const PRESET_RECIPES: BlendingRecipe[] = [
  DEFAULT_RECIPE,
  STANDARD_BLOT_RECIPE,
  FAS_SOCKEL_RECIPE,
  PRIMER_RECIPE,
  LACK_RECIPE,
  TIXBLANDNING_RECIPE,
];

export function recipeMenuLabel(
  recipe: BlendingRecipe,
  language?: AppLanguage,
): string {
  const name = displayLabel(recipe.name, language).trim() || recipe.id;
  const sub = displayLabel(recipe.nameSubline, language).trim();
  return sub ? `${name} — ${sub}` : name;
}
