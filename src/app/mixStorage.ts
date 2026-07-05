export interface BlendingMix {
  id: string;
  savedAt: string;
  values: {
    total: number;
    a: number;
    b: number;
    tix: number;
    sand: number;
  };
}

const STORAGE_KEY = "blending-mixes";

function toMixValues(values: number[]): BlendingMix["values"] {
  return {
    total: values[0],
    a: values[1],
    b: values[2],
    tix: values[3],
    sand: values[4],
  };
}

export function saveBlendingMix(values: number[]): BlendingMix {
  const mix: BlendingMix = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    values: toMixValues(values),
  };
  const existing: BlendingMix[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  existing.push(mix);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return mix;
}

export function getSavedMixes(): BlendingMix[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}
