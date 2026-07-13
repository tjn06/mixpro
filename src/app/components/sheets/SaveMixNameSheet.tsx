import { useEffect, useMemo, useState } from "react";
import { APP_HEADER_HEIGHT } from "../shared/AppHeader";
import { CloseIcon, SaveIcon, SaveNewIcon } from "../shared/ActionIcons";
import { savedMixDisplayName } from "../../saved-mixes/display";
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
  SHEET_FIELD_LABEL,
  SHEET_SUBTITLE,
  SHEET_TITLE,
  sheetFieldInputStyle,
} from "./sheetChrome";
import { SheetFooter, SHEET_FOOTER_ICON_SIZE } from "./SheetCloseButton";
import { theme } from "../../../theme";

const { colors: c, borders: b, surfaces: s } = theme;

/** Match LoadSavedMixesSheet chrome. */
const HEADER_HEIGHT_FRAC = "32%";
const SHEET_MARGIN_X = "var(--app-sheet-margin-x)";
const SHEET_MARGIN_TOP = 6;
const SHEET_RADIUS = 28;
const SHEET_PAD_X = 20;
const INPUT_H = 40;
const GENERATE_BTN_H = 36;
const SECTION_GAP = 20;
const LABEL_GAP = 8;

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
  const existingDisplayName = existingMix ? savedMixDisplayName(existingMix) : "";
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
        ? `Update “${existingDisplayName}” or save as a new mix`
        : "Custom label only — cannot match a recipe name"
      : "Clear the field to show the recipe name again";

  const handleSave = () => {
    if (!canConfirm) return;
    if (mode === "save") {
      onConfirm(name, hasExistingMix ? "update" : "new");
    } else {
      onConfirm(name);
    }
    onOpenChange(false);
  };

  const handleSaveNew = () => {
    if (!canSaveNew) return;
    onConfirm(name, "new");
    onOpenChange(false);
  };

  const handleGenerate = () => {
    const nextRecentSkipped = appendRecentSkipped(recentSkipped, name);
    const nextVariation = nameVariation + 1;

    setRecentSkipped(nextRecentSkipped);
    setNameVariation(nextVariation);
    setName(
      generateMixMetaName(
        batchNameInput,
        nextVariation,
        registryForEdit,
        nextRecentSkipped,
      ),
    );
  };

  const activeError = nameError ?? (hasExistingMix ? saveNewError : null);

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
            variant: "primary" as const,
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
                  icon: <SaveNewIcon size={SHEET_FOOTER_ICON_SIZE} />,
                  onClick: handleSaveNew,
                  disabled: !canSaveNew,
                },
              ]
            : []),
          {
            key: "save",
            label: "Save mix",
            icon: <SaveIcon size={SHEET_FOOTER_ICON_SIZE} />,
            onClick: handleSave,
            variant: "primary" as const,
            disabled: !canConfirm,
          },
        ];

  return (
    <div
      className="absolute inset-x-0 bottom-0 flex flex-col pointer-events-auto"
      style={{ top: APP_HEADER_HEIGHT, zIndex: 31 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-mix-name-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="load-sheet-dim absolute inset-0 border-0 p-0 cursor-default"
        onClick={() => onOpenChange(false)}
        style={{ backgroundColor: s.outsideDimLight }}
      />

      <div
        className="load-sheet-panel relative flex flex-col min-h-0 flex-1 overflow-hidden"
        style={{
          marginLeft: SHEET_MARGIN_X,
          marginRight: SHEET_MARGIN_X,
          marginTop: SHEET_MARGIN_TOP,
          marginBottom: "var(--app-sheet-margin-bottom)",
          borderRadius: SHEET_RADIUS,
          border: b.panel,
          boxShadow: s.shadowSheet,
          background: s.loadSheetPanel,
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
          <h2 id="save-mix-name-title" style={SHEET_TITLE}>
            {title}
          </h2>
          <p style={{ ...SHEET_SUBTITLE, maxWidth: 280, textAlign: "center" }}>
            {subtitle}
          </p>
          <div
            style={{
              marginTop: SECTION_GAP,
              maxWidth: 360,
              width: "100%",
            }}
          >
            <p
              style={{
                ...SHEET_FIELD_LABEL,
                marginBottom: LABEL_GAP,
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
                color: c.title,
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
            paddingBottom: 12,
          }}
        >
          <div
            className="mt-auto"
            style={{
              maxWidth: 360,
              marginLeft: "auto",
              marginRight: "auto",
              width: "100%",
            }}
          >
            <label
              htmlFor="save-mix-name-input"
              style={{
                ...SHEET_FIELD_LABEL,
                marginBottom: LABEL_GAP,
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
              className={SHEET_FIELD_INPUT_CLASS}
              style={sheetFieldInputStyle({
                height: INPUT_H,
                textAlign: "center",
                border: activeError ? `1px solid ${c.bucketLimit}` : undefined,
              })}
            />
            <button
              type="button"
              onClick={handleGenerate}
              className="w-full rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{
                marginTop: LABEL_GAP,
                height: GENERATE_BTN_H,
                background: c.entitySurfaceIdle,
                border: b.sheetBtn,
                color: c.actionSecondaryLabel,
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
                  marginTop: LABEL_GAP,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "var(--text-ui-xs)",
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                  lineHeight: 1.35,
                  color: c.bucketLimit,
                  textAlign: "center",
                }}
              >
                {activeError}
              </p>
            )}
          </div>
        </div>

        <SheetFooter buttons={footerButtons} />
      </div>
    </div>
  );
}
