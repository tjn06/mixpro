import type { BucketSelection } from "../domain/bucket/types";
import type { SandType } from "../domain/mix/volume";

/** Persisted snapshot of a saved mix. */
export interface SavedMixSnapshot {
  id: string;
  savedAt: string;
  recipeId: string;
  /** Recipe label at save time — always kept for reference. */
  recipeName: string;
  /** Optional custom list label; shown instead of recipeName when set. */
  metaName?: string;
  bucketSelection: BucketSelection;
  sandType?: SandType;
  values: {
    total: number;
    a: number;
    b: number;
    /** Optional third binder; omitted on older saves. */
    c?: number;
    thickener: number;
    filler: number;
    /** @deprecated Legacy thickener — accepted on load. */
    tix?: number;
    /** @deprecated Legacy filler — accepted on load. */
    sand?: number;
  };
}
