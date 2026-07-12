import { useEffect, useState } from "react";
import type { BlendingRecipe } from "../../domain/recipe/types";
import type { BucketSelection } from "../../domain/bucket/types";
import type { SandType } from "../../domain/mix/volume";
import { MixerInputDeck } from "../mixer/MixerInputDeck";
import { theme } from "../../../theme";

const { colors: c, borders: b, surfaces: s } = theme;

const SHEET_MARGIN_X = 16;
const SHEET_MARGIN_BOTTOM = 16;
const SHEET_RADIUS = 28;
const SHEET_PAD_X = 20;
const SHEET_PAD_Y = 20;
const DONE_H = 44;

export interface MixerInputSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  recipe: BlendingRecipe;
  values: number[];
  entityIndexes: number[];
  bucketSelection: BucketSelection;
  sandType: SandType;
  onApply: (values: number[]) => void;
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/** Bottom overlay with stripped mixer deck — slides up over current screen. */
export function MixerInputSheet({
  open,
  onOpenChange,
  title = "Extra batch",
  subtitle = "One custom batch — added on top of your batches",
  recipe,
  values,
  entityIndexes,
  bucketSelection,
  sandType,
  onApply,
}: MixerInputSheetProps) {
  const [draftValues, setDraftValues] = useState(values);
  const [active, setActive] = useState(() => entityIndexes[0] ?? 1);

  useEffect(() => {
    if (!open) return;
    setDraftValues([...values]);
    setActive(entityIndexes[0] ?? 1);
  }, [open, values, entityIndexes]);

  if (!open) return null;

  const handleApply = () => {
    onApply(draftValues);
    onOpenChange(false);
  };

  return (
    <div
      className="absolute inset-0 pointer-events-auto"
      style={{ zIndex: 35 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mixer-input-sheet-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="mixer-input-sheet-dim absolute inset-0 border-0 p-0 cursor-default"
        onClick={() => onOpenChange(false)}
        style={{ backgroundColor: s.outsideDimMedium }}
      />

      <div
        className="mixer-input-sheet-panel absolute flex flex-col min-w-0 overflow-hidden"
        style={{
          left: SHEET_MARGIN_X,
          right: SHEET_MARGIN_X,
          bottom: SHEET_MARGIN_BOTTOM,
          borderRadius: SHEET_RADIUS,
          border: b.panel,
          boxShadow: s.shadowMixerInputSheet,
          background: s.sheetPanel,
          padding: `${SHEET_PAD_Y}px ${SHEET_PAD_X}px`,
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <h2
              id="mixer-input-sheet-title"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 22,
                fontWeight: 600,
                color: c.title,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              {title}
            </h2>
            {subtitle ? (
              <p
                style={{
                  fontSize: 12,
                  color: c.muted,
                  letterSpacing: "0.04em",
                  lineHeight: 1.35,
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="shrink-0 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
            style={{
              width: 36,
              height: 36,
              background: s.mixerInputSecondaryBg,
              color: c.secondaryMuted,
              border: b.inputSubtle,
            }}
          >
            <CloseIcon />
          </button>
        </div>

        <MixerInputDeck
          recipe={recipe}
          values={draftValues}
          entityIndexes={entityIndexes}
          active={active}
          onActiveChange={setActive}
          onValuesChange={setDraftValues}
          bucketSelection={bucketSelection}
          sandType={sandType}
        />

        <button
          type="button"
          onClick={handleApply}
          className="w-full rounded-xl transition-all duration-200 active:scale-[0.98]"
          style={{
            height: DONE_H,
            background: s.mixerInputPrimaryBg,
            border: b.inputActive,
            color: c.title,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.08em",
            boxShadow: s.insetHighlightSubtle,
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
