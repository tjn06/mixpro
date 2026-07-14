import { useEffect, useMemo, useState } from "react";
import { CloseIcon, SaveIcon, SaveNewIcon } from "../shared/ActionIcons";
import {
  appendRecentSkipped,
  createMetaNameRegistryFromMixes,
  generateMixMetaName,
  validateMetaName,
} from "../../saved-mixes/metaName";
import type { BatchNameInput } from "../../batch-names";
import type { SavedMixSnapshot } from "../../saved-mixes/types";
import {
  SHEET_FIELD_INPUT_CLASS,
  SHEET_FIELD_INPUT_ERROR_CLASS,
  SHEET_FIELD_LABEL,
  SHEET_SUBTITLE,
  SHEET_TITLE,
  SHEET_COVER_HEADER_STYLE,
  SHEET_COVER_FORM_SPACING,
  sheetFieldInputStyle,
} from "./sheetChrome";
import { AppFrameCoverSheet } from "./AppFrameCoverSheet";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { cv } from "../../ui/tokens";

/** Match LoadSavedMixesSheet chrome. */
const SHEET_PAD_X = 20;
const INPUT_H = 40;
const GENERATE_BTN_H = 36;
const FORM = SHEET_COVER_FORM_SPACING;

export type SaveMixStrategy = "update" | "new";

type SaveMixNameSheetCommonProps = {
  savedMixes?: readonly SavedMixSnapshot[];
  /** Skip this mix's meta name when checking collisions (update/rename). */
  excludeMixId?: string;
};

type SaveMixNameSheetProps = SaveMixNameSheetCommonProps &
  (
  | {
      mode: "save";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      recipeName: string;
      /** When set, user can update this snapshot or save as a new mix. */
      existingMix?: SavedMixSnapshot | null;
      batchNameInput: BatchNameInput;
      onConfirm: (metaName?: string, strategy?: SaveMixStrategy) => void;
      mix?: never;
    }
  | {
      mode: "rename";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      mix: SavedMixSnapshot;
      batchNameInput: BatchNameInput;
      onConfirm: (metaName?: string) => void;
      recipeName?: never;
      existingMix?: never;
    }
  );

function initialDisplayName(
  mode: SaveMixNameSheetProps["mode"],
  existingMix: SavedMixSnapshot | null,
): string {
  if (mode === "rename" && existingMix) {
    return existingMix.metaName?.trim() ?? "";
  }
  if (existingMix?.metaName?.trim()) {
    return existingMix.metaName.trim();
  }
  return "";
}

export function SaveMixNameSheet(props: SaveMixNameSheetProps) {
  const { open, onOpenChange, onConfirm, mode, savedMixes = [], excludeMixId } = props;
  const recipeName = mode === "save" ? props.recipeName : props.mix.recipeName;
  const existingMix = mode === "save" ? props.existingMix ?? null : props.mix;
  const hasExistingMix = mode === "save" && Boolean(existingMix);
  const resolvedExcludeMixId =
    excludeMixId ?? (mode === "rename" ? props.mix.id : existingMix?.id);

  const [name, setName] = useState("");
  const [nameVariation, setNameVariation] = useState(0);
  const [recentSkipped, setRecentSkipped] = useState<string[]>([]);

  const registryForEdit = useMemo(
    () => createMetaNameRegistryFromMixes(savedMixes, resolvedExcludeMixId),
    [savedMixes, resolvedExcludeMixId],
  );
  const registryForNew = useMemo(
    () => createMetaNameRegistryFromMixes(savedMixes),
    [savedMixes],
  );

  const nameError = useMemo(() => validateMetaName(name, registryForEdit), [name, registryForEdit]);
  const saveNewError = useMemo(
    () => (hasExistingMix ? validateMetaName(name, registryForNew) : null),
    [hasExistingMix, name, registryForNew],
  );
  const canConfirm = nameError === null;
  const canSaveNew = saveNewError === null;
  const batchNameInput = props.batchNameInput;

  useEffect(() => {
    if (!open) return;
    const initial = initialDisplayName(mode, existingMix);
    if (initial) {
      setName(initial);
    } else {
      setName(generateMixMetaName(batchNameInput, 0, registryForEdit));
    }
    setNameVariation(0);
    setRecentSkipped([]);
  }, [open, mode, existingMix?.id, batchNameInput, registryForEdit]);

  if (!open) return null;

  const title = mode === "save" ? "Save mix" : "Rename mix";
  const subtitle =
    mode === "save"
      ? hasExistingMix
        ? "Update this mix, or save a new copy."
        : "Optional display name — must not match a recipe or admin label"
      : "Clear the field to show the recipe name again";
  const subtitleStyle = hasExistingMix
    ? { ...SHEET_SUBTITLE, marginTop: 8, maxWidth: 300, textAlign: "center" as const, color: cv.state.warn }
    : { ...SHEET_SUBTITLE, marginTop: 8, maxWidth: 280, textAlign: "center" as const };

  const handleSave = () => {
    if (!canConfirm) return;
    if (mode === "save") {
      onConfirm(name, hasExistingMix ? "update" : "new");
    } else {
      onConfirm(name);
    }
    onOpenChange(false);
  };

  const handleGenerate = (registry = registryForEdit) => {
    const nextRecentSkipped = appendRecentSkipped(recentSkipped, name);
    const nextVariation = nameVariation + 1;

    setRecentSkipped(nextRecentSkipped);
    setNameVariation(nextVariation);
    setName(
      generateMixMetaName(
        batchNameInput,
        nextVariation,
        registry,
        nextRecentSkipped,
      ),
    );
  };

  const handleSaveNew = () => {
    if (!canConfirm) return;
    if (!canSaveNew) {
      handleGenerate(registryForNew);
      return;
    }
    onConfirm(name, "new");
    onOpenChange(false);
  };

  const activeError = nameError;

  const footerButtons =
    mode === "rename"
      ? [
          {
            key: "close",
            label: "Close",
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
          },
          {
            key: "confirm",
            label: "Save mix",
            icon: <SaveIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: handleSave,
            disabled: !canConfirm,
          },
        ]
      : [
          {
            key: "close",
            label: "Close",
            icon: <CloseIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: () => onOpenChange(false),
          },
          ...(hasExistingMix
            ? [
                {
                  key: "save-new",
                  label: "Save as new mix",
                  tooltip: "Save as new",
                  icon: <SaveNewIcon size={SHEET_FOOTER_ICON_SIZE} />,
                  onClick: handleSaveNew,
                  disabled: !canConfirm,
                },
              ]
            : []),
          {
            key: "save",
            label: "Save mix",
            tooltip: hasExistingMix ? "Update" : undefined,
            icon: <SaveIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: handleSave,
            disabled: !canConfirm,
          },
        ];

  return (
    <AppFrameCoverSheet
      open={open}
      zIndex={31}
      ariaLabelledBy="save-mix-name-title"
    >
        <header
          className="shrink-0 flex flex-col items-center text-center"
          style={SHEET_COVER_HEADER_STYLE}
        >
          <h2 id="save-mix-name-title" style={SHEET_TITLE}>
            {title}
          </h2>
          <p style={subtitleStyle}>{subtitle}</p>
          <div
            style={{
              marginTop: FORM.headerToMeta,
              maxWidth: 360,
              width: "100%",
            }}
          >
            <p
              style={{
                ...SHEET_FIELD_LABEL,
                marginBottom: FORM.metaLabelToValue,
                textAlign: "center",
              }}
            >
              Recipe
            </p>
            <p
              className="truncate"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: "var(--text-recipe-meta-value)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: cv.text.primary,
                textAlign: "center",
              }}
            >
              {recipeName}
            </p>
          </div>
        </header>

        <div
          className="flex-1 min-h-0 flex flex-col"
          style={{
            paddingLeft: SHEET_PAD_X,
            paddingRight: SHEET_PAD_X,
          }}
        >
          <div className="flex-1 min-h-0" aria-hidden />

          <div
            className="shrink-0 w-full"
            style={{
              maxWidth: 360,
              marginLeft: "auto",
              marginRight: "auto",
              width: "100%",
              paddingBottom: FORM.formBottomInset,
            }}
          >
            <label
              htmlFor="save-mix-name-input"
              style={{
                ...SHEET_FIELD_LABEL,
                marginBottom: FORM.labelToField,
                textAlign: "center",
                display: "block",
              }}
            >
              Display name
            </label>
            <input
              id="save-mix-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. Morning Little Mix"
              aria-invalid={activeError != null}
              aria-describedby={activeError ? "save-mix-name-error" : undefined}
              className={`${SHEET_FIELD_INPUT_CLASS}${activeError ? ` ${SHEET_FIELD_INPUT_ERROR_CLASS}` : ""}`}
              style={sheetFieldInputStyle({
                height: INPUT_H,
                textAlign: "center",
              })}
            />
            <button
              type="button"
              onClick={() =>
                handleGenerate(hasExistingMix ? registryForNew : registryForEdit)
              }
              className="sheet-action-btn w-full rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{
                marginTop: FORM.fieldToAction,
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
            {activeError && (
              <p
                id="save-mix-name-error"
                role="alert"
                style={{
                  marginTop: FORM.fieldToMessage,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "var(--text-ui-xs)",
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                  lineHeight: 1.35,
                  color: cv.state.error,
                  textAlign: "center",
                }}
              >
                {activeError}
              </p>
            )}
          </div>
        </div>

        <SheetFooter buttons={footerButtons} />
    </AppFrameCoverSheet>
  );
}
