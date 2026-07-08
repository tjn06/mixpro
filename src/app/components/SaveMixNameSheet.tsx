import { useEffect, useState, type CSSProperties } from "react";
import { APP_HEADER_HEIGHT } from "./AppHeader";
import { LongPressButton } from "./LongPressButton";
import { SaveIcon } from "./ActionIcons";
import { savedMixDisplayName } from "../savedMixDisplay";
import type { SavedMixSnapshot } from "../types/savedMix";

const PANEL_BORDER = "1.5px solid rgba(255,255,255,0.14)";
const TITLE_COLOR = "#c0c0e0";
const MUTED = "#8888a8";
const LIST_SIZE = 12;
const OUTSIDE_DIM = "rgba(5, 5, 16, 0.28)";
const INPUT_BG = "rgba(255, 255, 255, 0.05)";
const INPUT_BORDER = "1px solid rgba(255, 255, 255, 0.12)";
const CONFIRM_H = 42;

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

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

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
  const hint =
    mode === "save"
      ? "Optional label — recipe name is kept either way"
      : "Clear custom label to show the recipe name again";

  const handleConfirm = () => {
    onConfirm(name);
    onOpenChange(false);
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: INPUT_BG,
    border: INPUT_BORDER,
    borderRadius: 12,
    padding: "11px 12px",
    color: TITLE_COLOR,
    fontSize: LIST_SIZE + 1,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 500,
    letterSpacing: "0.03em",
    outline: "none",
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
        style={{ backgroundColor: OUTSIDE_DIM }}
      />

      <div
        className="load-sheet-panel relative flex flex-col mx-3 mt-2 mb-4 rounded-2xl overflow-hidden"
        style={{
          border: PANEL_BORDER,
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center rounded-xl shrink-0 transition-colors duration-150"
            style={{
              width: 40,
              height: 40,
              background: INPUT_BG,
              border: INPUT_BORDER,
              color: MUTED,
            }}
          >
            <CloseIcon />
          </button>
          <div className="flex-1 min-w-0">
            <h2
              id="save-mix-name-title"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: LIST_SIZE + 2,
                fontWeight: 600,
                letterSpacing: "0.05em",
                color: TITLE_COLOR,
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
            <p style={{ fontSize: LIST_SIZE, color: MUTED, marginTop: 2 }}>{hint}</p>
          </div>
        </header>

        <div className="px-4 pb-4 flex flex-col gap-3">
          <div>
            <p
              style={{
                fontSize: LIST_SIZE,
                color: MUTED,
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              Recipe
            </p>
            <p
              className="truncate"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: LIST_SIZE + 1,
                fontWeight: 600,
                color: TITLE_COLOR,
              }}
            >
              {recipeName}
            </p>
          </div>

          <div>
            <label
              htmlFor="save-mix-name-input"
              style={{
                display: "block",
                fontSize: LIST_SIZE,
                color: MUTED,
                letterSpacing: "0.05em",
                marginBottom: 6,
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
              style={inputStyle}
            />
          </div>

          <LongPressButton
            label="Save mix"
            confirmAction="SAVE MIX"
            onLongPress={handleConfirm}
            variant="primary"
            icon={<SaveIcon size={16} />}
            className="w-full"
            style={{ height: CONFIRM_H, minHeight: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
