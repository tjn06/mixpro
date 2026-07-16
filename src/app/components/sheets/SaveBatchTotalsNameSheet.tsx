import { useEffect, useMemo, useState } from "react";
import { CloseIcon, SaveIcon } from "../shared/ActionIcons";
import {
  appendRecentSkipped,
  generateMixMetaName,
  validateMetaName,
} from "../../saved-mixes/metaName";
import { createMetaNameRegistryFromBatchTotals } from "../../saved-batch-totals/metaName";
import { useSavedBatchTotalsStore } from "../../saved-batch-totals/store";
import type { SavedBatchTotalsSnapshot } from "../../saved-batch-totals/types";
import type { BatchNameInput } from "../../batch-names";
import {
  SHEET_FIELD_INPUT_CLASS,
  SHEET_FIELD_INPUT_ERROR_CLASS,
  SHEET_FIELD_LABEL_CLASS,
  SHEET_SUBTITLE_CLASS,
  SHEET_TITLE_CLASS,
  SHEET_COVER_FORM_HEADER_STYLE,
  SHEET_COVER_FORM_SPACING,
  sheetFieldInputStyle,
} from "./sheetChrome";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { cv } from "../../ui/tokens";

const SHEET_PAD_X = 20;
const INPUT_H = 40;
const GENERATE_BTN_H = 36;
const FORM = SHEET_COVER_FORM_SPACING;

type SaveBatchTotalsNameSheetProps =
  | {
      mode?: "save";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      recipeName: string;
      batchNameInput: BatchNameInput;
      onConfirm: (metaName?: string) => void;
      entry?: never;
    }
  | {
      mode: "rename";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      entry: SavedBatchTotalsSnapshot;
      batchNameInput: BatchNameInput;
      onConfirm: (metaName?: string) => void;
      recipeName?: never;
    };

export function SaveBatchTotalsNameSheet(props: SaveBatchTotalsNameSheetProps) {
  const { open, onOpenChange, onConfirm, batchNameInput } = props;
  const mode = props.mode ?? "save";
  const recipeName = mode === "rename" ? props.entry.recipeName : props.recipeName;
  const excludeId = mode === "rename" ? props.entry.id : undefined;

  const [name, setName] = useState("");
  const [nameVariation, setNameVariation] = useState(0);
  const [recentSkipped, setRecentSkipped] = useState<string[]>([]);
  const savedEntries = useSavedBatchTotalsStore((s) => s.entries);

  const registry = useMemo(
    () => createMetaNameRegistryFromBatchTotals(savedEntries, excludeId),
    [savedEntries, excludeId],
  );

  const nameError = useMemo(
    () => validateMetaName(name, registry, "saved batch totals"),
    [name, registry],
  );
  const canConfirm = nameError === null;

  const renameInitial = mode === "rename" ? props.entry.metaName?.trim() ?? "" : "";
  const renameEntryId = mode === "rename" ? props.entry.id : "";

  useEffect(() => {
    if (!open) return;
    if (mode === "rename") {
      setName(renameInitial);
    } else {
      setName(generateMixMetaName(batchNameInput, 0, registry));
    }
    setNameVariation(0);
    setRecentSkipped([]);
  }, [open, mode, batchNameInput, registry, renameInitial, renameEntryId]);

  if (!open) return null;

  const labelStyle = {
    margin: 0,
    textAlign: "center" as const,
  };

  const recipeValueStyle = {
    fontFamily: "'Outfit', sans-serif",
    fontSize: "var(--text-recipe-meta-value)",
    fontWeight: 600,
    letterSpacing: "0.04em",
    color: cv.text.primary,
    lineHeight: 1.35,
    margin: `${FORM.labelToControl}px 0 0`,
    textAlign: "center" as const,
  } as const;

  const errorStyle = {
    marginTop: FORM.fieldToMessage,
    fontFamily: "'Outfit', sans-serif",
    fontSize: "var(--text-ui-xs)",
    fontWeight: 500,
    letterSpacing: "0.03em",
    lineHeight: 1.4,
    color: cv.state.error,
    textAlign: "center" as const,
  } as const;

  const handleSave = () => {
    if (!canConfirm) return;
    onConfirm(name.trim() || undefined);
    onOpenChange(false);
  };

  const handleGenerate = () => {
    const nextRecentSkipped = appendRecentSkipped(recentSkipped, name);
    const nextVariation = nameVariation + 1;
    setRecentSkipped(nextRecentSkipped);
    setNameVariation(nextVariation);
    setName(
      generateMixMetaName(batchNameInput, nextVariation, registry, nextRecentSkipped),
    );
  };

  return (
    <AppFrameCoverSheet
      open={open}
      zIndex={41}
      ariaLabelledBy="save-batch-totals-name-title"
    >
      <header
        className="shrink-0 flex flex-col items-center text-center"
        style={SHEET_COVER_FORM_HEADER_STYLE}
      >
        <h2 id="save-batch-totals-name-title" className={SHEET_TITLE_CLASS}>
          {mode === "rename" ? "Rename batch totals" : "Save batch totals"}
        </h2>
        <p
          className={SHEET_SUBTITLE_CLASS}
          style={{ maxWidth: 280, textAlign: "center" }}
        >
          {mode === "rename"
            ? "Clear the field to show Untitled totals"
            : "Optional display name — must not match a recipe or another saved totals"}
        </p>
      </header>

      <div
        className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-none"
        style={{
          paddingLeft: SHEET_PAD_X,
          paddingRight: SHEET_PAD_X,
        }}
      >
        <div
          className="shrink-0 w-full max-w-[360px] mx-auto"
          style={{ paddingTop: FORM.subtitleToSubinfo }}
        >
          <p className={SHEET_FIELD_LABEL_CLASS} style={labelStyle}>
            Recipe
          </p>
          <p className="truncate min-w-0" style={recipeValueStyle}>
            {recipeName}
          </p>
        </div>

        <div
          className="flex-1 min-h-0"
          style={{ minHeight: FORM.thumbZoneMinGap }}
          aria-hidden
        />

        <div
          className="shrink-0 w-full max-w-[360px] mx-auto"
          style={{ paddingBottom: FORM.formBottomInset }}
        >
          <label
            htmlFor="save-batch-totals-name-input"
            className={SHEET_FIELD_LABEL_CLASS}
            style={{ ...labelStyle, display: "block" }}
          >
            Display name
          </label>
          <input
            id="save-batch-totals-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. Site pour"
            aria-invalid={nameError != null}
            aria-describedby={nameError ? "save-batch-totals-name-error" : undefined}
            className={`${SHEET_FIELD_INPUT_CLASS}${nameError ? ` ${SHEET_FIELD_INPUT_ERROR_CLASS}` : ""}`}
            style={{
              ...sheetFieldInputStyle({ height: INPUT_H, textAlign: "center" }),
              marginTop: FORM.labelToControl,
            }}
          />
          <button
            type="button"
            onClick={handleGenerate}
            className="sheet-action-btn w-full rounded-xl transition-all duration-200 active:scale-[0.98]"
            style={{
              marginTop: FORM.controlToAction,
              height: GENERATE_BTN_H,
              fontFamily: "'Outfit', sans-serif",
              fontSize: "var(--text-ui-sm)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Generate name
          </button>
          {nameError ? (
            <p id="save-batch-totals-name-error" role="alert" style={errorStyle}>
              {nameError}
            </p>
          ) : null}
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
            key: "save",
            label: mode === "rename" ? "Save" : "Save",
            icon: <SaveIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: handleSave,
            disabled: !canConfirm,
          },
        ]}
      />
    </AppFrameCoverSheet>
  );
}
