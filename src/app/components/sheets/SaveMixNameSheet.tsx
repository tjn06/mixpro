import { useEffect, useState } from "react";
import { APP_HEADER_HEIGHT } from "../shared/AppHeader";
import { SaveIcon, RenameIcon, CloseIcon } from "../shared/ActionIcons";
import { savedMixDisplayName } from "../../saved-mixes/display";
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
const SHEET_MARGIN_X = 16;
const SHEET_MARGIN_TOP = 6;
const SHEET_MARGIN_BOTTOM = 16;
const SHEET_RADIUS = 28;
const SHEET_PAD_X = 20;
const INPUT_H = 40;
/** Apple-ish rhythm: 20pt section gaps, 8pt label-to-control. */
const CONTENT_TOP = 20;
const SECTION_GAP = 20;
const LABEL_GAP = 8;

type SaveMixNameSheetProps =
  | {
      mode: "save";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      recipeName: string;
      onConfirm: (metaName?: string) => void;
      mix?: never;
    }
  | {
      mode: "rename";
      open: boolean;
      onOpenChange: (open: boolean) => void;
      mix: SavedMixSnapshot;
      onConfirm: (metaName?: string) => void;
      recipeName?: never;
    };

export function SaveMixNameSheet(props: SaveMixNameSheetProps) {
  const { open, onOpenChange, onConfirm, mode } = props;
  const recipeName = mode === "save" ? props.recipeName : props.mix.recipeName;
  const initialName =
    mode === "save" ? recipeName : savedMixDisplayName(props.mix);

  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  if (!open) return null;

  const title = mode === "save" ? "Save mix" : "Rename mix";
  const subtitle =
    mode === "save"
      ? "Optional label — recipe name is kept either way"
      : "Clear custom label to show the recipe name again";
  const confirmLabel = mode === "save" ? "Save mix" : "Rename";

  const handleConfirm = () => {
    onConfirm(name);
    onOpenChange(false);
  };

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
          marginBottom: SHEET_MARGIN_BOTTOM,
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
        </header>

        <div
          className="flex-1 min-h-0 flex flex-col"
          style={{ paddingLeft: SHEET_PAD_X, paddingRight: SHEET_PAD_X }}
        >
          {/* Recipe stays higher (near the header). */}
          <div
            className="shrink-0"
            style={{ paddingTop: CONTENT_TOP }}
          >
            <div style={{ maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
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
          </div>

          <div className="flex-1 min-h-0" aria-hidden />

          {/* Editable content + action pinned to the bottom (above close). */}
          <div className="shrink-0" style={{ paddingBottom: 12 }}>
            <div
              style={{
                maxWidth: 360,
                marginLeft: "auto",
                marginRight: "auto",
                display: "flex",
                flexDirection: "column",
                gap: SECTION_GAP,
              }}
            >
              <div>
                <label
                  htmlFor="save-mix-name-input"
                  style={{
                    ...SHEET_FIELD_LABEL,
                    marginBottom: LABEL_GAP,
                    textAlign: "center",
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
                  className={SHEET_FIELD_INPUT_CLASS}
                  style={sheetFieldInputStyle({ height: INPUT_H, textAlign: "center" })}
                />
              </div>
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
              key: "confirm",
              label: confirmLabel,
              icon:
                mode === "save" ? (
                  <SaveIcon size={SHEET_FOOTER_ICON_SIZE} />
                ) : (
                  <RenameIcon size={SHEET_FOOTER_ICON_SIZE} />
                ),
              onClick: handleConfirm,
              variant: "primary",
            },
          ]}
        />
      </div>
    </div>
  );
}
