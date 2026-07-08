import type { BucketSelection } from "../bucketTypes";
import type { SandType } from "../mixVolume";

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
    tix: number;
    sand: number;
  };
}
