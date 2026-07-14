import { useEffect, useState } from "react";
import type { BlendingRecipe } from "../../domain/recipe/types";
import type { BucketSelection } from "../../domain/bucket/types";
import type { SandType } from "../../domain/mix/volume";
import { SavedIcon, CloseIcon } from "../shared/ActionIcons";
import { MixerInputDeck } from "../mixer/MixerInputDeck";
import { SHEET_SUBTITLE, SHEET_TITLE, SHEET_COVER_HEADER_STYLE } from "./sheetChrome";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { cv } from "../../ui/tokens";

/** Match LoadSavedMixesSheet / SaveMixNameSheet chrome. */
const SHEET_PAD_X = 20;
const SECTION_GAP = 20;

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

/** Full-height sheet below the main header — same footprint as load/save sheets. */
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

  const handleApply = () => {
    onApply(draftValues);
    onOpenChange(false);
  };

  return (
    <AppFrameCoverSheet
      open={open}
      zIndex={35}
      ariaLabelledBy="mixer-input-sheet-title"
    >
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_HEADER_STYLE}
      >
        <h2 id="mixer-input-sheet-title" style={SHEET_TITLE}>
          {title}
        </h2>
        {subtitle ? (
          <p style={{ ...SHEET_SUBTITLE, maxWidth: 280, textAlign: "center" }}>
            {subtitle}
          </p>
        ) : null}
      </header>

      <div
        className="flex-1 min-h-0 flex flex-col"
        style={{ paddingLeft: SHEET_PAD_X, paddingRight: SHEET_PAD_X }}
      >
        <div className="flex-1 min-h-0" aria-hidden />

        <div className="shrink-0" style={{ paddingBottom: 12 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: SECTION_GAP,
            }}
          >
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
          </div>
        </div>
      </div>

      <SheetFooter
        buttons={[
          {
            key: "close",
            label: "Close",
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
          },
          {
            key: "apply",
            label: "Apply",
            icon: <SavedIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: handleApply,
            variant: "primary",
            accentColor: cv.extraBatch.label,
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}
