import { useEffect, useState } from "react";
import type { BlendingRecipe } from "../../domain/recipe/types";
import type { BucketSelection } from "../../domain/bucket/types";
import type { SandType } from "../../domain/mix/volume";
import { APP_HEADER_HEIGHT } from "../shared/AppHeader";
import { SavedIcon, CloseIcon } from "../shared/ActionIcons";
import { MixerInputDeck } from "../mixer/MixerInputDeck";
import { SHEET_SUBTITLE, SHEET_TITLE, SHEET_OVERLAY_LIGHT_CLASS, SHEET_PANEL_CLASS } from "./sheetChrome";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { cv } from "../../ui/tokens";

/** Match LoadSavedMixesSheet / SaveMixNameSheet chrome. */
const HEADER_HEIGHT_FRAC = "32%";
const SHEET_MARGIN_X = "var(--app-sheet-margin-x)";
const SHEET_MARGIN_TOP = 6;
const SHEET_RADIUS = 28;
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

/** Full-height sheet below the app header — same footprint as load/save sheets. */
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
      className="absolute inset-x-0 bottom-0 flex flex-col pointer-events-auto"
      style={{ top: APP_HEADER_HEIGHT, zIndex: 35 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mixer-input-sheet-title"
    >
      <button
        type="button"
        aria-label="Close"
        className={`${SHEET_OVERLAY_LIGHT_CLASS} absolute inset-0 border-0 p-0 cursor-default`}
        onClick={() => onOpenChange(false)}
      />

      <div
        className={`${SHEET_PANEL_CLASS} relative flex flex-col min-h-0 flex-1 overflow-hidden`}
        style={{
          marginLeft: SHEET_MARGIN_X,
          marginRight: SHEET_MARGIN_X,
          marginTop: SHEET_MARGIN_TOP,
          marginBottom: "var(--app-sheet-margin-bottom)",
          borderRadius: SHEET_RADIUS,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="shrink-0 flex flex-col items-center justify-end text-center"
          style={{
            height: HEADER_HEIGHT_FRAC,
            minHeight: 108,
            paddingLeft: SHEET_PAD_X,
            paddingRight: SHEET_PAD_X,
            paddingBottom: 10,
          }}
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
              accentColor: cv.extraBatch.accent,
            },
          ]}
        />
      </div>
    </div>
  );
}
